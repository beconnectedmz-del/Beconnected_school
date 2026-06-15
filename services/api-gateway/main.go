package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type ServiceConfig struct {
	URL string
}

var services = map[string]ServiceConfig{}

func main() {
	// Carregar configuração dos serviços
	services["auth"]          = ServiceConfig{URL: os.Getenv("AUTH_SERVICE_URL")}
	services["users"]         = ServiceConfig{URL: os.Getenv("USER_SERVICE_URL")}
	services["payments"]      = ServiceConfig{URL: os.Getenv("PAYMENT_SERVICE_URL")}
	services["content"]       = ServiceConfig{URL: os.Getenv("CONTENT_SERVICE_URL")}
	services["ai"]            = ServiceConfig{URL: os.Getenv("AI_SERVICE_URL")}
	services["notifications"]  = ServiceConfig{URL: os.Getenv("NOTIFICATION_SERVICE_URL")}
	services["courses"]       = ServiceConfig{URL: os.Getenv("COURSE_SERVICE_URL")}
	services["funnel"]        = ServiceConfig{URL: os.Getenv("FUNNEL_SERVICE_URL")}

	// Redis para rate limiting e blacklist de tokens
	opt, _ := redis.ParseURL(os.Getenv("REDIS_URL"))
	rdb := redis.NewClient(opt)
	defer rdb.Close()

	app := fiber.New(fiber.Config{
		AppName:      "EduHub API Gateway",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		BodyLimit:    10 * 1024 * 1024, // 10MB
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
		Format: `{"time":"${time}","status":${status},"method":"${method}","path":"${path}","latency":"${latency}","ip":"${ip}"}` + "\n",
	}))
	allowOrigins := "http://localhost:3000,http://localhost:3002"
	if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
		allowOrigins = frontendURL + "," + allowOrigins
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Affiliate-Code, X-Request-ID",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
	}))

	// Security layer (order matters)
	app.Use(securityHeadersMiddleware())
	app.Use(ipBlacklistMiddleware(rdb))
	app.Use(intrusionDetectionMiddleware(rdb))
	app.Use(rateLimitMiddleware(rdb))

	// Admin security routes (ban/unban IPs, view threats)
	registerSecurityAdminRoutes(app, rdb)

	// Health do gateway
	app.Get("/health", func(c *fiber.Ctx) error {
		statuses := map[string]string{}
		for name, svc := range services {
			resp, err := http.Get(svc.URL + "/health")
			if err != nil || resp.StatusCode != 200 {
				statuses[name] = "down"
			} else {
				statuses[name] = "up"
			}
			if resp != nil {
				resp.Body.Close()
			}
		}
		return c.JSON(fiber.Map{"gateway": "up", "services": statuses})
	})

	// ── Rotas sem autenticação ──────────────────────────────────────────────────
	app.Post("/auth/google", proxyTo("auth", false))
	app.All("/auth/*", proxyTo("auth", false))
	app.Get("/teachers/list", proxyTo("users", false))
	app.Get("/teachers/:id", proxyTo("users", false))

	// ── Cursos e feedback (público) ─────────────────────────────────────────────
	app.Get("/disciplines", proxyTo("courses", false))
	app.Get("/courses", proxyTo("courses", false))
	app.Get("/courses/:id", proxyTo("courses", false))
	app.Get("/courses/:id/lessons", proxyTo("courses", false))
	app.Get("/courses/:id/packages", proxyTo("courses", false))
	app.Get("/feedback/teacher/:teacher_id", proxyTo("courses", false))

	// Funil (público)
	app.Post("/leads", proxyTo("funnel", false))
	app.Get("/affiliates/click", proxyTo("funnel", false))

	// ── Rotas com autenticação (middleware inline) ───────────────────────────────
	jwt := jwtMiddleware(rdb)

	// Estudantes
	app.All("/students/*", jwt, proxyTo("users", true))

	// Teacher - gestão de cursos e estudantes (course-service)
	app.Get("/teacher/my-courses", jwt, proxyTo("courses", true))
	app.Get("/teacher/courses/:id/students", jwt, proxyTo("courses", true))
	app.Get("/teacher/students", jwt, proxyTo("courses", true))
	app.Get("/teacher/earnings-detail", jwt, proxyTo("courses", true))
	app.Post("/teacher/courses/:id/notify", jwt, proxyTo("courses", true))
	app.Post("/teacher/sessions", jwt, proxyTo("courses", true))
	app.Get("/teacher/notification-logs", jwt, proxyTo("courses", true))
	app.Post("/teacher/students/:student_id/message", jwt, proxyTo("courses", true))

	// Professores (perfil privado, dashboard)
	app.All("/teachers/*", jwt, proxyTo("users", true))

	// Pagamentos
	app.All("/payments/*", jwt, proxyTo("payments", true))
	app.All("/payouts/*", jwt, proxyTo("payments", true))
	app.All("/admin/financial*", jwt, proxyTo("payments", true))

	// Conteúdo
	app.All("/content/*", jwt, proxyTo("content", true))

	// AI
	app.All("/match", jwt, proxyTo("ai", true))
	app.All("/recommendations/*", jwt, proxyTo("ai", true))

	// Notificações
	app.All("/notifications/*", jwt, proxyTo("notifications", true))
	app.All("/push/*", jwt, proxyTo("notifications", true))

	// Cursos (autenticado)
	app.Post("/courses", jwt, proxyTo("courses", true))
	app.Put("/courses/:id", jwt, proxyTo("courses", true))
	app.Post("/courses/:id/publish", jwt, proxyTo("courses", true))
	app.Post("/courses/:id/lessons", jwt, proxyTo("courses", true))
	app.Put("/courses/:id/lessons/:lesson_id", jwt, proxyTo("courses", true))
	app.Delete("/courses/:id/lessons/:lesson_id", jwt, proxyTo("courses", true))
	app.Post("/courses/:id/enroll", jwt, proxyTo("courses", true))
	app.Get("/enrollments/*", jwt, proxyTo("courses", true))
	app.Put("/courses/:id/lessons/:lesson_id/progress", jwt, proxyTo("courses", true))
	app.All("/sessions/*", jwt, proxyTo("courses", true))
	app.Post("/sessions", jwt, proxyTo("courses", true))
	app.All("/feedback/*", jwt, proxyTo("courses", true))

	// Funil (autenticado)
	app.All("/affiliates/*", jwt, proxyTo("funnel", true))

	// Admin
	app.Get("/admin/courses", jwt, proxyTo("courses", true))
	app.All("/admin/courses/*", jwt, proxyTo("courses", true))
	app.Get("/admin/kpis", jwt, proxyTo("courses", true))
	app.All("/admin/leads/*", jwt, proxyTo("funnel", true))
	app.All("/admin/affiliates/*", jwt, proxyTo("funnel", true))
	app.Get("/admin/campaigns", jwt, proxyTo("funnel", true))
	app.Post("/admin/campaigns", jwt, proxyTo("funnel", true))
	app.Post("/admin/campaigns/:id/launch", jwt, proxyTo("funnel", true))
	app.Post("/admin/campaigns/:id/pause", jwt, proxyTo("funnel", true))
	app.Get("/admin/segments", jwt, proxyTo("funnel", true))
	app.Post("/admin/segments", jwt, proxyTo("funnel", true))
	app.Get("/admin/funnel/kpis", jwt, proxyTo("funnel", true))
	app.All("/admin/*", jwt, proxyTo("users", true))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("API Gateway running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}

// ─── JWT middleware ─────────────────────────────────────────────────────────────
func jwtMiddleware(rdb *redis.Client) fiber.Handler {
	secret := []byte(os.Getenv("JWT_SECRET"))
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "token não fornecido")
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Verificar blacklist no Redis (logout)
		ctx := context.Background()
		blacklisted, _ := rdb.Get(ctx, "blacklist:"+tokenStr).Result()
		if blacklisted != "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token revogado")
		}

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de assinatura inesperado")
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "token inválido")
		}

		return c.Next()
	}
}

// ─── Rate limiting por IP ──────────────────────────────────────────────────────
func rateLimitMiddleware(rdb *redis.Client) fiber.Handler {
	maxReqs := 200
	window  := time.Minute
	if v := os.Getenv("RATE_LIMIT_MAX"); v != "" {
		fmt.Sscanf(v, "%d", &maxReqs)
	}

	return func(c *fiber.Ctx) error {
		key := fmt.Sprintf("rl:%s", c.IP())
		ctx := context.Background()

		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			return c.Next() // se Redis falhar, não bloquear
		}

		if count == 1 {
			rdb.Expire(ctx, key, window)
		}

		c.Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxReqs))
		c.Set("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, int64(maxReqs)-count)))

		if count > int64(maxReqs) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "rate limit excedido",
				"retry_after": "60",
			})
		}

		return c.Next()
	}
}

// ─── Proxy reverso ─────────────────────────────────────────────────────────────
func proxyTo(serviceName string, forwardAuth bool) fiber.Handler {
	client := &http.Client{Timeout: 30 * time.Second}

	return func(c *fiber.Ctx) error {
		svc, ok := services[serviceName]
		if !ok {
			return fiber.NewError(fiber.StatusBadGateway, "serviço não encontrado")
		}

		targetURL := svc.URL + c.OriginalURL()

		req, err := http.NewRequest(string(c.Method()), targetURL, strings.NewReader(string(c.Body())))
		if err != nil {
			return fiber.NewError(fiber.StatusBadGateway, "erro ao criar request")
		}

		// Copiar headers
		c.Request().Header.VisitAll(func(key, val []byte) {
			req.Header.Set(string(key), string(val))
		})

		// Adicionar headers de contexto
		req.Header.Set("X-Real-IP", c.IP())
		req.Header.Set("X-Forwarded-For", c.Get("X-Forwarded-For", c.IP()))
		req.Header.Set("X-Request-ID", c.GetRespHeader("X-Request-ID", generateRequestID()))

		resp, err := client.Do(req)
		if err != nil {
			return fiber.NewError(fiber.StatusBadGateway, fmt.Sprintf("serviço %s indisponível", serviceName))
		}
		defer resp.Body.Close()

		// Copiar headers da resposta
		for key, vals := range resp.Header {
			for _, val := range vals {
				c.Set(key, val)
			}
		}

		body, _ := io.ReadAll(resp.Body)
		return c.Status(resp.StatusCode).Send(body)
	}
}

func generateRequestID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
