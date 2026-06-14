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

	"github.com/eduhub/funnel-service/handlers"
	"github.com/eduhub/funnel-service/middleware"
	"github.com/eduhub/funnel-service/repository"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connection failed: %v", err)
	}
	defer pool.Close()

	repo := repository.NewFunnelRepository(pool)
	h := handlers.NewFunnelHandler(repo)

	app := fiber.New(fiber.Config{
		AppName:      "EduHub Funnel Service",
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
		return c.JSON(fiber.Map{"status": "ok", "service": "funnel"})
	})

	// Rotas públicas (sem autenticação)
	app.Post("/leads", h.CreateLead)             // Capturar lead do funil
	app.Get("/affiliates/click", h.RegisterClick) // Tracking de clique de afiliado

	// Rotas autenticadas
	api := app.Group("/", middleware.Protected())

	// Afiliados
	api.Post("/affiliates/register", h.RegisterAffiliate)
	api.Get("/affiliates/dashboard", h.AffiliateDashboard)
	api.Get("/affiliates/report", h.AffiliateReport)

	// Admin — Leads
	admin := api.Group("/admin", middleware.RequireRole("admin"))
	admin.Get("/leads", h.ListLeads)
	admin.Put("/leads/:id", h.UpdateLead)
	admin.Post("/leads/:id/convert", h.ConvertLead)
	admin.Get("/leads/stats", h.LeadStats)

	// Admin — Afiliados
	admin.Get("/affiliates", h.ListAffiliates)
	admin.Post("/affiliates/:id/approve", h.ApproveAffiliate)

	// Admin — Campanhas
	admin.Get("/campaigns", h.ListCampaigns)
	admin.Post("/campaigns", h.CreateCampaign)
	admin.Post("/campaigns/:id/launch", h.LaunchCampaign)
	admin.Post("/campaigns/:id/pause", h.PauseCampaign)

	// Admin — Segmentos
	admin.Get("/segments", h.ListSegments)
	admin.Post("/segments", h.CreateSegment)

	// Admin — KPIs (both paths supported since gateway forwards full path)
	admin.Get("/kpis", h.FunnelKPIs)
	admin.Get("/funnel/kpis", h.FunnelKPIs)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8089"
	}

	log.Printf("Funnel Service running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
