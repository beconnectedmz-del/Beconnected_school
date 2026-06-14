package handlers

import (
	"crypto/rand"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"

	"github.com/eduhub/auth-service/middleware"
	"github.com/eduhub/auth-service/models"
)

// SetupTOTP generates a TOTP secret and backup codes (not yet enabled until verified).
func (h *AuthHandler) SetupTOTP(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "utilizador não encontrado")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "EduHub",
		AccountName: user.Email,
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar segredo TOTP")
	}

	plain, hashed, err := generateBackupCodes(8)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar códigos de backup")
	}

	if err := h.secRepo.Upsert2FA(c.Context(), userID, key.Secret(), hashed); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao guardar configuração 2FA")
	}

	return c.JSON(models.TOTPSetupResponse{
		QRURL:       key.URL(),
		BackupCodes: plain,
	})
}

// VerifySetupTOTP validates the first TOTP code and enables 2FA.
func (h *AuthHandler) VerifySetupTOTP(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	var req models.TOTPVerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	twoFA, err := h.secRepo.Get2FA(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "configure o 2FA primeiro com POST /auth/2fa/setup")
	}
	if twoFA.Enabled {
		return fiber.NewError(fiber.StatusConflict, "2FA já está activado")
	}

	if !totp.Validate(req.Code, twoFA.Secret) {
		return fiber.NewError(fiber.StatusUnauthorized, "código inválido")
	}

	if err := h.secRepo.Enable2FA(c.Context(), userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao activar 2FA")
	}

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &userID,
		EventType: "2fa_enabled",
		IPAddress: c.IP(),
		UserAgent: string(c.Request().Header.UserAgent()),
	})

	return c.JSON(fiber.Map{"message": "autenticação de dois factores activada com sucesso"})
}

// ValidateTOTPLogin completes login when 2FA is required (uses temp_token from Login).
func (h *AuthHandler) ValidateTOTPLogin(c *fiber.Ctx) error {
	var req models.TOTPLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	ctx := c.Context()
	pendingKey := fmt.Sprintf("2fa_pending:%s", req.TempToken)

	userIDStr, err := h.rdb.Get(ctx, pendingKey).Result()
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "token temporário inválido ou expirado")
	}

	uid, err := parseUUID(userIDStr)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}

	twoFA, err := h.secRepo.Get2FA(ctx, uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao verificar 2FA")
	}

	// Try TOTP first, then backup code
	validTOTP := totp.Validate(req.Code, twoFA.Secret)
	validBackup := false
	if !validTOTP {
		validBackup, twoFA.BackupCodes = consumeBackupCode(req.Code, twoFA.BackupCodes)
		if validBackup {
			_ = h.secRepo.UpdateBackupCodes(ctx, uid, twoFA.BackupCodes)
		}
	}

	if !validTOTP && !validBackup {
		h.secRepo.LogEvent(ctx, models.SecurityEvent{
			UserID:    &uid,
			EventType: "2fa_failed",
			IPAddress: c.IP(),
		})
		return fiber.NewError(fiber.StatusUnauthorized, "código 2FA inválido")
	}

	// Consume the pending token (one-time use)
	h.rdb.Del(ctx, pendingKey)

	user, err := h.userRepo.FindByID(ctx, uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}

	h.userRepo.UpdateLastLogin(ctx, uid)
	h.secRepo.LogEvent(ctx, models.SecurityEvent{
		UserID:    &uid,
		EventType: "login_success_2fa",
		IPAddress: c.IP(),
		UserAgent: string(c.Request().Header.UserAgent()),
	})

	tokens, err := h.generateTokens(ctx, user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar tokens")
	}
	return c.JSON(tokens)
}

// DisableTOTP disables 2FA after confirming password + current TOTP code.
func (h *AuthHandler) DisableTOTP(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	var req models.TOTPDisableRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "utilizador não encontrado")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "password incorrecta")
	}

	twoFA, err := h.secRepo.Get2FA(c.Context(), userID)
	if err != nil || !twoFA.Enabled {
		return fiber.NewError(fiber.StatusBadRequest, "2FA não está activado")
	}

	if !totp.Validate(req.Code, twoFA.Secret) {
		return fiber.NewError(fiber.StatusUnauthorized, "código 2FA inválido")
	}

	if err := h.secRepo.Disable2FA(c.Context(), userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao desactivar 2FA")
	}

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &userID,
		EventType: "2fa_disabled",
		IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{"message": "autenticação de dois factores desactivada"})
}

// RegenerateBackupCodes generates 8 new backup codes, invalidating old ones.
func (h *AuthHandler) RegenerateBackupCodes(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	var req models.TOTPVerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	twoFA, err := h.secRepo.Get2FA(c.Context(), userID)
	if err != nil || !twoFA.Enabled {
		return fiber.NewError(fiber.StatusBadRequest, "2FA não está activado")
	}

	if !totp.Validate(req.Code, twoFA.Secret) {
		return fiber.NewError(fiber.StatusUnauthorized, "código 2FA inválido")
	}

	plain, hashed, err := generateBackupCodes(8)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar códigos")
	}

	if err := h.secRepo.UpdateBackupCodes(c.Context(), userID, hashed); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao guardar códigos")
	}

	return c.JSON(fiber.Map{"backup_codes": plain})
}

// GetTwoFAStatus returns whether 2FA is enabled for the authenticated user.
func (h *AuthHandler) GetTwoFAStatus(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	twoFA, err := h.secRepo.Get2FA(c.Context(), userID)
	if err != nil {
		return c.JSON(models.TwoFAStatus{Enabled: false, Configured: false})
	}

	remaining := 0
	for _, code := range twoFA.BackupCodes {
		if code != "" {
			remaining++
		}
	}

	return c.JSON(models.TwoFAStatus{
		Enabled:          twoFA.Enabled,
		Configured:       true,
		BackupCodesCount: remaining,
		VerifiedAt:       twoFA.VerifiedAt,
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// generateBackupCodes returns (plaintext codes, bcrypt hashes, error).
func generateBackupCodes(n int) ([]string, []string, error) {
	plain := make([]string, n)
	hashed := make([]string, n)
	for i := range plain {
		b := make([]byte, 6)
		if _, err := rand.Read(b); err != nil {
			return nil, nil, err
		}
		code := fmt.Sprintf("%x-%x", b[:3], b[3:])
		plain[i] = code
		h, err := bcrypt.GenerateFromPassword([]byte(code), 10)
		if err != nil {
			return nil, nil, err
		}
		hashed[i] = string(h)
	}
	return plain, hashed, nil
}

// consumeBackupCode checks a code against hashed backup codes.
// Returns (matched, updated codes list with the matched one removed).
func consumeBackupCode(code string, hashes []string) (bool, []string) {
	for i, h := range hashes {
		if bcrypt.CompareHashAndPassword([]byte(h), []byte(code)) == nil {
			return true, append(hashes[:i], hashes[i+1:]...)
		}
	}
	return false, hashes
}
