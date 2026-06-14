package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/course-service/handlers"
	"github.com/eduhub/course-service/middleware"
	"github.com/eduhub/course-service/notify"
	"github.com/eduhub/course-service/repository"
	"github.com/eduhub/course-service/scheduler"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connection failed: %v", err)
	}
	defer pool.Close()

	repo := repository.NewCourseRepository(pool)
	if err := repo.EnsureNotificationLogsTable(ctx); err != nil {
		log.Printf("warn: could not create notification logs table: %v", err)
	}
	h := handlers.NewCourseHandler(repo)

	// Start session reminder goroutine (checks every minute)
	scheduler.StartSessionReminder(pool, notify.New())

	app := fiber.New(fiber.Config{
		AppName:      "EduHub Course Service",
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "course"})
	})

	// Rotas públicas
	app.Get("/disciplines", h.GetDisciplines)
	app.Get("/courses", h.List)
	app.Get("/courses/:id", h.GetByID)
	app.Get("/courses/:id/lessons", h.GetLessons)
	app.Get("/courses/:id/packages", h.GetCoursePackages)
	app.Get("/feedback/teacher/:teacher_id", h.GetTeacherFeedbacks)

	// Rotas autenticadas
	api := app.Group("/", middleware.Protected())

	// Cursos (professor)
	api.Post("/courses", middleware.RequireRole("teacher"), h.Create)
	api.Put("/courses/:id", middleware.RequireRole("teacher"), h.Update)
	api.Post("/courses/:id/publish", middleware.RequireRole("teacher"), h.Publish)
	api.Post("/courses/:id/lessons", middleware.RequireRole("teacher"), h.CreateLesson)
	api.Put("/courses/:id/lessons/:lesson_id", middleware.RequireRole("teacher"), h.UpdateLesson)
	api.Delete("/courses/:id/lessons/:lesson_id", middleware.RequireRole("teacher"), h.DeleteLesson)

	// Cursos (admin)
	api.Get("/admin/courses", middleware.RequireRole("admin"), h.AdminList)
	api.Post("/admin/courses/:id/validate", middleware.RequireRole("admin"), h.ValidateCourse)
	api.Post("/admin/feedback/:id/hide", middleware.RequireRole("admin"), h.HideFeedback)
	api.Post("/admin/feedback/:id/flag", middleware.RequireRole("admin"), h.FlagFeedback)
	api.Get("/admin/kpis", middleware.RequireRole("admin"), h.AdminKPIs)

	// Matrículas (estudante)
	api.Post("/courses/:id/enroll", middleware.RequireRole("student"), h.Enroll)
	api.Get("/enrollments/my", middleware.RequireRole("student"), h.MyEnrollments)
	api.Put("/courses/:id/lessons/:lesson_id/progress", middleware.RequireRole("student"), h.UpdateProgress)

	// Sessões ao vivo
	api.Post("/sessions", middleware.RequireRole("student"), h.ScheduleSession)
	api.Get("/sessions/my", h.MySessions)
	api.Post("/sessions/:id/cancel", h.CancelSession)

	// Feedback (estudante)
	api.Post("/feedback", middleware.RequireRole("student"), h.CreateFeedback)
	api.Post("/feedback/:id/respond", middleware.RequireRole("teacher"), h.RespondToFeedback)

	// Teacher - rotas exclusivas
	teacher := api.Group("/teacher", middleware.RequireRole("teacher"))
	teacher.Get("/my-courses", h.MyCoursesAll)
	teacher.Get("/courses/:id/students", h.MyCourseStudents)
	teacher.Get("/students", h.AllMyStudents)
	teacher.Get("/earnings-detail", h.TeacherEarningsDetail)
	teacher.Post("/courses/:id/notify", h.BroadcastToStudents)
	teacher.Post("/sessions", h.TeacherScheduleSession)
	teacher.Get("/notification-logs", h.NotificationLogs)
	teacher.Post("/students/:student_id/message", h.SendStudentMessage)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("Course Service running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
