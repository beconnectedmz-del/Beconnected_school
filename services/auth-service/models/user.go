package models

import (
	"time"

	"github.com/google/uuid"
)

type Role string
type Status string

const (
	RoleStudent   Role = "student"
	RoleTeacher   Role = "teacher"
	RoleParent    Role = "parent"
	RoleAdmin     Role = "admin"
	RoleAffiliate Role = "affiliate"

	StatusActive    Status = "active"
	StatusSuspended Status = "suspended"
	StatusPending   Status = "pending"
	StatusBanned    Status = "banned"
)

type User struct {
	ID            uuid.UUID  `json:"id"`
	Email         string     `json:"email"`
	PasswordHash  string     `json:"-"`
	Role          Role       `json:"role"`
	Status        Status     `json:"status"`
	EmailVerified bool       `json:"email_verified"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
	Role     Role   `json:"role" validate:"required,oneof=student teacher affiliate"`
	FullName string `json:"full_name" validate:"required,min=2,max=255"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
	User         *User  `json:"user"`
}

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   Role   `json:"role"`
}
