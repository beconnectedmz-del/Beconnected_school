package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/user-service/models"
)

var ErrNotFound = errors.New("not found")

type StudentRepository struct {
	db *pgxpool.Pool
}

func NewStudentRepository(db *pgxpool.Pool) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(ctx context.Context, userID uuid.UUID, req *models.CreateStudentProfileRequest) (*models.StudentProfile, error) {
	profile := &models.StudentProfile{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO student_profiles (user_id, full_name, date_of_birth, proficiency_level, learning_goals, timezone)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, full_name, date_of_birth, proficiency_level, learning_goals, avatar_url, timezone, preferred_language, created_at`,
		userID, req.FullName, req.DateOfBirth,
		nullableString(req.ProficiencyLevel, "beginner"),
		req.LearningGoals,
		nullableString(req.Timezone, "Africa/Maputo"),
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.DateOfBirth,
		&profile.ProficiencyLevel, &profile.LearningGoals, &profile.AvatarURL,
		&profile.Timezone, &profile.PreferredLanguage, &profile.CreatedAt,
	)
	return profile, err
}

func (r *StudentRepository) Update(ctx context.Context, userID uuid.UUID, req *models.UpdateStudentProfileRequest) (*models.StudentProfile, error) {
	profile := &models.StudentProfile{}
	err := r.db.QueryRow(ctx,
		`UPDATE student_profiles SET
		   full_name        = COALESCE(NULLIF($1,''), full_name),
		   date_of_birth    = COALESCE($2, date_of_birth),
		   proficiency_level= COALESCE(NULLIF($3,''), proficiency_level),
		   learning_goals   = COALESCE(NULLIF($4,''), learning_goals),
		   avatar_url       = COALESCE(NULLIF($5,''), avatar_url),
		   timezone         = COALESCE(NULLIF($6,''), timezone),
		   updated_at       = NOW()
		 WHERE user_id = $7
		 RETURNING id, user_id, full_name, date_of_birth, proficiency_level, learning_goals, avatar_url, timezone, preferred_language, created_at`,
		req.FullName, req.DateOfBirth, req.ProficiencyLevel,
		req.LearningGoals, req.AvatarURL, req.Timezone, userID,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.DateOfBirth,
		&profile.ProficiencyLevel, &profile.LearningGoals, &profile.AvatarURL,
		&profile.Timezone, &profile.PreferredLanguage, &profile.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return profile, err
}

func (r *StudentRepository) UpdateDiagnostic(ctx context.Context, userID uuid.UUID, answers map[string]interface{}, level string) error {
	data, _ := json.Marshal(answers)
	_, err := r.db.Exec(ctx,
		`UPDATE student_profiles SET diagnostic_answers = $1, proficiency_level = $2, updated_at = NOW() WHERE user_id = $3`,
		data, level, userID,
	)
	return err
}

func (r *StudentRepository) GetDashboard(ctx context.Context, userID uuid.UUID) (*models.StudentDashboard, error) {
	profile := &models.StudentProfile{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, full_name, proficiency_level, learning_goals, avatar_url, timezone, preferred_language, created_at
		 FROM student_profiles WHERE user_id = $1`, userID,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName,
		&profile.ProficiencyLevel, &profile.LearningGoals, &profile.AvatarURL,
		&profile.Timezone, &profile.PreferredLanguage, &profile.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	var enrolled, completed int
	r.db.QueryRow(ctx,
		`SELECT
		   COUNT(*) FILTER (WHERE status = 'active'),
		   COUNT(*) FILTER (WHERE status = 'completed')
		 FROM enrollments WHERE student_id = $1`, profile.ID,
	).Scan(&enrolled, &completed)

	rows, _ := r.db.Query(ctx,
		`SELECT id, scheduled_at, status, course_id, teacher_id
		 FROM live_sessions WHERE student_id = $1 AND status = 'scheduled' AND scheduled_at > NOW()
		 ORDER BY scheduled_at LIMIT 5`, profile.ID,
	)
	defer rows.Close()
	upcoming := collectRows(rows)

	return &models.StudentDashboard{
		Profile:          profile,
		EnrolledCourses:  enrolled,
		CompletedCourses: completed,
		UpcomingSessions: upcoming,
	}, nil
}

func collectRows(rows pgx.Rows) []map[string]interface{} {
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, f := range fields {
			row[string(f.Name)] = vals[i]
		}
		result = append(result, row)
	}
	return result
}

func nullableString(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
