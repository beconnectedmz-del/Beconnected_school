package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/user-service/models"
)

type TeacherFilters struct {
	Discipline string
	Level      string
	MinRating  float64
	MaxPrice   float64
	Page       int
	PageSize   int
	SortBy     string
}

type TeacherRepository struct {
	db *pgxpool.Pool
}

func NewTeacherRepository(db *pgxpool.Pool) *TeacherRepository {
	return &TeacherRepository{db: db}
}

func (r *TeacherRepository) Create(ctx context.Context, userID uuid.UUID, req *models.CreateTeacherProfileRequest) (*models.TeacherProfile, error) {
	profile := &models.TeacherProfile{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO teacher_profiles (user_id, full_name, bio, presentation_video_url, cv_url, timezone)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, full_name, bio, presentation_video_url, cv_url, rating, total_reviews, total_students, is_validated, is_featured, commission_rate, timezone, created_at`,
		userID, req.FullName, req.Bio, req.PresentationVideoURL, req.CVURL,
		nullableString(req.Timezone, "Africa/Maputo"),
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.Bio,
		&profile.PresentationVideoURL, &profile.CVURL,
		&profile.Rating, &profile.TotalReviews, &profile.TotalStudents,
		&profile.IsValidated, &profile.IsFeatured, &profile.CommissionRate,
		&profile.Timezone, &profile.CreatedAt,
	)
	return profile, err
}

func (r *TeacherRepository) Update(ctx context.Context, userID uuid.UUID, req *models.UpdateTeacherProfileRequest) (*models.TeacherProfile, error) {
	profile := &models.TeacherProfile{}
	err := r.db.QueryRow(ctx,
		`UPDATE teacher_profiles SET
		   full_name              = COALESCE(NULLIF($1,''), full_name),
		   bio                    = COALESCE(NULLIF($2,''), bio),
		   presentation_video_url = COALESCE(NULLIF($3,''), presentation_video_url),
		   cv_url                 = COALESCE(NULLIF($4,''), cv_url),
		   timezone               = COALESCE(NULLIF($5,''), timezone),
		   updated_at             = NOW()
		 WHERE user_id = $6
		 RETURNING id, user_id, full_name, bio, presentation_video_url, cv_url, rating, total_reviews, total_students, is_validated, is_featured, commission_rate, timezone, created_at`,
		req.FullName, req.Bio, req.PresentationVideoURL, req.CVURL, req.Timezone, userID,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.Bio,
		&profile.PresentationVideoURL, &profile.CVURL,
		&profile.Rating, &profile.TotalReviews, &profile.TotalStudents,
		&profile.IsValidated, &profile.IsFeatured, &profile.CommissionRate,
		&profile.Timezone, &profile.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return profile, err
}

func (r *TeacherRepository) SetAvailability(ctx context.Context, userID uuid.UUID, slots []models.AvailabilitySlot) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var teacherID uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM teacher_profiles WHERE user_id = $1`, userID).Scan(&teacherID)
	if err != nil {
		return ErrNotFound
	}

	tx.Exec(ctx, `DELETE FROM teacher_availability WHERE teacher_id = $1`, teacherID)

	for _, slot := range slots {
		_, err := tx.Exec(ctx,
			`INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, timezone)
			 VALUES ($1, $2, $3, $4, $5)`,
			teacherID, slot.DayOfWeek, slot.StartTime, slot.EndTime,
			nullableString(slot.Timezone, "Africa/Maputo"),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *TeacherRepository) List(ctx context.Context, f TeacherFilters) (map[string]interface{}, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 50 {
		f.PageSize = 20
	}

	allowedSort := map[string]string{
		"rating": "tp.rating DESC",
		"price":  "tp.rating DESC",
		"newest": "tp.created_at DESC",
	}
	orderBy, ok := allowedSort[f.SortBy]
	if !ok {
		orderBy = "tp.rating DESC"
	}

	query := fmt.Sprintf(`
		SELECT tp.id, tp.full_name, tp.bio, tp.presentation_video_url,
		       tp.rating, tp.total_reviews, tp.total_students, tp.is_featured,
		       tp.timezone, tp.created_at,
		       COUNT(*) OVER() as total_count
		FROM teacher_profiles tp
		WHERE tp.is_validated = TRUE
		  AND ($1 = '' OR EXISTS (
		    SELECT 1 FROM teacher_disciplines td
		    JOIN disciplines d ON d.id = td.discipline_id
		    WHERE td.teacher_id = tp.id AND d.slug = $1
		  ))
		  AND ($2 = 0 OR tp.rating >= $2)
		ORDER BY %s
		LIMIT $3 OFFSET $4`, orderBy)

	rows, err := r.db.Query(ctx, query,
		f.Discipline, f.MinRating,
		f.PageSize, (f.Page-1)*f.PageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teachers := collectRows(rows)
	total := 0
	if len(teachers) > 0 {
		if t, ok := teachers[0]["total_count"].(int64); ok {
			total = int(t)
		}
	}

	return map[string]interface{}{
		"data":      teachers,
		"total":     total,
		"page":      f.Page,
		"page_size": f.PageSize,
	}, nil
}

func (r *TeacherRepository) GetPublicProfile(ctx context.Context, id uuid.UUID) (*models.TeacherProfile, error) {
	profile := &models.TeacherProfile{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, full_name, bio, presentation_video_url, rating, total_reviews, total_students, total_hours_taught, is_validated, is_featured, timezone, created_at
		 FROM teacher_profiles WHERE id = $1 AND is_validated = TRUE`, id,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.Bio,
		&profile.PresentationVideoURL,
		&profile.Rating, &profile.TotalReviews, &profile.TotalStudents, &profile.TotalHoursTaught,
		&profile.IsValidated, &profile.IsFeatured, &profile.Timezone, &profile.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return profile, err
}

func (r *TeacherRepository) GetDashboard(ctx context.Context, userID uuid.UUID) (*models.TeacherDashboard, error) {
	profile := &models.TeacherProfile{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, full_name, bio, rating, total_reviews, total_students, total_hours_taught, is_validated, is_featured, commission_rate, timezone, created_at
		 FROM teacher_profiles WHERE user_id = $1`, userID,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FullName, &profile.Bio,
		&profile.Rating, &profile.TotalReviews, &profile.TotalStudents, &profile.TotalHoursTaught,
		&profile.IsValidated, &profile.IsFeatured, &profile.CommissionRate, &profile.Timezone, &profile.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	var earningsMonth, earningsTotal float64
	r.db.QueryRow(ctx,
		`SELECT
		   COALESCE(SUM(teacher_amount) FILTER (WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())), 0),
		   COALESCE(SUM(teacher_amount), 0)
		 FROM transactions t
		 JOIN courses c ON c.id = t.course_id
		 WHERE c.teacher_id = $1 AND t.payment_status = 'paid'`, profile.ID,
	).Scan(&earningsMonth, &earningsTotal)

	return &models.TeacherDashboard{
		Profile:           profile,
		EarningsThisMonth: earningsMonth,
		EarningsTotal:     earningsTotal,
		TotalStudents:     profile.TotalStudents,
	}, nil
}

func (r *TeacherRepository) SetValidation(ctx context.Context, id uuid.UUID, validated bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE teacher_profiles SET is_validated = $1, updated_at = NOW() WHERE id = $2`, validated, id,
	)
	return err
}

func (r *TeacherRepository) SetFeatured(ctx context.Context, id uuid.UUID, featured bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE teacher_profiles SET is_featured = $1, updated_at = NOW() WHERE id = $2`, featured, id,
	)
	return err
}
