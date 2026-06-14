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

	"github.com/eduhub/payment-service/handlers"
	"github.com/eduhub/payment-service/middleware"
	"github.com/eduhub/payment-service/repository"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connection failed: %v", err)
	}
	defer pool.Close()

	paymentRepo := repository.NewPaymentRepository(pool)
	paymentHandler := handlers.NewPaymentHandler(paymentRepo)

	app := fiber.New(fiber.Config{
		AppName:      "EduHub Payment Service",
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
		return c.JSON(fiber.Map{"status": "ok", "service": "payment"})
	})

	// Webhook público (verificação por assinatura interna)
	app.Post("/payments/webhook", paymentHandler.Webhook)

	// Rotas autenticadas
	api := app.Group("/", middleware.Protected())

	// Pagamentos
	payments := api.Group("/payments")
	payments.Post("/checkout", paymentHandler.Checkout)
	payments.Get("/history", paymentHandler.GetHistory)
	payments.Get("/earnings", middleware.RequireRole("teacher"), paymentHandler.GetEarnings)

	// Payouts
	payouts := api.Group("/payouts")
	payouts.Post("/request", middleware.RequireRole("teacher"), paymentHandler.RequestPayout)
	payouts.Get("/my", middleware.RequireRole("teacher"), paymentHandler.GetMyPayouts)

	// Admin financeiro
	admin := api.Group("/admin", middleware.RequireRole("admin"))
	admin.Get("/financial-report", paymentHandler.FinancialReport)
	admin.Get("/payouts/pending", paymentHandler.GetPendingPayouts)
	admin.Post("/payouts/:id/approve", paymentHandler.ApprovePayout)
	admin.Get("/transactions", paymentHandler.ListAllTransactions)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	log.Printf("Payment Service running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
