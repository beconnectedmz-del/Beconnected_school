package handlers

import (
	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/eduhub/user-service/models"
	"github.com/eduhub/user-service/repository"
)

type TeacherHandler struct {
	repo     *repository.TeacherRepository
	rdb      *redis.Client
	validate *validator.Validate
}

func NewTeacherHandler(repo *repository.TeacherRepository, rdb *redis.Client) *TeacherHandler {
	return &TeacherHandler{repo: repo, rdb: rdb, validate: validator.New()}
}

func (h *TeacherHandler) CreateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var req models.CreateTeacherProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	profile, err := h.repo.Create(c.Context(), uid, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar perfil")
	}

	return c.Status(fiber.StatusCreated).JSON(profile)
}

func (h *TeacherHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var req models.UpdateTeacherProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	profile, err := h.repo.Update(c.Context(), uid, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar perfil")
	}

	return c.JSON(profile)
}

func (h *TeacherHandler) SetAvailability(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var slots []models.AvailabilitySlot
	if err := c.BodyParser(&slots); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados de disponibilidade inválidos")
	}

	if err := h.repo.SetAvailability(c.Context(), uid, slots); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao definir disponibilidade")
	}

	return c.JSON(fiber.Map{"message": "disponibilidade actualizada com sucesso"})
}

func (h *TeacherHandler) GetDashboard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	dashboard, err := h.repo.GetDashboard(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter dashboard")
	}

	return c.JSON(dashboard)
}

func (h *TeacherHandler) ListTeachers(c *fiber.Ctx) error {
	filters := repository.TeacherFilters{
		Discipline: c.Query("discipline"),
		Level:      c.Query("level"),
		MinRating:  parseFloat(c.Query("min_rating", "0")),
		MaxPrice:   parseFloat(c.Query("max_price", "0")),
		Page:       parseInt(c.Query("page", "1")),
		PageSize:   parseInt(c.Query("page_size", "20")),
		SortBy:     c.Query("sort_by", "rating"),
	}

	result, err := h.repo.List(c.Context(), filters)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar professores")
	}

	return c.JSON(result)
}

func (h *TeacherHandler) GetTeacherPublic(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	teacher, err := h.repo.GetPublicProfile(c.Context(), id)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "professor não encontrado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}

	return c.JSON(teacher)
}

func (h *TeacherHandler) ValidateTeacher(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var body struct {
		Validated bool   `json:"validated"`
		Reason    string `json:"reason"`
	}
	c.BodyParser(&body)

	if err := h.repo.SetValidation(c.Context(), id, body.Validated); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao validar professor")
	}

	return c.JSON(fiber.Map{"message": "professor actualizado com sucesso"})
}

func (h *TeacherHandler) FeatureTeacher(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var body struct {
		Featured bool `json:"featured"`
	}
	c.BodyParser(&body)

	if err := h.repo.SetFeatured(c.Context(), id, body.Featured); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao destacar professor")
	}

	return c.JSON(fiber.Map{"message": "professor actualizado com sucesso"})
}

func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func parseInt(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}
