package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/auth-service/models"
)

var ErrNotFound = errors.New("not found")
var ErrDuplicate = errors.New("already exists")

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, email, passwordHash string, role models.Role) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, role, status)
		 VALUES ($1, $2, $3, 'active')
		 RETURNING id, email, password_hash, role, status, email_verified, last_login_at, created_at, updated_at`,
		email, passwordHash, role,
	).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role,
		&user.Status, &user.EmailVerified, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if isPgDuplicate(err) {
			return nil, ErrDuplicate
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, role, status, email_verified, last_login_at, created_at, updated_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role,
		&user.Status, &user.EmailVerified, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return user, err
}

func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, role, status, email_verified, last_login_at, created_at, updated_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role,
		&user.Status, &user.EmailVerified, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return user, err
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET last_login_at = NOW() WHERE id = $1`, id,
	)
	return err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, hash, id,
	)
	return err
}

func (r *UserRepository) MarkEmailVerified(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET email_verified = TRUE, status = 'active', updated_at = NOW() WHERE id = $1`, id,
	)
	return err
}

func isPgDuplicate(err error) bool {
	return err != nil && len(err.Error()) > 0 &&
		(contains(err.Error(), "23505") || contains(err.Error(), "duplicate key"))
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s, sub))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
