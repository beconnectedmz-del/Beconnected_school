package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "token não fornecido")
		}
		tok, err := jwt.ParseWithClaims(strings.TrimPrefix(auth, "Bearer "), &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})
		if err != nil || !tok.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "token inválido")
		}
		claims := tok.Claims.(*JWTClaims)
		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.Role)
		return c.Next()
	}
}

func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("user_role").(string)
		for _, r := range roles {
			if r == role {
				return c.Next()
			}
		}
		return fiber.NewError(fiber.StatusForbidden, "acesso negado")
	}
}

func MustBeOwnerOrAdmin(ownerID uuid.UUID, c *fiber.Ctx) bool {
	role, _ := c.Locals("user_role").(string)
	uid, _ := c.Locals("user_id").(string)
	return role == "admin" || uid == ownerID.String()
}
