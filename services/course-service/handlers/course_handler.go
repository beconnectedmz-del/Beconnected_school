package handlers

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/eduhub/course-service/models"
	"github.com/eduhub/course-service/notify"
	"github.com/eduhub/course-service/repository"
)

type CourseHandler struct {
	repo     *repository.CourseRepository
	notif    *notify.Client
	validate *validator.Validate
}

func NewCourseHandler(repo *repository.CourseRepository) *CourseHandler {
	return &CourseHandler{repo: repo, notif: notify.New(), validate: validator.New()}
}

// ─── Courses ──────────────────────────────────────────────────────────────────

func (h *CourseHandler) Create(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "crie primeiro o seu perfil de professor")
	}

	var req models.CreateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	course, err := h.repo.Create(c.Context(), teacherID, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(course)
}

func (h *CourseHandler) Update(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var req models.UpdateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	course, err := h.repo.Update(c.Context(), courseID, teacherID, &req)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "curso não encontrado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar curso")
	}
	return c.JSON(course)
}

func (h *CourseHandler) Publish(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var body struct {
		Published bool `json:"published"`
	}
	c.BodyParser(&body)

	if err := h.repo.Publish(c.Context(), courseID, teacherID, body.Published); err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "curso não encontrado")
	}
	return c.JSON(fiber.Map{"published": body.Published})
}

func (h *CourseHandler) GetByID(c *fiber.Ctx) error {
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	course, err := h.repo.GetByIDFull(c.Context(), courseID)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "curso não encontrado")
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(course)
}

func (h *CourseHandler) List(c *fiber.Ctx) error {
	f := models.CourseFilters{
		DisciplineSlug: c.Query("discipline"),
		Level:          c.Query("level"),
		LessonType:     c.Query("type"),
		MaxPrice:       parseFloat(c.Query("max_price")),
		TeacherID:      c.Query("teacher_id"),
		Search:         c.Query("q"),
		Page:           parseInt(c.Query("page", "1")),
		PageSize:       parseInt(c.Query("page_size", "20")),
		SortBy:         c.Query("sort", "popular"),
	}

	result, err := h.repo.List(c.Context(), f)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar cursos")
	}
	return c.JSON(result)
}

func (h *CourseHandler) AdminList(c *fiber.Ctx) error {
	page     := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "50"))
	result, err := h.repo.ListAdmin(c.Context(), page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar cursos")
	}
	return c.JSON(result)
}

func (h *CourseHandler) ValidateCourse(c *fiber.Ctx) error {
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	var body struct {
		Validated bool   `json:"validated"`
		Reason    string `json:"reason"`
	}
	c.BodyParser(&body)

	if err := h.repo.Validate(c.Context(), courseID, body.Validated); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao validar curso")
	}
	return c.JSON(fiber.Map{"validated": body.Validated})
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

func (h *CourseHandler) CreateLesson(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	// Verificar que o curso pertence ao professor
	course, err := h.repo.GetByID(c.Context(), courseID)
	if err != nil || course.TeacherID != teacherID {
		return fiber.NewError(fiber.StatusForbidden, "não tem permissão para este curso")
	}

	var req models.CreateLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	lesson, err := h.repo.CreateLesson(c.Context(), courseID, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao criar aula")
	}
	return c.Status(fiber.StatusCreated).JSON(lesson)
}

func (h *CourseHandler) GetLessons(c *fiber.Ctx) error {
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	role, _ := c.Locals("user_role").(string)
	userIDStr, _ := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	// Professor do curso pode ver todas as aulas (incluindo drafts)
	isTeacher := false
	if role == "teacher" {
		tid, err := h.repo.GetTeacherProfileID(c.Context(), userID)
		if err == nil {
			course, err := h.repo.GetByID(c.Context(), courseID)
			if err == nil && course.TeacherID == tid {
				isTeacher = true
			}
		}
	}
	if role == "admin" {
		isTeacher = true
	}

	lessons, err := h.repo.GetLessons(c.Context(), courseID, isTeacher)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter aulas")
	}
	return c.JSON(lessons)
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

func (h *CourseHandler) Enroll(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	studentID, err := h.repo.GetStudentProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "crie primeiro o seu perfil de estudante")
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID de curso inválido")
	}

	var body struct {
		PackageType string `json:"package_type"`
	}
	c.BodyParser(&body)

	enrollment, err := h.repo.Enroll(c.Context(), studentID, courseID, body.PackageType)
	if err != nil {
		return fiber.NewError(fiber.StatusConflict, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(enrollment)
}

func (h *CourseHandler) GetCoursePackages(c *fiber.Ctx) error {
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	pkgs, err := h.repo.GetCoursePackages(c.Context(), courseID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	if pkgs == nil {
		pkgs = []models.CoursePackage{}
	}
	return c.JSON(pkgs)
}

func (h *CourseHandler) AdminKPIs(c *fiber.Ctx) error {
	kpis, err := h.repo.GetAdminKPIs(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(kpis)
}

func (h *CourseHandler) MyEnrollments(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	studentID, err := h.repo.GetStudentProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "perfil de estudante não encontrado")
	}

	result, err := h.repo.GetMyEnrollments(c.Context(), studentID, c.Query("status"))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter matrículas")
	}
	return c.JSON(result)
}

func (h *CourseHandler) UpdateProgress(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	studentID, err := h.repo.GetStudentProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "perfil não encontrado")
	}

	courseID, _ := uuid.Parse(c.Params("id"))
	lessonID, _ := uuid.Parse(c.Params("lesson_id"))

	enrollment, err := h.repo.GetEnrollmentByIDs(c.Context(), studentID, courseID)
	if err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusForbidden, "não está matriculado neste curso")
	}

	var body struct {
		WatchedSeconds int  `json:"watched_seconds"`
		Completed      bool `json:"completed"`
	}
	c.BodyParser(&body)

	if err := h.repo.UpdateLessonProgress(c.Context(), enrollment.ID, lessonID, body.WatchedSeconds, body.Completed); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar progresso")
	}
	return c.JSON(fiber.Map{"updated": true})
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

func (h *CourseHandler) ScheduleSession(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	studentID, err := h.repo.GetStudentProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "crie primeiro o seu perfil de estudante")
	}

	var req models.ScheduleSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	session, err := h.repo.ScheduleSession(c.Context(), studentID, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	// Notify student and teacher (fire-and-forget)
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
	go h.notif.Send(context.Background(), "session_scheduled", map[string]interface{}{
		"session": map[string]interface{}{
			"id":           session.ID,
			"discipline":   session.CourseID,
			"scheduled_at": session.ScheduledAt,
			"join_url":     frontendURL + "/session/" + session.RoomID,
		},
		"student": map[string]interface{}{"id": studentID, "email": ""},
		"teacher": map[string]interface{}{"id": req.TeacherID, "name": ""},
	})

	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *CourseHandler) MySessions(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	role, _ := c.Locals("user_role").(string)

	var profileID uuid.UUID
	var err error
	if role == "teacher" {
		profileID, err = h.repo.GetTeacherProfileID(c.Context(), userID)
	} else {
		profileID, err = h.repo.GetStudentProfileID(c.Context(), userID)
	}
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "perfil não encontrado")
	}

	result, err := h.repo.GetMySessions(c.Context(), profileID, role, c.Query("status"))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter sessões")
	}
	return c.JSON(result)
}

func (h *CourseHandler) CancelSession(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	role, _ := c.Locals("user_role").(string)
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var profileID uuid.UUID
	if role == "teacher" {
		profileID, err = h.repo.GetTeacherProfileID(c.Context(), userID)
	} else {
		profileID, err = h.repo.GetStudentProfileID(c.Context(), userID)
	}
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "perfil não encontrado")
	}

	var body struct {
		Reason string `json:"reason"`
	}
	c.BodyParser(&body)

	if err := h.repo.CancelSession(c.Context(), sessionID, profileID, role, body.Reason); err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "sessão não encontrada ou já cancelada")
	}
	return c.JSON(fiber.Map{"cancelled": true})
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

func (h *CourseHandler) CreateFeedback(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	studentID, err := h.repo.GetStudentProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "perfil de estudante não encontrado")
	}

	var req models.CreateFeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	if err := h.validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	feedback, err := h.repo.CreateFeedback(c.Context(), studentID, &req)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao submeter avaliação")
	}
	return c.Status(fiber.StatusCreated).JSON(feedback)
}

func (h *CourseHandler) GetTeacherFeedbacks(c *fiber.Ctx) error {
	teacherID, err := uuid.Parse(c.Params("teacher_id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	page := parseInt(c.Query("page", "1"))
	pageSize := parseInt(c.Query("page_size", "20"))

	result, err := h.repo.GetTeacherFeedbacks(c.Context(), teacherID, page, pageSize)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro interno")
	}
	return c.JSON(result)
}

func (h *CourseHandler) RespondToFeedback(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}

	feedbackID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var body struct {
		Response string `json:"response" validate:"required,min=1,max=1000"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}

	if err := h.repo.RespondToFeedback(c.Context(), feedbackID, teacherID, body.Response); err == repository.ErrNotFound {
		return fiber.NewError(fiber.StatusNotFound, "feedback não encontrado")
	}
	return c.JSON(fiber.Map{"responded": true})
}

func (h *CourseHandler) FlagFeedback(c *fiber.Ctx) error {
	feedbackID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	var body struct {
		Flag   bool   `json:"flag"`
		Reason string `json:"reason"`
	}
	c.BodyParser(&body)

	h.repo.FlagFeedback(c.Context(), feedbackID, body.Flag, body.Reason)
	return c.JSON(fiber.Map{"flagged": body.Flag})
}

func (h *CourseHandler) HideFeedback(c *fiber.Ctx) error {
	feedbackID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	h.repo.HideFeedback(c.Context(), feedbackID)
	return c.JSON(fiber.Map{"hidden": true})
}

// ─── Teacher-specific handlers ─────────────────────────────────────────────────

func (h *CourseHandler) MyCoursesAll(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "crie primeiro o seu perfil de professor")
	}
	courses, err := h.repo.ListMyCoursesAll(c.Context(), teacherID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar cursos")
	}
	return c.JSON(courses)
}

func (h *CourseHandler) MyCourseStudents(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}
	students, err := h.repo.GetCourseStudents(c.Context(), courseID, teacherID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter estudantes")
	}
	return c.JSON(students)
}

func (h *CourseHandler) AllMyStudents(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	students, err := h.repo.GetAllTeacherStudents(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter estudantes")
	}
	return c.JSON(students)
}

func (h *CourseHandler) TeacherEarningsDetail(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}
	data, err := h.repo.GetTeacherEarningsDetail(c.Context(), teacherID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter ganhos")
	}
	return c.JSON(data)
}

func (h *CourseHandler) BroadcastToStudents(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID inválido")
	}

	var body struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Type    string `json:"type"`
	}
	if err := c.BodyParser(&body); err != nil || body.Title == "" || body.Message == "" {
		return fiber.NewError(fiber.StatusBadRequest, "título e mensagem são obrigatórios")
	}
	if body.Type == "" {
		body.Type = "info"
	}

	studentIDs, err := h.repo.GetCourseEnrolledStudentIDs(c.Context(), courseID, teacherID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao obter estudantes")
	}
	if len(studentIDs) == 0 {
		return c.JSON(fiber.Map{"sent": 0, "message": "nenhum estudante inscrito"})
	}

	go h.notif.Send(context.Background(), "broadcast", map[string]interface{}{
		"student_ids": studentIDs,
		"title":       body.Title,
		"message":     body.Message,
		"type":        body.Type,
	})
	go h.repo.LogNotification(context.Background(), teacherID, courseID, body.Title, body.Message, body.Type, len(studentIDs))

	return c.JSON(fiber.Map{"sent": len(studentIDs)})
}

func (h *CourseHandler) TeacherScheduleSession(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}

	var body struct {
		CourseID        string `json:"course_id"`
		StudentID       string `json:"student_id"` // student_profile id
		ScheduledAt     string `json:"scheduled_at"`
		DurationMinutes int    `json:"duration_minutes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	courseID, err := uuid.Parse(body.CourseID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "course_id inválido")
	}
	studentID, err := uuid.Parse(body.StudentID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "student_id inválido")
	}
	scheduledAt, err := time.Parse(time.RFC3339, body.ScheduledAt)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "scheduled_at inválido (use ISO 8601)")
	}
	if body.DurationMinutes <= 0 {
		body.DurationMinutes = 60
	}

	session, err := h.repo.ScheduleSessionByTeacher(c.Context(), teacherID, courseID, studentID, scheduledAt, body.DurationMinutes, "online")
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao agendar sessão")
	}
	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *CourseHandler) GetDisciplines(c *fiber.Ctx) error {
	list, err := h.repo.GetDisciplines(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao listar disciplinas")
	}
	return c.JSON(list)
}

func (h *CourseHandler) UpdateLesson(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "course_id inválido")
	}
	lessonID, err := uuid.Parse(c.Params("lesson_id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "lesson_id inválido")
	}
	var body struct {
		Title           string `json:"title"`
		Description     string `json:"description"`
		LessonType      string `json:"lesson_type"`
		VideoURL        string `json:"video_url"`
		DurationMinutes int    `json:"duration_minutes"`
		LessonOrder     int    `json:"lesson_order"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "dados inválidos")
	}
	row, err := h.repo.UpdateLesson(c.Context(), lessonID, courseID, userID, body.Title, body.Description, body.LessonType, body.VideoURL, body.DurationMinutes, body.LessonOrder)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao actualizar aula")
	}
	return c.JSON(row)
}

func (h *CourseHandler) DeleteLesson(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "course_id inválido")
	}
	lessonID, err := uuid.Parse(c.Params("lesson_id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "lesson_id inválido")
	}
	if err := h.repo.DeleteLesson(c.Context(), lessonID, courseID, userID); err != nil {
		if err.Error() == "forbidden" {
			return fiber.NewError(fiber.StatusForbidden, "sem permissão")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao eliminar aula")
	}
	return c.JSON(fiber.Map{"deleted": true})
}

func (h *CourseHandler) NotificationLogs(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	logs, err := h.repo.GetNotificationLogs(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao carregar histórico")
	}
	return c.JSON(logs)
}

func (h *CourseHandler) SendStudentMessage(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	teacherID, err := h.repo.GetTeacherProfileID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "sem perfil de professor")
	}
	studentProfileID, err := uuid.Parse(c.Params("student_id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "student_id inválido")
	}
	var body struct {
		Message string `json:"message"`
		Subject string `json:"subject"`
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return fiber.NewError(fiber.StatusBadRequest, "mensagem obrigatória")
	}
	studentUserID, err := h.repo.GetStudentUserIDByProfileID(c.Context(), studentProfileID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "estudante não encontrado")
	}
	subject := body.Subject
	if subject == "" {
		subject = "Mensagem do seu professor"
	}
	go h.notif.Send(context.Background(), "direct", map[string]interface{}{
		"student_ids": []string{studentUserID.String()},
		"title":       subject,
		"message":     body.Message,
		"type":        "info",
		"sender_id":   teacherID.String(),
	})
	return c.JSON(fiber.Map{"sent": true})
}

// helpers
func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}
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


func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
