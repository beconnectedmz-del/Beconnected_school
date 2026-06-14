package handlers

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/eduhub/funnel-service/models"
	"github.com/eduhub/funnel-service/repository"
)

type FunnelHandler struct {
	repo     *repository.FunnelRepository
	validate *validator.Validate
}

func NewFunnelHandler(repo *repository.FunnelRepository) *FunnelHandler {
	return &FunnelHandler{repo: repo, validate: validator.New()}
}

// ─── Leads ────────────────────────────────────────────────────────────────────

// POST /leads — endpoint público, captura leads do funil
func (h *FunnelHandler) CreateLead(c *fiber.Ctx) error {
	var req models.CreateLeadRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	lead, err := h.repo.CreateLead(c.Context(), &req, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao registar lead")
	}
	return c.Status(fiber.StatusCreated).JSON(lead)
}

// GET /admin/leads
func (h *FunnelHandler) ListLeads(c *fiber.Ctx) error {
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "20"))
	status := c.Query("status", "")

	result, err := h.repo.ListLeads(c.Context(), status, page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar leads")
	}
	return c.JSON(result)
}

// PUT /admin/leads/:id
func (h *FunnelHandler) UpdateLead(c *fiber.Ctx) error {
	leadID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var req models.UpdateLeadRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if err := h.repo.UpdateLead(c.Context(), leadID, &req); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar lead")
	}
	return c.JSON(fiber.Map{"updated": true})
}

// POST /admin/leads/:id/convert
func (h *FunnelHandler) ConvertLead(c *fiber.Ctx) error {
	leadID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	var body struct {
		UserID string `json:"user_id" validate:"required,uuid"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	userID, _ := uuid.Parse(body.UserID)

	if err := h.repo.ConvertLead(c.Context(), leadID, userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao converter lead")
	}
	return c.JSON(fiber.Map{"converted": true})
}

// GET /admin/leads/stats
func (h *FunnelHandler) LeadStats(c *fiber.Ctx) error {
	from := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	to := c.Query("to", time.Now().Format("2006-01-02"))

	stats, err := h.repo.GetLeadStats(c.Context(), from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao gerar estatísticas")
	}
	return c.JSON(stats)
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

// POST /affiliates/register — utilizador torna-se afiliado
func (h *FunnelHandler) RegisterAffiliate(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req models.RegisterAffiliateRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	affiliate, err := h.repo.RegisterAffiliate(c.Context(), userID, &req)
	if err == repository.ErrDuplicate {
		return fiber.NewError(fiber.StatusConflict, "já é afiliado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao registar afiliado")
	}
	return c.Status(fiber.StatusCreated).JSON(affiliate)
}

// GET /affiliates/dashboard
func (h *FunnelHandler) AffiliateDashboard(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	dashboard, err := h.repo.GetAffiliateDashboard(c.Context(), userID)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "não é afiliado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(dashboard)
}

// GET /affiliates/report
func (h *FunnelHandler) AffiliateReport(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	from := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	to := c.Query("to", time.Now().Format("2006-01-02"))

	report, err := h.repo.GetAffiliateReport(c.Context(), userID, from, to)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "não é afiliado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(report)
}

// POST /affiliates/click — tracking de cliques (endpoint público)
func (h *FunnelHandler) RegisterClick(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return fiber.NewError(fiber.StatusBadRequest, "código de afiliado obrigatório")
	}

	err := h.repo.RegisterClick(
		c.Context(), code, c.IP(),
		c.Get("User-Agent"), c.Get("Referer"), c.OriginalURL(),
	)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "código de afiliado inválido")
	}

	return c.JSON(fiber.Map{"tracked": true})
}

// GET /admin/affiliates
func (h *FunnelHandler) ListAffiliates(c *fiber.Ctx) error {
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "20"))

	result, err := h.repo.ListAllAffiliates(c.Context(), page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(result)
}

// POST /admin/affiliates/:id/approve
func (h *FunnelHandler) ApproveAffiliate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	if err := h.repo.ApproveAffiliate(c.Context(), id); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao aprovar afiliado")
	}
	return c.JSON(fiber.Map{"approved": true})
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

// GET /admin/campaigns
func (h *FunnelHandler) ListCampaigns(c *fiber.Ctx) error {
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "20"))
	status := c.Query("status", "")

	result, err := h.repo.ListCampaigns(c.Context(), status, page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar campanhas")
	}
	return c.JSON(result)
}

// POST /admin/campaigns
func (h *FunnelHandler) CreateCampaign(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req models.CreateCampaignRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	campaign, err := h.repo.CreateCampaign(c.Context(), &req, userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar campanha")
	}
	return c.Status(fiber.StatusCreated).JSON(campaign)
}

// POST /admin/campaigns/:id/launch
func (h *FunnelHandler) LaunchCampaign(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	if err := h.repo.UpdateCampaignStatus(c.Context(), id, "active"); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao lançar campanha")
	}
	return c.JSON(fiber.Map{"launched": true})
}

// POST /admin/campaigns/:id/pause
func (h *FunnelHandler) PauseCampaign(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	if err := h.repo.UpdateCampaignStatus(c.Context(), id, "paused"); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao pausar campanha")
	}
	return c.JSON(fiber.Map{"paused": true})
}

// ─── Segments ─────────────────────────────────────────────────────────────────

// GET /admin/segments
func (h *FunnelHandler) ListSegments(c *fiber.Ctx) error {
	segs, err := h.repo.ListSegments(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar segmentos")
	}
	if segs == nil {
		segs = []models.Segment{}
	}
	return c.JSON(segs)
}

// POST /admin/segments
func (h *FunnelHandler) CreateSegment(c *fiber.Ctx) error {
	var body struct {
		Name        string      `json:"name" validate:"required,min=2,max=255"`
		Description string      `json:"description"`
		Criteria    interface{} `json:"criteria"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	criteriaJSON := "{}"
	if body.Criteria != nil {
		if b, err := marshalJSON(body.Criteria); err == nil {
			criteriaJSON = string(b)
		}
	}

	seg, err := h.repo.CreateSegment(c.Context(), body.Name, body.Description, criteriaJSON)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar segmento")
	}
	return c.Status(fiber.StatusCreated).JSON(seg)
}

// ─── Funnel KPIs ──────────────────────────────────────────────────────────────

// GET /admin/kpis
func (h *FunnelHandler) FunnelKPIs(c *fiber.Ctx) error {
	kpis, err := h.repo.GetFunnelKPIs(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(kpis)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func parseInt(s string, def ...string) int {
	if s == "" && len(def) > 0 {
		s = def[0]
	}
	v, _ := strconv.Atoi(s)
	if v < 1 {
		return 1
	}
	return v
}

func marshalJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
