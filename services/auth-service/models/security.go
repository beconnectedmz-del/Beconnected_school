package models

import (
	"time"

	"github.com/google/uuid"
)

type SecurityEvent struct {
	UserID    *uuid.UUID             `json:"-"`
	EventType string                 `json:"event_type"`
	IPAddress string                 `json:"ip_address,omitempty"`
	UserAgent string                 `json:"user_agent,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type TwoFA struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Secret      string     `json:"-"`
	BackupCodes []string   `json:"-"`
	Enabled     bool       `json:"enabled"`
	CreatedAt   time.Time  `json:"created_at"`
	VerifiedAt  *time.Time `json:"verified_at,omitempty"`
}

type TOTPSetupResponse struct {
	QRURL       string   `json:"qr_url"`
	BackupCodes []string `json:"backup_codes"`
}

type TOTPVerifyRequest struct {
	Code string `json:"code" validate:"required"`
}

type TOTPLoginRequest struct {
	TempToken string `json:"temp_token" validate:"required"`
	Code      string `json:"code" validate:"required"`
}

type TOTPDisableRequest struct {
	Password string `json:"password" validate:"required"`
	Code     string `json:"code" validate:"required"`
}

type TwoFAStatus struct {
	Enabled          bool       `json:"enabled"`
	Configured       bool       `json:"configured"`
	BackupCodesCount int        `json:"backup_codes_remaining"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
}
