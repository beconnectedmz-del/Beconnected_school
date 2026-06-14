package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/eduhub/auth-service/models"
)

type JWTClaims struct {
	UserID string     `json:"user_id"`
	Email  string     `json:"email"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token não fornecido")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return fiber.NewError(fiber.StatusUnauthorized, "formato de token inválido")
		}

		token, err := jwt.ParseWithClaims(parts[1], &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "método de assinatura inválido")
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "token inválido ou expirado")
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			return fiber.NewError(fiber.StatusUnauthorized, "claims inválidas")
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("user_email", claims.Email)
		c.Locals("user_role", claims.Role)

		return c.Next()
	}
}

func RequireRole(roles ...models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals("user_role").(models.Role)
		if !ok {
			return fiber.NewError(fiber.StatusForbidden, "sem permissão")
		}
		for _, r := range roles {
			if r == userRole {
				return c.Next()
			}
		}
		return fiber.NewError(fiber.StatusForbidden, "acesso negado para este papel")
	}
}

func GetUserID(c *fiber.Ctx) (uuid.UUID, error) {
	id, ok := c.Locals("user_id").(string)
	if !ok {
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "utilizador não autenticado")
	}
	return uuid.Parse(id)
}
