package main

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// ─── Intrusion detection patterns ─────────────────────────────────────────────
var (
	sqliPattern = regexp.MustCompile(
		`(?i)(union\s+select|drop\s+table|insert\s+into|delete\s+from|exec\s*\(|` +
			`xp_cmdshell|information_schema|pg_catalog|sleep\s*\(|waitfor\s+delay|` +
			`load_file\s*\(|into\s+outfile|benchmark\s*\(|extractvalue\s*\()`)

	xssPattern = regexp.MustCompile(
		`(?i)(<script[\s/>]|javascript\s*:|onerror\s*=|onload\s*=|` +
			`eval\s*\(|document\.cookie|window\.location|<iframe[\s/>]|` +
			`<img[^>]+onerror|vbscript\s*:)`)

	traversalPattern = regexp.MustCompile(
		`(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|%252e%252e|\.\.%2f|%c0%af)`)

	cmdInjPattern = regexp.MustCompile(
		"(?i)(;\\s*(cat|id|ls|whoami|uname|passwd|shadow|wget|curl|nc|ncat|bash|sh)\\b|" +
			"`[^`]{1,100}`|\\$\\([^)]{1,100}\\))")

	ssrfPattern = regexp.MustCompile(
		`(?i)(127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.|192\.168\.|10\.\d+\.\d+\.|` +
			`172\.(1[6-9]|2\d|3[01])\.)`)
)

// ─── Intrusion Detection Middleware ───────────────────────────────────────────
func intrusionDetectionMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip file uploads — scanning binary content causes false positives
		ct := string(c.Request().Header.ContentType())
		if strings.Contains(ct, "multipart/form-data") {
			return c.Next()
		}

		// Scan URL + query string
		target := c.OriginalURL()
		if reason := detect(target); reason != "" {
			logThreat(c, rdb, reason, target)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "requisição inválida",
				"code":  "SECURITY_VIOLATION",
			})
		}

		// Scan request body (max 64 KB to avoid overhead on large payloads)
		body := c.Body()
		if len(body) > 0 && len(body) < 64*1024 {
			if reason := detect(string(body)); reason != "" {
				logThreat(c, rdb, reason, "body")
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "payload inválido",
					"code":  "SECURITY_VIOLATION",
				})
			}
		}

		return c.Next()
	}
}

func detect(s string) string {
	switch {
	case sqliPattern.MatchString(s):
		return "sqli"
	case xssPattern.MatchString(s):
		return "xss"
	case traversalPattern.MatchString(s):
		return "path_traversal"
	case cmdInjPattern.MatchString(s):
		return "cmd_injection"
	}
	return ""
}

// logThreat records the threat in Redis for monitoring and increments the IP counter.
func logThreat(c *fiber.Ctx, rdb *redis.Client, threatType, location string) {
	ip := c.IP()
	ctx := context.Background()

	// Increment threat counter for this IP
	threatKey := fmt.Sprintf("threat:%s:%s", ip, threatType)
	count, _ := rdb.Incr(ctx, threatKey).Result()
	rdb.Expire(ctx, threatKey, 24*time.Hour)

	// Auto-ban after 10 detected threats in 24h
	if count >= 10 {
		banKey := fmt.Sprintf("banned:ip:%s", ip)
		rdb.Set(ctx, banKey, threatType, 24*time.Hour)
	}
}

// ─── IP Blacklist Middleware ───────────────────────────────────────────────────
func ipBlacklistMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		ctx := context.Background()

		// Check Redis ban (set by logThreat or admin)
		if val, err := rdb.Get(ctx, fmt.Sprintf("banned:ip:%s", ip)).Result(); err == nil && val != "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "acesso bloqueado",
				"code":  "IP_BANNED",
			})
		}

		return c.Next()
	}
}

// ─── Security Headers Middleware ──────────────────────────────────────────────
func securityHeadersMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
		c.Set("Cache-Control", "no-store, no-cache, must-revalidate")
		c.Set("X-Request-ID", generateRequestID())
		return c.Next()
	}
}

// ─── Admin: manage IP bans via Redis ──────────────────────────────────────────
func registerSecurityAdminRoutes(app *fiber.App, rdb *redis.Client) {
	admin := app.Group("/admin/security", jwtMiddleware(rdb))

	// Ban an IP
	admin.Post("/ban-ip", func(c *fiber.Ctx) error {
		var body struct {
			IP       string `json:"ip"`
			Reason   string `json:"reason"`
			DurationH int   `json:"duration_hours"` // 0 = permanent (24h max in Redis)
		}
		if err := c.BodyParser(&body); err != nil || body.IP == "" {
			return fiber.NewError(fiber.StatusBadRequest, "ip obrigatório")
		}
		dur := time.Duration(body.DurationH) * time.Hour
		if dur == 0 || dur > 720*time.Hour {
			dur = 720 * time.Hour // cap at 30 days
		}
		rdb.Set(context.Background(), fmt.Sprintf("banned:ip:%s", body.IP), body.Reason, dur)
		return c.JSON(fiber.Map{"banned": body.IP, "duration_hours": dur.Hours()})
	})

	// Unban an IP
	admin.Delete("/ban-ip/:ip", func(c *fiber.Ctx) error {
		ip := c.Params("ip")
		rdb.Del(context.Background(), fmt.Sprintf("banned:ip:%s", ip))
		return c.JSON(fiber.Map{"unbanned": ip})
	})

	// List threat counts (last 24h)
	admin.Get("/threats", func(c *fiber.Ctx) error {
		ctx := context.Background()
		keys, _ := rdb.Keys(ctx, "threat:*").Result()
		result := map[string]string{}
		for _, k := range keys {
			v, _ := rdb.Get(ctx, k).Result()
			result[k] = v
		}
		return c.JSON(result)
	})
}
