package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/eduhub/auth-service/handlers"
	"github.com/eduhub/auth-service/middleware"
	"github.com/eduhub/auth-service/repository"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("database ping failed: %v", err)
	}

	opt, err := redis.ParseURL(os.Getenv("REDIS_URL"))
	if err != nil {
		log.Fatalf("invalid redis url: %v", err)
	}
	rdb := redis.NewClient(opt)
	defer rdb.Close()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping failed: %v", err)
	}

	userRepo := repository.NewUserRepository(pool)
	secRepo  := repository.NewSecurityRepository(pool)
	bf       := middleware.NewBruteForce(rdb)

	authHandler := handlers.NewAuthHandler(userRepo, secRepo, bf, rdb)

	app := fiber.New(fiber.Config{
		AppName:      "EduHub Auth Service",
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
	app.Use(logger.New(logger.Config{
		Format: `{"time":"${time}","status":${status},"latency":"${latency}","method":"${method}","path":"${path}"}` + "\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: os.Getenv("FRONTEND_URL") + ",http://localhost:3000",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "auth"})
	})

	// Strict rate limit on all auth endpoints (20 req/min per IP)
	authLimiter := limiter.New(limiter.Config{
		Max:        20,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string { return c.IP() },
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "muitos pedidos, tente novamente em 1 minuto",
				"code":  "RATE_LIMITED",
			})
		},
	})

	auth := app.Group("/auth", authLimiter)

	// ── Public auth routes ─────────────────────────────────────────────────────
	auth.Post("/register",       authHandler.Register)
	auth.Post("/login",          authHandler.Login)
	auth.Post("/2fa/login",      authHandler.ValidateTOTPLogin)
	auth.Post("/refresh",        authHandler.RefreshToken)
	auth.Post("/verify-email",   authHandler.VerifyEmail)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)

	// ── Authenticated auth routes ──────────────────────────────────────────────
	protected := auth.Group("/", middleware.Protected())
	protected.Post("/logout",            authHandler.Logout)
	protected.Get("/me",                 authHandler.Me)
	protected.Get("/2fa/status",         authHandler.GetTwoFAStatus)
	protected.Post("/2fa/setup",         authHandler.SetupTOTP)
	protected.Post("/2fa/verify-setup",  authHandler.VerifySetupTOTP)
	protected.Post("/2fa/disable",       authHandler.DisableTOTP)
	protected.Post("/2fa/backup-codes",  authHandler.RegenerateBackupCodes)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Auth Service running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
