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
	"github.com/redis/go-redis/v9"

	"github.com/eduhub/user-service/handlers"
	"github.com/eduhub/user-service/middleware"
	"github.com/eduhub/user-service/repository"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connection failed: %v", err)
	}
	defer pool.Close()

	opt, _ := redis.ParseURL(os.Getenv("REDIS_URL"))
	rdb := redis.NewClient(opt)
	defer rdb.Close()

	studentRepo := repository.NewStudentRepository(pool)
	teacherRepo := repository.NewTeacherRepository(pool)

	studentHandler := handlers.NewStudentHandler(studentRepo, rdb)
	teacherHandler := handlers.NewTeacherHandler(teacherRepo, rdb)

	app := fiber.New(fiber.Config{
		AppName:      "EduHub User Service",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
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
		return c.JSON(fiber.Map{"status": "ok", "service": "user"})
	})

	// Rotas protegidas
	api := app.Group("/", middleware.Protected())

	// Estudantes
	students := api.Group("/students")
	students.Post("/profile", middleware.RequireRole("student"), studentHandler.CreateProfile)
	students.Put("/profile", middleware.RequireRole("student"), studentHandler.UpdateProfile)
	students.Post("/diagnostic", middleware.RequireRole("student"), studentHandler.SubmitDiagnostic)
	students.Get("/dashboard", middleware.RequireRole("student"), studentHandler.GetDashboard)
	students.Get("/recommendations", middleware.RequireRole("student"), studentHandler.GetRecommendations)

	// Professores
	teachers := api.Group("/teachers")
	teachers.Post("/profile", middleware.RequireRole("teacher"), teacherHandler.CreateProfile)
	teachers.Put("/profile", middleware.RequireRole("teacher"), teacherHandler.UpdateProfile)
	teachers.Post("/availability", middleware.RequireRole("teacher"), teacherHandler.SetAvailability)
	teachers.Get("/dashboard", middleware.RequireRole("teacher"), teacherHandler.GetDashboard)
	teachers.Get("/list", teacherHandler.ListTeachers)      // público
	teachers.Get("/:id", teacherHandler.GetTeacherPublic)   // público

	// Admin
	admin := api.Group("/admin", middleware.RequireRole("admin"))
	admin.Post("/teachers/:id/validate", teacherHandler.ValidateTeacher)
	admin.Post("/teachers/:id/feature", teacherHandler.FeatureTeacher)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("User Service running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
