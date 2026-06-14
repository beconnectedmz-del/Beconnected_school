package handlers

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/eduhub/payment-service/gateway"
	"github.com/eduhub/payment-service/models"
	"github.com/eduhub/payment-service/repository"
)

type PaymentHandler struct {
	repo     *repository.PaymentRepository
	gw       gateway.Gateway
	validate *validator.Validate
	notifURL string
	httpCli  *http.Client
}

func NewPaymentHandler(repo *repository.PaymentRepository) *PaymentHandler {
	return &PaymentHandler{
		repo:     repo,
		gw:       gateway.New(),
		validate: validator.New(),
		notifURL: os.Getenv("NOTIFICATION_SERVICE_URL"),
		httpCli:  &http.Client{Timeout: 5 * time.Second},
	}
}

func (h *PaymentHandler) Checkout(c *fiber.Ctx) error {
	studentIDStr, _ := c.Locals("user_id").(string)
	studentID, _ := uuid.Parse(studentIDStr)

	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	// Calcular comissões
	commissions := calculateCommissions(req.GrossAmount, req.AffiliateCode != "")

	tx := &models.Transaction{
		StudentID:     studentID,
		GrossAmount:   req.GrossAmount,
		TeacherAmount: commissions.Teacher,
		PlatformAmount: commissions.Platform,
		SellerAmount:  commissions.Affiliate,
		Currency:      "MZN",
		PaymentMethod: req.PaymentMethod,
		PaymentStatus: "pending",
	}

	if req.CourseID != "" {
		id, _ := uuid.Parse(req.CourseID)
		tx.CourseID = &id
	}

	// Registar afiliado se houver código
	if req.AffiliateCode != "" {
		sellerID, err := h.repo.FindAffiliateUserID(c.Context(), req.AffiliateCode)
		if err == nil {
			tx.SellerID = sellerID
		}
	}

	created, err := h.repo.CreateTransaction(c.Context(), tx)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar transacção")
	}

	// ── Chamar gateway de pagamento real ──────────────────────────────────────
	gwResp, err := h.gw.Initiate(c.Context(), gateway.InitiateRequest{
		TransactionRef: created.ID.String(),
		CustomerPhone:  req.CustomerPhone,
		Amount:         req.GrossAmount,
		Currency:       "MZN",
		Description:    "EduHub — pagamento de curso",
	})
	if err != nil {
		// Gateway error: mark transaction as failed but still return info
		h.repo.FailPayment(c.Context(), created.ID)
		return fiber.NewError(fiber.StatusPaymentRequired, "gateway rejeitou o pagamento: "+err.Error())
	}

	// Update transaction with gateway ID
	h.repo.UpdateGatewayTxID(c.Context(), created.ID, gwResp.GatewayTxID) //nolint

	// If gateway returned immediate success (e.g. sandbox), confirm now
	if gwResp.Status == "completed" {
		h.repo.ConfirmPayment(c.Context(), created.ID)
		created.PaymentStatus = "paid"
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"transaction_id":  created.ID,
		"gateway_tx_id":   gwResp.GatewayTxID,
		"status":          gwResp.Status,
		"redirect_url":    gwResp.RedirectURL,
		"gross_amount":    created.GrossAmount,
		"teacher_amount":  created.TeacherAmount,
		"platform_amount": created.PlatformAmount,
		"seller_amount":   created.SellerAmount,
		"commissions": fiber.Map{
			"teacher_pct":   getCommissionRate("TEACHER", 70),
			"platform_pct":  getCommissionRate("PLATFORM", 20),
			"affiliate_pct": getCommissionRate("AFFILIATE", 10),
		},
	})
}

func (h *PaymentHandler) Webhook(c *fiber.Ctx) error {
	// Verificar assinatura do webhook
	sig := c.Get("X-Webhook-Signature")
	body := c.Body()
	secret := os.Getenv("PAYMENT_WEBHOOK_SECRET")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return fiber.NewError(fiber.StatusUnauthorized, "assinatura inválida")
	}

	var payload struct {
		TransactionID string `json:"transaction_id"`
		Status        string `json:"status"`
		GatewayTxID   string `json:"gateway_tx_id"`
	}
	c.BodyParser(&payload)

	id, _ := uuid.Parse(payload.TransactionID)
	if payload.Status == "paid" {
		h.repo.ConfirmPayment(c.Context(), id)
		// Fire-and-forget: notify student of confirmed payment
		go h.sendPaymentConfirmedNotification(context.Background(), id.String())
	} else if payload.Status == "failed" {
		h.repo.FailPayment(c.Context(), id)
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *PaymentHandler) sendPaymentConfirmedNotification(ctx context.Context, txID string) {
	if h.notifURL == "" {
		return
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"type":           "payment_confirmed",
		"transaction_id": txID,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.notifURL+"/notify/internal", bytes.NewReader(payload))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.httpCli.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}


func (h *PaymentHandler) GetHistory(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userIDStr)
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "20"))

	result, err := h.repo.GetStudentTransactions(c.Context(), uid, page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter histórico")
	}

	return c.JSON(result)
}

func (h *PaymentHandler) GetEarnings(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userIDStr)

	from := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	to := c.Query("to", time.Now().Format("2006-01-02"))

	earnings, err := h.repo.GetTeacherEarnings(c.Context(), uid, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter ganhos")
	}

	return c.JSON(earnings)
}

func (h *PaymentHandler) RequestPayout(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userIDStr)

	var req struct {
		Amount       float64 `json:"amount" validate:"required,gt=0"`
		PayoutMethod string  `json:"payout_method" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	payout, err := h.repo.CreatePayout(c.Context(), uid, req.Amount, req.PayoutMethod)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao solicitar pagamento")
	}

	return c.Status(fiber.StatusCreated).JSON(payout)
}

func (h *PaymentHandler) GetMyPayouts(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userIDStr)

	payouts, err := h.repo.GetPayoutsByRecipient(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter payouts")
	}

	return c.JSON(payouts)
}

func (h *PaymentHandler) FinancialReport(c *fiber.Ctx) error {
	from := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	to := c.Query("to", time.Now().Format("2006-01-02"))

	report, err := h.repo.GetFinancialReport(c.Context(), from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar relatório")
	}

	return c.JSON(report)
}

func (h *PaymentHandler) GetPendingPayouts(c *fiber.Ctx) error {
	payouts, err := h.repo.GetPendingPayouts(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(payouts)
}

func (h *PaymentHandler) ApprovePayout(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	approverIDStr, _ := c.Locals("user_id").(string)
	approverID, _ := uuid.Parse(approverIDStr)

	if err := h.repo.ApprovePayout(c.Context(), id, approverID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao aprovar payout")
	}

	return c.JSON(fiber.Map{"message": "payout aprovado com sucesso"})
}

func (h *PaymentHandler) ListAllTransactions(c *fiber.Ctx) error {
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "50"))
	status := c.Query("status", "")

	result, err := h.repo.ListAllTransactions(c.Context(), page, pageSize, status)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}

	return c.JSON(result)
}

// ─── Lógica de comissões ─────────────────────────────────────────────────────

type Commissions struct {
	Teacher  float64
	Platform float64
	Affiliate float64
}

func calculateCommissions(gross float64, hasAffiliate bool) Commissions {
	teacherRate := getCommissionRate("TEACHER", 70) / 100
	affiliateRate := getCommissionRate("AFFILIATE", 10) / 100

	teacher := math.Round(gross*teacherRate*100) / 100

	if hasAffiliate {
		affiliate := math.Round(gross*affiliateRate*100) / 100
		platform := math.Round((gross-teacher-affiliate)*100) / 100
		return Commissions{Teacher: teacher, Platform: platform, Affiliate: affiliate}
	}

	platform := gross - teacher
	return Commissions{Teacher: teacher, Platform: platform, Affiliate: 0}
}

func getCommissionRate(key string, def float64) float64 {
	envKey := key + "_COMMISSION_RATE"
	v := os.Getenv(envKey)
	if v == "" {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return def
	}
	return f
}

func parseInt(s string) int {
	v, _ := strconv.Atoi(s)
	if v < 1 {
		return 1
	}
	return v
}
