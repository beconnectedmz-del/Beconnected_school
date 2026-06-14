package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/eduhub/auth-service/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SecurityRepository struct {
	pool *pgxpool.Pool
}

func NewSecurityRepository(pool *pgxpool.Pool) *SecurityRepository {
	return &SecurityRepository{pool: pool}
}

// LogEvent writes a security event to the audit log (fire-and-forget).
func (r *SecurityRepository) LogEvent(ctx context.Context, e models.SecurityEvent) {
	meta := []byte("{}")
	if e.Metadata != nil {
		meta, _ = json.Marshal(e.Metadata)
	}
	r.pool.Exec(ctx,
		`INSERT INTO security_events (user_id, event_type, ip_address, user_agent, metadata)
		 VALUES ($1, $2, $3::inet, $4, $5::jsonb)`,
		e.UserID, e.EventType, nilIfEmpty(e.IPAddress), e.UserAgent, string(meta),
	)
}

// Get2FA returns the 2FA record for a user.
func (r *SecurityRepository) Get2FA(ctx context.Context, userID uuid.UUID) (*models.TwoFA, error) {
	var t models.TwoFA
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, secret, backup_codes, enabled, created_at, verified_at
		 FROM user_2fa WHERE user_id = $1`,
		userID,
	).Scan(&t.ID, &t.UserID, &t.Secret, &t.BackupCodes, &t.Enabled, &t.CreatedAt, &t.VerifiedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

// Upsert2FA stores a new (or replaces an existing) 2FA secret and backup codes.
func (r *SecurityRepository) Upsert2FA(ctx context.Context, userID uuid.UUID, secret string, backupCodes []string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO user_2fa (user_id, secret, backup_codes, enabled)
		 VALUES ($1, $2, $3, false)
		 ON CONFLICT (user_id) DO UPDATE
		   SET secret = $2, backup_codes = $3, enabled = false, verified_at = NULL`,
		userID, secret, backupCodes,
	)
	return err
}

// Enable2FA marks 2FA as active after the first successful code verification.
func (r *SecurityRepository) Enable2FA(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE user_2fa SET enabled = true, verified_at = now() WHERE user_id = $1`,
		userID,
	)
	return err
}

// Disable2FA clears the 2FA secret and disables it.
func (r *SecurityRepository) Disable2FA(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE user_2fa SET enabled = false, secret = '', backup_codes = '{}', verified_at = NULL
		 WHERE user_id = $1`,
		userID,
	)
	return err
}

// UpdateBackupCodes replaces the backup code list (after one is consumed or regenerated).
func (r *SecurityRepository) UpdateBackupCodes(ctx context.Context, userID uuid.UUID, codes []string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE user_2fa SET backup_codes = $2 WHERE user_id = $1`,
		userID, codes,
	)
	return err
}

// IsIPBlacklisted checks if an IP is in the permanent or temporary blacklist.
func (r *SecurityRepository) IsIPBlacklisted(ctx context.Context, ip string) (bool, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM ip_blacklist
		 WHERE ip_address = $1::inet
		   AND (expires_at IS NULL OR expires_at > now())`,
		ip,
	).Scan(&count)
	return count > 0, err
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
