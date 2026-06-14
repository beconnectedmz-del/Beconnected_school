package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/eduhub/user-service/models"
	"github.com/eduhub/user-service/repository"
)

type StudentHandler struct {
	repo     *repository.StudentRepository
	rdb      *redis.Client
	validate *validator.Validate
}

func NewStudentHandler(repo *repository.StudentRepository, rdb *redis.Client) *StudentHandler {
	return &StudentHandler{repo: repo, rdb: rdb, validate: validator.New()}
}

func (h *StudentHandler) CreateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var req models.CreateStudentProfileRequest
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

func (h *StudentHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var req models.UpdateStudentProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	profile, err := h.repo.Update(c.Context(), uid, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar perfil")
	}

	return c.JSON(profile)
}

func (h *StudentHandler) SubmitDiagnostic(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var answers map[string]interface{}
	if err := c.BodyParser(&answers); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "respostas inválidas")
	}

	level := calculateProficiencyLevel(answers)

	if err := h.repo.UpdateDiagnostic(c.Context(), uid, answers, level); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao guardar diagnóstico")
	}

	return c.JSON(fiber.Map{
		"proficiency_level": level,
		"message":           "diagnóstico submetido com sucesso",
	})
}

func (h *StudentHandler) GetDashboard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	dashboard, err := h.repo.GetDashboard(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter dashboard")
	}

	return c.JSON(dashboard)
}

func (h *StudentHandler) GetRecommendations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Cache de recomendações
	cacheKey := fmt.Sprintf("recommendations:%s", userID)
	if cached, err := h.rdb.Get(c.Context(), cacheKey).Result(); err == nil {
		var result interface{}
		json.Unmarshal([]byte(cached), &result)
		return c.JSON(result)
	}

	aiURL := fmt.Sprintf("%s/recommendations/%s", os.Getenv("AI_SERVICE_URL"), userID)
	resp, err := http.Get(aiURL)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "serviço de recomendações indisponível")
	}
	defer resp.Body.Close()

	var recommendations interface{}
	json.NewDecoder(resp.Body).Decode(&recommendations)

	// Cache por 10 minutos
	data, _ := json.Marshal(recommendations)
	h.rdb.Set(c.Context(), cacheKey, data, 10*60*1000000000)

	return c.JSON(recommendations)
}

func calculateProficiencyLevel(answers map[string]interface{}) string {
	score := 0
	for _, v := range answers {
		if correct, ok := v.(bool); ok && correct {
			score++
		}
	}
	total := len(answers)
	if total == 0 {
		return "beginner"
	}
	pct := float64(score) / float64(total) * 100
	switch {
	case pct >= 70:
		return "advanced"
	case pct >= 40:
		return "intermediate"
	default:
		return "beginner"
	}
}
