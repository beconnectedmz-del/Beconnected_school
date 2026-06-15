package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/eduhub/auth-service/middleware"
	"github.com/eduhub/auth-service/models"
	"github.com/eduhub/auth-service/notify"
	"github.com/eduhub/auth-service/repository"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
	secRepo  *repository.SecurityRepository
	bf       *middleware.BruteForce
	notif    *notify.Client
	rdb      *redis.Client
	validate *validator.Validate
}

func NewAuthHandler(
	userRepo *repository.UserRepository,
	secRepo *repository.SecurityRepository,
	bf *middleware.BruteForce,
	rdb *redis.Client,
) *AuthHandler {
	return &AuthHandler{
		userRepo: userRepo,
		secRepo:  secRepo,
		bf:       bf,
		notif:    notify.New(),
		rdb:      rdb,
		validate: validator.New(),
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "corpo da requisição inválido")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	cost, _ := getBcryptCost()
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), cost)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao processar password")
	}

	user, err := h.userRepo.Create(c.Context(), req.Email, string(hash), req.Role)
	if err == repository.ErrDuplicate {
		return fiber.NewError(fiber.StatusConflict, "email já registado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar utilizador")
	}

	verifyToken := uuid.New().String()
	h.rdb.Set(c.Context(), fmt.Sprintf("email_verify:%s", verifyToken), user.ID.String(), 24*time.Hour)

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &user.ID,
		EventType: "account_created",
		IPAddress: c.IP(),
		UserAgent: string(c.Request().Header.UserAgent()),
	})

	// Welcome email + verification link (fire-and-forget)
	frontendURL := os.Getenv("FRONTEND_URL")
	go h.notif.Send(context.Background(), "welcome", map[string]interface{}{
		"user": map[string]string{"email": user.Email, "full_name": req.Email},
	})
	go h.notif.Send(context.Background(), "email_verification", map[string]interface{}{
		"user":             map[string]string{"email": user.Email},
		"verification_url": frontendURL + "/verify-email?token=" + verifyToken,
	})

	tokens, err := h.generateTokens(c.Context(), user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar tokens")
	}
	return c.Status(fiber.StatusCreated).JSON(tokens)
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "corpo da requisição inválido")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	ip := c.IP()
	ctx := c.Context()

	// 1. Brute force check (email + IP)
	if locked, msg := h.bf.IsLocked(ctx, req.Email, ip); locked {
		h.secRepo.LogEvent(ctx, models.SecurityEvent{
			EventType: "login_blocked_bf",
			IPAddress: ip,
			Metadata:  map[string]interface{}{"email": req.Email},
		})
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":       msg,
			"code":        "ACCOUNT_LOCKED",
			"retry_after": 60,
		})
	}

	user, err := h.userRepo.FindByEmail(ctx, req.Email)
	if err == repository.ErrNotFound {
		// Record failure without revealing whether email exists
		h.bf.RecordFailure(ctx, req.Email, ip)
		return fiber.NewError(fiber.StatusUnauthorized, "credenciais inválidas")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}

	// 2. Account status check
	if user.Status == models.StatusSuspended || user.Status == models.StatusBanned {
		h.secRepo.LogEvent(ctx, models.SecurityEvent{
			UserID:    &user.ID,
			EventType: "login_blocked_status",
			IPAddress: ip,
		})
		return fiber.NewError(fiber.StatusForbidden, "conta suspensa ou banida")
	}

	// 3. Password verification
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		h.bf.RecordFailure(ctx, req.Email, ip)
		h.secRepo.LogEvent(ctx, models.SecurityEvent{
			UserID:    &user.ID,
			EventType: "login_failed",
			IPAddress: ip,
			UserAgent: string(c.Request().Header.UserAgent()),
		})
		return fiber.NewError(fiber.StatusUnauthorized, "credenciais inválidas")
	}

	// 4. Clear failure counter on success
	h.bf.ClearFailures(ctx, req.Email)

	// 5. Check 2FA — if enabled, return a short-lived temp token instead of JWT
	if twoFA, err := h.secRepo.Get2FA(ctx, user.ID); err == nil && twoFA.Enabled {
		tempToken := uuid.New().String()
		h.rdb.Set(ctx, fmt.Sprintf("2fa_pending:%s", tempToken), user.ID.String(), 5*time.Minute)
		return c.JSON(fiber.Map{
			"2fa_required": true,
			"temp_token":   tempToken,
		})
	}

	// 6. Issue full JWT tokens
	h.userRepo.UpdateLastLogin(ctx, user.ID)
	h.secRepo.LogEvent(ctx, models.SecurityEvent{
		UserID:    &user.ID,
		EventType: "login_success",
		IPAddress: ip,
		UserAgent: string(c.Request().Header.UserAgent()),
	})

	tokens, err := h.generateTokens(ctx, user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar tokens")
	}
	return c.JSON(tokens)
}

func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "corpo inválido")
	}

	userIDStr, err := h.rdb.Get(c.Context(), fmt.Sprintf("refresh:%s", body.RefreshToken)).Result()
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "refresh token inválido ou expirado")
	}

	uid, _ := parseUUID(userIDStr)
	user, err := h.userRepo.FindByID(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "utilizador não encontrado")
	}

	// Rotate: invalidate old refresh token
	h.rdb.Del(c.Context(), fmt.Sprintf("refresh:%s", body.RefreshToken))

	tokens, err := h.generateTokens(c.Context(), user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar tokens")
	}
	return c.JSON(tokens)
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	// Revoke all refresh tokens for this user
	pattern := fmt.Sprintf("refresh:*:%s", userID.String())
	keys, _ := h.rdb.Keys(c.Context(), pattern).Result()
	if len(keys) > 0 {
		h.rdb.Del(c.Context(), keys...)
	}

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &userID,
		EventType: "logout",
		IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{"message": "sessão encerrada com sucesso"})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "utilizador não encontrado")
	}
	return c.JSON(user)
}

func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var body struct {
		Token string `json:"token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "token inválido")
	}

	userIDStr, err := h.rdb.Get(c.Context(), fmt.Sprintf("email_verify:%s", body.Token)).Result()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "token de verificação inválido ou expirado")
	}

	uid, _ := parseUUID(userIDStr)
	h.userRepo.MarkEmailVerified(c.Context(), uid)
	h.rdb.Del(c.Context(), fmt.Sprintf("email_verify:%s", body.Token))

	return c.JSON(fiber.Map{"message": "email verificado com sucesso"})
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var body struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "email inválido")
	}

	// Always respond the same way to prevent email enumeration
	if user, err := h.userRepo.FindByEmail(c.Context(), body.Email); err == nil {
		token := uuid.New().String()
		h.rdb.Set(c.Context(), fmt.Sprintf("reset_password:%s", token), user.ID.String(), time.Hour)
		frontendURL := os.Getenv("FRONTEND_URL")
		go h.notif.Send(context.Background(), "password_reset", map[string]interface{}{
			"user":      map[string]string{"email": user.Email},
			"reset_url": frontendURL + "/reset-password?token=" + token,
			"expires_in": "1 hora",
		})
	}

	return c.JSON(fiber.Map{"message": "se o email existir, receberá instruções de recuperação"})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var body struct {
		Token    string `json:"token" validate:"required"`
		Password string `json:"password" validate:"required,min=8"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	userIDStr, err := h.rdb.Get(c.Context(), fmt.Sprintf("reset_password:%s", body.Token)).Result()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "token inválido ou expirado")
	}

	cost, _ := getBcryptCost()
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), cost)

	uid, _ := parseUUID(userIDStr)
	h.userRepo.UpdatePassword(c.Context(), uid, string(hash))
	h.rdb.Del(c.Context(), fmt.Sprintf("reset_password:%s", body.Token))

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &uid,
		EventType: "password_changed",
		IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{"message": "password alterada com sucesso"})
}

// ─── Token generation ─────────────────────────────────────────────────────────

func (h *AuthHandler) generateTokens(ctx context.Context, user *models.User) (*models.AuthResponse, error) {
	jwtExpiry     := 24 * time.Hour
	refreshExpiry := 30 * 24 * time.Hour
	secret        := []byte(os.Getenv("JWT_SECRET"))

	now := time.Now()
	claims := &middleware.JWTClaims{
		UserID: user.ID.String(),
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(jwtExpiry)),
			Issuer:    "eduhub-auth",
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString(secret)
	if err != nil {
		return nil, err
	}

	refreshToken := uuid.New().String()
	h.rdb.Set(ctx,
		fmt.Sprintf("refresh:%s:%s", refreshToken, user.ID.String()),
		user.ID.String(),
		refreshExpiry,
	)

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(jwtExpiry.Seconds()),
		TokenType:    "Bearer",
		User:         user,
	}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func getBcryptCost() (int, error) {
	cost := bcrypt.DefaultCost
	if v := os.Getenv("BCRYPT_COST"); v != "" {
		fmt.Sscanf(v, "%d", &cost)
	}
	return cost, nil
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	var body struct {
		IDToken string `json:"id_token"`
		Role    string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil || body.IDToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "id_token obrigatório")
	}
	if body.Role == "" {
		body.Role = "student"
	}

	// Verify token with Google
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + body.IDToken)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "não foi possível verificar token Google")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fiber.NewError(fiber.StatusUnauthorized, "token Google inválido ou expirado")
	}

	raw, _ := io.ReadAll(resp.Body)
	var g struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		Aud           string `json:"aud"`
	}
	if err := json.Unmarshal(raw, &g); err != nil || g.Email == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "resposta Google inválida")
	}

	// Validate audience matches our client ID
	expectedAud := os.Getenv("GOOGLE_CLIENT_ID")
	if expectedAud != "" && g.Aud != expectedAud {
		return fiber.NewError(fiber.StatusUnauthorized, "client_id não autorizado")
	}

	role := models.Role(body.Role)
	if role != models.RoleStudent && role != models.RoleTeacher {
		role = models.RoleStudent
	}

	user, err := h.userRepo.FindOrCreateGoogle(c.Context(), g.Email, g.Name, g.Sub, role)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao processar utilizador")
	}

	h.secRepo.LogEvent(c.Context(), models.SecurityEvent{
		UserID:    &user.ID,
		EventType: "google_login",
		IPAddress: c.IP(),
		UserAgent: string(c.Request().Header.UserAgent()),
	})

	tokens, err := h.generateTokens(c.Context(), user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar tokens")
	}
	return c.JSON(tokens)
}
