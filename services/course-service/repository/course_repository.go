package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/course-service/models"
)

var ErrNotFound = errors.New("not found")
var ErrForbidden = errors.New("forbidden")

type CourseRepository struct {
	db *pgxpool.Pool
}

func NewCourseRepository(db *pgxpool.Pool) *CourseRepository {
	return &CourseRepository{db: db}
}

func (r *CourseRepository) GetTeacherProfileID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `SELECT id FROM teacher_profiles WHERE user_id = $1`, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return id, err
}

func (r *CourseRepository) GetStudentProfileID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `SELECT id FROM student_profiles WHERE user_id = $1`, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return id, err
}

// ─── Courses ──────────────────────────────────────────────────────────────────

func (r *CourseRepository) Create(ctx context.Context, teacherID uuid.UUID, req *models.CreateCourseRequest) (*models.Course, error) {
	disciplineID, err := uuid.Parse(req.DisciplineID)
	if err != nil {
		return nil, errors.New("discipline_id inválido")
	}
	tags, _ := json.Marshal(req.Tags)

	course := &models.Course{}
	err = r.db.QueryRow(ctx, `
		INSERT INTO courses (teacher_id, discipline_id, title, description, level, price,
		                     lesson_type, total_hours, thumbnail_url, promo_video_url, tags)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, teacher_id, discipline_id, title, description, level, price, lesson_type,
		          total_hours, total_lessons, enrolled_count, is_published, is_validated,
		          is_featured, thumbnail_url, promo_video_url, created_at, updated_at`,
		teacherID, disciplineID, req.Title, req.Description, req.Level, req.Price,
		req.LessonType, req.TotalHours, req.ThumbnailURL, req.PromoVideoURL, tags,
	).Scan(
		&course.ID, &course.TeacherID, &course.DisciplineID, &course.Title, &course.Description,
		&course.Level, &course.Price, &course.LessonType, &course.TotalHours,
		&course.TotalLessons, &course.EnrolledCount, &course.IsPublished, &course.IsValidated,
		&course.IsFeatured, &course.ThumbnailURL, &course.PromoVideoURL,
		&course.CreatedAt, &course.UpdatedAt,
	)
	return course, err
}

func (r *CourseRepository) Update(ctx context.Context, courseID, teacherID uuid.UUID, req *models.UpdateCourseRequest) (*models.Course, error) {
	tags, _ := json.Marshal(req.Tags)
	course := &models.Course{}
	err := r.db.QueryRow(ctx, `
		UPDATE courses SET
		  title          = COALESCE(NULLIF($1,''), title),
		  description    = COALESCE(NULLIF($2,''), description),
		  level          = COALESCE(NULLIF($3,''), level),
		  price          = COALESCE($4, price),
		  total_hours    = COALESCE($5, total_hours),
		  thumbnail_url  = COALESCE(NULLIF($6,''), thumbnail_url),
		  promo_video_url= COALESCE(NULLIF($7,''), promo_video_url),
		  tags           = COALESCE($8, tags),
		  updated_at     = NOW()
		WHERE id = $9 AND teacher_id = $10
		RETURNING id, teacher_id, discipline_id, title, description, level, price, lesson_type,
		          total_hours, total_lessons, enrolled_count, is_published, is_validated,
		          is_featured, thumbnail_url, promo_video_url, created_at, updated_at`,
		req.Title, req.Description, req.Level, req.Price, req.TotalHours,
		req.ThumbnailURL, req.PromoVideoURL, tags, courseID, teacherID,
	).Scan(
		&course.ID, &course.TeacherID, &course.DisciplineID, &course.Title, &course.Description,
		&course.Level, &course.Price, &course.LessonType, &course.TotalHours,
		&course.TotalLessons, &course.EnrolledCount, &course.IsPublished, &course.IsValidated,
		&course.IsFeatured, &course.ThumbnailURL, &course.PromoVideoURL,
		&course.CreatedAt, &course.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return course, err
}

func (r *CourseRepository) Publish(ctx context.Context, courseID, teacherID uuid.UUID, publish bool) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE courses SET is_published = $1, updated_at = NOW() WHERE id = $2 AND teacher_id = $3`,
		publish, courseID, teacherID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CourseRepository) Validate(ctx context.Context, courseID uuid.UUID, validated bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE courses SET is_validated = $1, updated_at = NOW() WHERE id = $2`, validated, courseID,
	)
	return err
}

func (r *CourseRepository) GetByID(ctx context.Context, courseID uuid.UUID) (*models.Course, error) {
	course := &models.Course{}
	err := r.db.QueryRow(ctx, `
		SELECT id, teacher_id, discipline_id, title, COALESCE(description,''), level, price, lesson_type,
		       total_hours, total_lessons, enrolled_count, is_published, is_validated,
		       is_featured, COALESCE(thumbnail_url,''), COALESCE(promo_video_url,''), created_at, updated_at
		FROM courses WHERE id = $1`, courseID,
	).Scan(
		&course.ID, &course.TeacherID, &course.DisciplineID, &course.Title, &course.Description,
		&course.Level, &course.Price, &course.LessonType, &course.TotalHours,
		&course.TotalLessons, &course.EnrolledCount, &course.IsPublished, &course.IsValidated,
		&course.IsFeatured, &course.ThumbnailURL, &course.PromoVideoURL,
		&course.CreatedAt, &course.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return course, err
}

func (r *CourseRepository) GetByIDFull(ctx context.Context, courseID uuid.UUID) (map[string]interface{}, error) {
	var (
		id, teacherID, disciplineID uuid.UUID
		title, description, level, lessonType   string
		thumbnailURL, promoVideoURL              string
		teacherName, disciplineName              string
		price, totalHours, avgRating             float64
		totalLessons, enrolledCount              int
		reviewCount                              int64
		isPublished, isValidated, isFeatured     bool
		createdAt, updatedAt                     time.Time
	)

	err := r.db.QueryRow(ctx, `
		SELECT
		  c.id, c.teacher_id, c.discipline_id,
		  c.title, COALESCE(c.description,''), c.level, c.price, c.lesson_type,
		  c.total_hours, c.total_lessons, c.enrolled_count,
		  c.is_published, c.is_validated, c.is_featured,
		  COALESCE(c.thumbnail_url,''), COALESCE(c.promo_video_url,''),
		  c.created_at, c.updated_at,
		  tp.full_name, d.name,
		  COALESCE(AVG(f.rating)::float8, 0.0),
		  COUNT(f.id)
		FROM courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		JOIN disciplines d      ON d.id  = c.discipline_id
		LEFT JOIN feedbacks f   ON f.course_id = c.id AND f.is_visible = TRUE
		WHERE c.id = $1
		GROUP BY c.id, tp.full_name, d.name`, courseID,
	).Scan(
		&id, &teacherID, &disciplineID,
		&title, &description, &level, &price, &lessonType,
		&totalHours, &totalLessons, &enrolledCount,
		&isPublished, &isValidated, &isFeatured,
		&thumbnailURL, &promoVideoURL,
		&createdAt, &updatedAt,
		&teacherName, &disciplineName,
		&avgRating, &reviewCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":              id.String(),
		"teacher_id":      teacherID.String(),
		"discipline_id":   disciplineID.String(),
		"title":           title,
		"description":     description,
		"level":           level,
		"price":           price,
		"lesson_type":     lessonType,
		"total_hours":     totalHours,
		"total_lessons":   totalLessons,
		"enrolled_count":  enrolledCount,
		"is_published":    isPublished,
		"is_validated":    isValidated,
		"is_featured":     isFeatured,
		"thumbnail_url":   thumbnailURL,
		"promo_video_url": promoVideoURL,
		"teacher_name":    teacherName,
		"discipline_name": disciplineName,
		"avg_rating":      avgRating,
		"review_count":    reviewCount,
		"created_at":      createdAt,
		"updated_at":      updatedAt,
	}, nil
}

// ListAdmin returns ALL courses (any status) for admin management.
func (r *CourseRepository) ListAdmin(ctx context.Context, page, pageSize int) (map[string]interface{}, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}
	rows, err := r.db.Query(ctx, `
		SELECT
		  c.id, c.title, COALESCE(c.description,''), c.level, c.price, c.lesson_type,
		  c.total_hours, c.total_lessons, c.enrolled_count,
		  c.is_published, c.is_validated, c.is_featured,
		  COALESCE(c.thumbnail_url,''), c.created_at,
		  tp.full_name AS teacher_name, d.name AS discipline_name,
		  COALESCE(AVG(f.rating)::float8, 0.0) AS avg_rating,
		  COUNT(DISTINCT f.id) AS review_count,
		  COUNT(*) OVER() AS total_count
		FROM courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		JOIN disciplines d       ON d.id  = c.discipline_id
		LEFT JOIN feedbacks f    ON f.course_id = c.id AND f.is_visible = TRUE
		GROUP BY c.id, tp.full_name, d.name
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2`,
		pageSize, (page-1)*pageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []map[string]interface{}
	var total int64
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			name := string(fd.Name)
			if name == "total_count" {
				if v, ok := vals[i].(int64); ok {
					total = v
				}
				continue
			}
			row[name] = vals[i]
		}
		data = append(data, row)
	}
	return map[string]interface{}{
		"data": data, "total": total, "page": page, "page_size": pageSize,
	}, nil
}

func (r *CourseRepository) List(ctx context.Context, f models.CourseFilters) (map[string]interface{}, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 50 {
		f.PageSize = 20
	}

	conditions := []string{"c.is_published = TRUE", "c.is_validated = TRUE"}
	args := []interface{}{}
	idx := 1

	addCond := func(cond string, val interface{}) {
		conditions = append(conditions, fmt.Sprintf(cond, idx))
		args = append(args, val)
		idx++
	}

	if f.DisciplineSlug != "" {
		addCond("d.slug = $%d", f.DisciplineSlug)
	}
	if f.Level != "" {
		addCond("c.level = $%d", f.Level)
	}
	if f.LessonType != "" {
		addCond("c.lesson_type = $%d", f.LessonType)
	}
	if f.MaxPrice > 0 {
		addCond("c.price <= $%d", f.MaxPrice)
	}
	if f.TeacherID != "" {
		addCond("tp.user_id::text = $%d", f.TeacherID)
	}
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(c.title ILIKE $%d OR c.description ILIKE $%d)", idx, idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	orderMap := map[string]string{
		"price_asc":  "c.price ASC",
		"price_desc": "c.price DESC",
		"newest":     "c.created_at DESC",
		"popular":    "c.enrolled_count DESC",
		"rating":     "avg_rating DESC NULLS LAST",
	}
	orderBy, ok := orderMap[f.SortBy]
	if !ok {
		orderBy = "c.is_featured DESC, c.enrolled_count DESC"
	}

	query := fmt.Sprintf(`
		SELECT
		  c.id, c.title, c.description, c.level, c.price, c.lesson_type,
		  c.total_hours, c.total_lessons, c.enrolled_count, c.thumbnail_url,
		  c.created_at, tp.full_name as teacher_name, d.name as discipline_name,
		  COALESCE(AVG(f.rating),0) as avg_rating,
		  COUNT(*) OVER() as total_count
		FROM courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		JOIN disciplines d ON d.id = c.discipline_id
		LEFT JOIN feedbacks f ON f.course_id = c.id AND f.is_visible = TRUE
		%s
		GROUP BY c.id, tp.full_name, d.name
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, where, orderBy, idx, idx+1)

	args = append(args, f.PageSize, (f.Page-1)*f.PageSize)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []map[string]interface{}
	var total int64
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			name := string(fd.Name)
			if name == "total_count" {
				if v, ok := vals[i].(int64); ok {
					total = v
				}
				continue
			}
			row[name] = vals[i]
		}
		data = append(data, row)
	}

	return map[string]interface{}{
		"data": data, "total": total, "page": f.Page, "page_size": f.PageSize,
	}, nil
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

func (r *CourseRepository) CreateLesson(ctx context.Context, courseID uuid.UUID, req *models.CreateLessonRequest) (*models.Lesson, error) {
	resources, _ := json.Marshal(req.Resources)
	lesson := &models.Lesson{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO lessons (course_id, title, description, lesson_order, video_url,
		                     thumbnail_url, duration_minutes, is_free_preview, resources)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, course_id, title, description, lesson_order, video_url,
		          thumbnail_url, duration_minutes, is_free_preview, status, created_at`,
		courseID, req.Title, req.Description, req.LessonOrder, req.VideoURL,
		req.ThumbnailURL, req.DurationMinutes, req.IsFreePreview, resources,
	).Scan(
		&lesson.ID, &lesson.CourseID, &lesson.Title, &lesson.Description,
		&lesson.LessonOrder, &lesson.VideoURL, &lesson.ThumbnailURL,
		&lesson.DurationMinutes, &lesson.IsFreePreview, &lesson.Status, &lesson.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	r.db.Exec(ctx, `UPDATE courses SET total_lessons = total_lessons + 1, updated_at = NOW() WHERE id = $1`, courseID)
	return lesson, nil
}

func (r *CourseRepository) GetLessons(ctx context.Context, courseID uuid.UUID, isTeacher bool) ([]models.Lesson, error) {
	statusFilter := "AND l.status = 'approved'"
	if isTeacher {
		statusFilter = ""
	}
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT id, course_id, title, COALESCE(description,''), lesson_order, COALESCE(video_url,''),
		       COALESCE(thumbnail_url,''), duration_minutes, is_free_preview, status,
		       COALESCE(rejection_reason,''), created_at
		FROM lessons l
		WHERE course_id = $1 %s
		ORDER BY lesson_order ASC`, statusFilter),
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lessons []models.Lesson
	for rows.Next() {
		var l models.Lesson
		rows.Scan(&l.ID, &l.CourseID, &l.Title, &l.Description, &l.LessonOrder,
			&l.VideoURL, &l.ThumbnailURL, &l.DurationMinutes, &l.IsFreePreview,
			&l.Status, &l.RejectionReason, &l.CreatedAt)
		lessons = append(lessons, l)
	}
	return lessons, nil
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

func (r *CourseRepository) Enroll(ctx context.Context, studentProfileID, courseID uuid.UUID, packageType ...string) (*models.Enrollment, error) {
	pkg := "basic"
	price := 500.0
	if len(packageType) > 0 && packageType[0] != "" {
		pkg = packageType[0]
	}
	switch pkg {
	case "lite":
		price = 1500.0
	case "premium":
		price = 3500.0
	}

	var exists bool
	r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2)`,
		studentProfileID, courseID,
	).Scan(&exists)
	if exists {
		return nil, errors.New("já está matriculado neste curso")
	}

	enrollment := &models.Enrollment{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO enrollments (student_id, course_id, package_type, monthly_price)
		VALUES ($1, $2, $3, $4)
		RETURNING id, student_id, course_id, enrolled_at, progress_percent, status, package_type, monthly_price`,
		studentProfileID, courseID, pkg, price,
	).Scan(
		&enrollment.ID, &enrollment.StudentID, &enrollment.CourseID,
		&enrollment.EnrolledAt, &enrollment.ProgressPercent, &enrollment.Status,
		&enrollment.PackageType, &enrollment.MonthlyPrice,
	)
	if err != nil {
		return nil, err
	}
	r.db.Exec(ctx, `UPDATE courses SET enrolled_count = enrolled_count + 1 WHERE id = $1`, courseID)
	return enrollment, nil
}

// ─── Packages ─────────────────────────────────────────────────────────────────

func (r *CourseRepository) GetCoursePackages(ctx context.Context, courseID uuid.UUID) ([]models.CoursePackage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, course_id, type, name, monthly_price, COALESCE(description,''), features, is_active, created_at
		FROM course_packages WHERE course_id = $1 ORDER BY monthly_price ASC`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var pkgs []models.CoursePackage
	for rows.Next() {
		var p models.CoursePackage
		rows.Scan(&p.ID, &p.CourseID, &p.Type, &p.Name, &p.MonthlyPrice, &p.Description, &p.Features, &p.IsActive, &p.CreatedAt)
		pkgs = append(pkgs, p)
	}
	return pkgs, nil
}

// ─── Admin KPIs ───────────────────────────────────────────────────────────────

func (r *CourseRepository) GetAdminKPIs(ctx context.Context) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// Enrollments by package + MRR
	var basicCount, liteCount, premiumCount int
	var mrr float64
	r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE package_type = 'basic'),
		  COUNT(*) FILTER (WHERE package_type = 'lite'),
		  COUNT(*) FILTER (WHERE package_type = 'premium'),
		  COALESCE(SUM(monthly_price), 0)
		FROM enrollments WHERE status = 'active'
	`).Scan(&basicCount, &liteCount, &premiumCount, &mrr)

	result["mrr"] = mrr
	result["active_basic"] = basicCount
	result["active_lite"] = liteCount
	result["active_premium"] = premiumCount
	result["active_total"] = basicCount + liteCount + premiumCount

	// New enrollments this month
	var newThisMonth, newLastMonth int
	r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE enrolled_at >= DATE_TRUNC('month', NOW())),
		  COUNT(*) FILTER (WHERE enrolled_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND enrolled_at < DATE_TRUNC('month', NOW()))
		FROM enrollments
	`).Scan(&newThisMonth, &newLastMonth)
	result["new_enrollments_this_month"] = newThisMonth
	result["new_enrollments_last_month"] = newLastMonth

	// Total courses, published, validated
	var totalCourses, publishedCourses, validatedCourses int
	r.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE is_published), COUNT(*) FILTER (WHERE is_validated)
		FROM courses
	`).Scan(&totalCourses, &publishedCourses, &validatedCourses)
	result["total_courses"] = totalCourses
	result["published_courses"] = publishedCourses
	result["validated_courses"] = validatedCourses

	// Top 5 courses
	rows, err := r.db.Query(ctx, `
		SELECT c.id, c.title, c.enrolled_count, COALESCE(AVG(f.rating), 0) as avg_rating,
		       COALESCE(SUM(e.monthly_price), 0) as monthly_revenue
		FROM courses c
		LEFT JOIN feedbacks f ON f.course_id = c.id
		LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
		WHERE c.is_published = TRUE
		GROUP BY c.id
		ORDER BY c.enrolled_count DESC
		LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		var topCourses []map[string]interface{}
		for rows.Next() {
			var id uuid.UUID
			var title string
			var enrolled int
			var rating, revenue float64
			rows.Scan(&id, &title, &enrolled, &rating, &revenue)
			topCourses = append(topCourses, map[string]interface{}{
				"id": id.String(), "title": title, "enrolled": enrolled,
				"avg_rating": rating, "monthly_revenue": revenue,
			})
		}
		result["top_courses"] = topCourses
	}

	// Revenue by discipline
	drows, err := r.db.Query(ctx, `
		SELECT d.name, COUNT(e.id) as enrollments, COALESCE(SUM(e.monthly_price), 0) as revenue
		FROM enrollments e
		JOIN courses c ON c.id = e.course_id
		JOIN disciplines d ON d.id = c.discipline_id
		WHERE e.status = 'active'
		GROUP BY d.name ORDER BY revenue DESC
	`)
	if err == nil {
		defer drows.Close()
		var byDiscipline []map[string]interface{}
		for drows.Next() {
			var name string
			var enr int
			var rev float64
			drows.Scan(&name, &enr, &rev)
			byDiscipline = append(byDiscipline, map[string]interface{}{
				"discipline": name, "enrollments": enr, "revenue": rev,
			})
		}
		result["revenue_by_discipline"] = byDiscipline
	}

	return result, nil
}

func (r *CourseRepository) GetMyEnrollments(ctx context.Context, studentProfileID uuid.UUID, status string) ([]map[string]interface{}, error) {
	cond := ""
	args := []interface{}{studentProfileID}
	if status != "" {
		cond = " AND e.status = $2"
		args = append(args, status)
	}
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT e.id, e.course_id, e.enrolled_at, e.progress_percent,
		       e.last_accessed_at, e.completed_at, e.status,
		       c.title, c.thumbnail_url, c.lesson_type, c.level,
		       tp.full_name as teacher_name
		FROM enrollments e
		JOIN courses c ON c.id = e.course_id
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		WHERE e.student_id = $1 %s
		ORDER BY e.enrolled_at DESC`, cond), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	return result, nil
}

func (r *CourseRepository) UpdateLessonProgress(ctx context.Context, enrollmentID, lessonID uuid.UUID, watchedSeconds int, completed bool) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO lesson_progress (enrollment_id, lesson_id, watched_seconds, completed, completed_at)
		VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
		ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET
		  watched_seconds = GREATEST(lesson_progress.watched_seconds, $3),
		  completed       = lesson_progress.completed OR $4,
		  completed_at    = CASE WHEN $4 AND lesson_progress.completed_at IS NULL THEN NOW() ELSE lesson_progress.completed_at END,
		  updated_at      = NOW()`,
		enrollmentID, lessonID, watchedSeconds, completed,
	)
	return err
}

func (r *CourseRepository) GetEnrollmentByIDs(ctx context.Context, studentProfileID, courseID uuid.UUID) (*models.Enrollment, error) {
	e := &models.Enrollment{}
	err := r.db.QueryRow(ctx,
		`SELECT id, student_id, course_id, enrolled_at, progress_percent, status
		 FROM enrollments WHERE student_id = $1 AND course_id = $2`,
		studentProfileID, courseID,
	).Scan(&e.ID, &e.StudentID, &e.CourseID, &e.EnrolledAt, &e.ProgressPercent, &e.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return e, err
}

// ─── Live Sessions ─────────────────────────────────────────────────────────────

func (r *CourseRepository) ScheduleSession(ctx context.Context, studentProfileID uuid.UUID, req *models.ScheduleSessionRequest) (*models.LiveSession, error) {
	teacherID, _ := uuid.Parse(req.TeacherID)
	roomID := "room_" + uuid.New().String()[:8]

	var courseID *uuid.UUID
	if req.CourseID != "" {
		id, _ := uuid.Parse(req.CourseID)
		courseID = &id
	}

	session := &models.LiveSession{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO live_sessions (teacher_id, course_id, student_id, scheduled_at, duration_minutes, room_id)
		VALUES ($1, $2, $3, $4::TIMESTAMPTZ, $5, $6)
		RETURNING id, teacher_id, course_id, student_id, scheduled_at, duration_minutes,
		          status, room_id, created_at`,
		teacherID, courseID, studentProfileID, req.ScheduledAt, req.DurationMinutes, roomID,
	).Scan(
		&session.ID, &session.TeacherID, &session.CourseID, &session.StudentID,
		&session.ScheduledAt, &session.DurationMinutes, &session.Status,
		&session.RoomID, &session.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	session.JoinURL = fmt.Sprintf("%s/live/%s", getEnv("FRONTEND_URL", "http://localhost:3000"), session.RoomID)
	return session, nil
}

func (r *CourseRepository) GetMySessions(ctx context.Context, profileID uuid.UUID, role, status string) ([]map[string]interface{}, error) {
	filterCol := "ls.student_id"
	if role == "teacher" {
		filterCol = "ls.teacher_id"
	}

	cond := ""
	args := []interface{}{profileID}
	if status != "" {
		cond = " AND ls.status = $2"
		args = append(args, status)
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT ls.id, ls.scheduled_at, ls.duration_minutes, ls.status, ls.room_id,
		       ls.recording_url, ls.created_at,
		       tp.full_name as teacher_name,
		       sp.full_name as student_name,
		       c.title as course_title
		FROM live_sessions ls
		JOIN teacher_profiles tp ON tp.id = ls.teacher_id
		JOIN student_profiles sp ON sp.id = ls.student_id
		LEFT JOIN courses c ON c.id = ls.course_id
		WHERE %s = $1 %s
		ORDER BY ls.scheduled_at DESC LIMIT 50`, filterCol, cond), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	return result, nil
}

func (r *CourseRepository) CancelSession(ctx context.Context, sessionID, profileID uuid.UUID, role, reason string) error {
	filterCol := "student_id"
	if role == "teacher" {
		filterCol = "teacher_id"
	}
	tag, err := r.db.Exec(ctx, fmt.Sprintf(`
		UPDATE live_sessions SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
		WHERE id = $2 AND %s = $3 AND status = 'scheduled'`, filterCol),
		reason, sessionID, profileID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

func (r *CourseRepository) CreateFeedback(ctx context.Context, studentProfileID uuid.UUID, req *models.CreateFeedbackRequest) (*models.Feedback, error) {
	teacherID, _ := uuid.Parse(req.TeacherID)

	var courseID *uuid.UUID
	if req.CourseID != "" {
		id, _ := uuid.Parse(req.CourseID)
		courseID = &id
	}
	var sessionID *uuid.UUID
	if req.LiveSessionID != "" {
		id, _ := uuid.Parse(req.LiveSessionID)
		sessionID = &id
	}

	feedback := &models.Feedback{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO feedbacks (student_id, teacher_id, course_id, live_session_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, student_id, teacher_id, course_id, live_session_id,
		          rating, comment, is_visible, flagged_for_review, created_at`,
		studentProfileID, teacherID, courseID, sessionID, req.Rating, req.Comment,
	).Scan(
		&feedback.ID, &feedback.StudentID, &feedback.TeacherID, &feedback.CourseID,
		&feedback.LiveSessionID, &feedback.Rating, &feedback.Comment,
		&feedback.IsVisible, &feedback.FlaggedForReview, &feedback.CreatedAt,
	)
	return feedback, err
}

func (r *CourseRepository) GetTeacherFeedbacks(ctx context.Context, teacherID uuid.UUID, page, pageSize int) (map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT f.id, f.rating, f.comment, f.teacher_response, f.created_at,
		       sp.full_name as student_name,
		       COUNT(*) OVER() as total
		FROM feedbacks f
		JOIN student_profiles sp ON sp.id = f.student_id
		WHERE f.teacher_id = $1 AND f.is_visible = TRUE
		ORDER BY f.created_at DESC
		LIMIT $2 OFFSET $3`,
		teacherID, pageSize, (page-1)*pageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []map[string]interface{}
	var total int64
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			if string(fd.Name) == "total" {
				if v, ok := vals[i].(int64); ok {
					total = v
				}
				continue
			}
			row[string(fd.Name)] = vals[i]
		}
		data = append(data, row)
	}
	return map[string]interface{}{"data": data, "total": total, "page": page, "page_size": pageSize}, nil
}

func (r *CourseRepository) RespondToFeedback(ctx context.Context, feedbackID, teacherProfileID uuid.UUID, response string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE feedbacks SET teacher_response = $1, teacher_response_at = NOW()
		WHERE id = $2 AND teacher_id = $3`,
		response, feedbackID, teacherProfileID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CourseRepository) FlagFeedback(ctx context.Context, feedbackID uuid.UUID, flag bool, reason string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE feedbacks SET flagged_for_review = $1, flagged_reason = $2 WHERE id = $3`,
		flag, reason, feedbackID,
	)
	return err
}

func (r *CourseRepository) HideFeedback(ctx context.Context, feedbackID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE feedbacks SET is_visible = FALSE WHERE id = $1`, feedbackID,
	)
	return err
}

// ─── Teacher-specific queries ─────────────────────────────────────────────────

func (r *CourseRepository) ListMyCoursesAll(ctx context.Context, teacherID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id::text, c.title, c.level, c.lesson_type, c.is_published, c.is_validated,
		       c.total_lessons, c.enrolled_count, c.thumbnail_url, c.created_at,
		       d.name as discipline,
		       COALESCE(SUM(e.monthly_price) FILTER(WHERE e.status='active'), 0) as monthly_revenue
		FROM courses c
		JOIN disciplines d ON d.id = c.discipline_id
		LEFT JOIN enrollments e ON e.course_id = c.id
		WHERE c.teacher_id = $1
		GROUP BY c.id, d.name
		ORDER BY c.created_at DESC
	`, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

func (r *CourseRepository) GetCourseStudents(ctx context.Context, courseID, teacherID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT sp.id::text as student_id, sp.full_name, u.email,
		       e.id::text as enrollment_id, e.package_type, e.monthly_price, e.status, e.enrolled_at,
		       COALESCE(
		         ROUND((COUNT(lp.id) FILTER(WHERE lp.completed) * 100.0 / NULLIF(c.total_lessons, 0))::numeric)
		       , 0) as progress_pct,
		       COUNT(lp.id) FILTER(WHERE lp.completed) as lessons_completed,
		       c.total_lessons
		FROM enrollments e
		JOIN student_profiles sp ON sp.id = e.student_id
		JOIN users u ON u.id = sp.user_id
		JOIN courses c ON c.id = e.course_id
		LEFT JOIN lesson_progress lp ON lp.enrollment_id = e.id
		WHERE e.course_id = $1 AND c.teacher_id = $2
		GROUP BY sp.id, sp.full_name, u.email, e.id, e.package_type, e.monthly_price, e.status, e.enrolled_at, c.total_lessons
		ORDER BY e.enrolled_at DESC
	`, courseID, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

func (r *CourseRepository) GetAllTeacherStudents(ctx context.Context, teacherUserID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT sp.id::text as student_id, sp.full_name, u.email,
		       c.id::text as course_id, c.title as course_title, c.level,
		       e.id::text as enrollment_id, e.package_type, e.monthly_price, e.status, e.enrolled_at,
		       COALESCE(
		         ROUND((COUNT(lp.id) FILTER(WHERE lp.completed) * 100.0 / NULLIF(c.total_lessons, 0))::numeric)
		       , 0) as progress_pct,
		       COUNT(lp.id) FILTER(WHERE lp.completed) as lessons_completed,
		       c.total_lessons
		FROM courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		JOIN enrollments e ON e.course_id = c.id
		JOIN student_profiles sp ON sp.id = e.student_id
		JOIN users u ON u.id = sp.user_id
		LEFT JOIN lesson_progress lp ON lp.enrollment_id = e.id
		WHERE tp.user_id = $1
		GROUP BY sp.id, sp.full_name, u.email, c.id, c.title, c.level,
		         e.id, e.package_type, e.monthly_price, e.status, e.enrolled_at, c.total_lessons
		ORDER BY e.enrolled_at DESC
	`, teacherUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

func (r *CourseRepository) GetTeacherEarningsDetail(ctx context.Context, teacherID uuid.UUID) (map[string]interface{}, error) {
	// Per-course breakdown
	rows, err := r.db.Query(ctx, `
		SELECT c.id::text, c.title, c.level,
		       COUNT(e.id) FILTER(WHERE e.status='active') as active_enrollments,
		       COALESCE(SUM(e.monthly_price) FILTER(WHERE e.status='active'), 0) as monthly_revenue,
		       COALESCE(SUM(e.monthly_price * 0.7) FILTER(WHERE e.status='active'), 0) as teacher_share
		FROM courses c
		LEFT JOIN enrollments e ON e.course_id = c.id
		WHERE c.teacher_id = $1
		GROUP BY c.id, c.title, c.level
		ORDER BY monthly_revenue DESC
	`, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		courses = append(courses, row)
	}
	if courses == nil {
		courses = []map[string]interface{}{}
	}

	// Totals
	var totalMRR, totalTeacherShare float64
	var totalStudents int
	r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(e.monthly_price), 0),
		       COALESCE(SUM(e.monthly_price * 0.7), 0),
		       COUNT(DISTINCT e.student_id)
		FROM enrollments e
		JOIN courses c ON c.id = e.course_id
		WHERE c.teacher_id = $1 AND e.status = 'active'
	`, teacherID).Scan(&totalMRR, &totalTeacherShare, &totalStudents)

	return map[string]interface{}{
		"courses":             courses,
		"total_mrr":           totalMRR,
		"total_teacher_share": totalTeacherShare,
		"total_students":      totalStudents,
		"commission_rate":     70,
	}, nil
}

func (r *CourseRepository) GetCourseEnrolledStudentIDs(ctx context.Context, courseID, teacherID uuid.UUID) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id::text
		FROM enrollments e
		JOIN student_profiles sp ON sp.id = e.student_id
		JOIN users u ON u.id = sp.user_id
		JOIN courses c ON c.id = e.course_id
		WHERE e.course_id = $1 AND c.teacher_id = $2 AND e.status = 'active'
	`, courseID, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *CourseRepository) ScheduleSessionByTeacher(ctx context.Context, teacherID uuid.UUID, courseID uuid.UUID, studentProfileID uuid.UUID, scheduledAt time.Time, durationMinutes int, sessionType string) (map[string]interface{}, error) {
	roomID := uuid.New().String()
	var id uuid.UUID
	var createdAt time.Time
	err := r.db.QueryRow(ctx, `
		INSERT INTO live_sessions (teacher_id, course_id, student_id, scheduled_at, duration_minutes, room_id, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
		RETURNING id, created_at
	`, teacherID, courseID, studentProfileID, scheduledAt, durationMinutes, roomID).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":               id,
		"room_id":          roomID,
		"scheduled_at":     scheduledAt,
		"duration_minutes": durationMinutes,
		"status":           "scheduled",
		"created_at":       createdAt,
	}, nil
}

// ─── Disciplines ─────────────────────────────────────────────────────────────

func (r *CourseRepository) GetDisciplines(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `SELECT id::text, name, slug FROM disciplines ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

// ─── Lesson management ───────────────────────────────────────────────────────

func (r *CourseRepository) UpdateLesson(ctx context.Context, lessonID, courseID, teacherID uuid.UUID, title, description, lessonType, videoURL string, durationMinutes, order int) (map[string]interface{}, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `
		UPDATE lessons l SET
			title            = COALESCE(NULLIF($1,''), title),
			description      = COALESCE(NULLIF($2,''), description),
			lesson_type      = COALESCE(NULLIF($3,''), lesson_type),
			video_url        = CASE WHEN $4 = '' THEN video_url ELSE $4 END,
			duration_minutes = CASE WHEN $5 = 0 THEN duration_minutes ELSE $5 END,
			lesson_order     = CASE WHEN $6 = 0 THEN lesson_order ELSE $6 END
		FROM courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		WHERE l.id = $7 AND l.course_id = $8 AND c.id = $8 AND tp.user_id = $9
		RETURNING l.id
	`, title, description, lessonType, videoURL, durationMinutes, order, lessonID, courseID, teacherID).Scan(&id)
	if err != nil {
		return nil, err
	}
	row := map[string]interface{}{
		"id":               id.String(),
		"title":            title,
		"description":      description,
		"lesson_type":      lessonType,
		"video_url":        videoURL,
		"duration_minutes": durationMinutes,
		"lesson_order":     order,
	}
	return row, nil
}

func (r *CourseRepository) DeleteLesson(ctx context.Context, lessonID, courseID, teacherUserID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM lessons l
		USING courses c
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		WHERE l.id = $1 AND l.course_id = $2 AND c.id = $2 AND tp.user_id = $3
	`, lessonID, courseID, teacherUserID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrForbidden
	}
	return nil
}

// ─── Notification logs ───────────────────────────────────────────────────────

func (r *CourseRepository) EnsureNotificationLogsTable(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS teacher_notification_logs (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			teacher_id  UUID NOT NULL,
			course_id   UUID,
			title       TEXT NOT NULL,
			message     TEXT NOT NULL,
			type        TEXT DEFAULT 'info',
			sent_to     INT  DEFAULT 0,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func (r *CourseRepository) LogNotification(ctx context.Context, teacherID, courseID uuid.UUID, title, message, notifType string, sentTo int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO teacher_notification_logs (teacher_id, course_id, title, message, type, sent_to)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, teacherID, courseID, title, message, notifType, sentTo)
	return err
}

func (r *CourseRepository) GetNotificationLogs(ctx context.Context, teacherUserID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT n.id::text, n.title, n.message, n.type, n.sent_to, n.created_at,
		       COALESCE(c.title, '') as course_title, COALESCE(n.course_id::text, '') as course_id
		FROM teacher_notification_logs n
		JOIN teacher_profiles tp ON tp.id = n.teacher_id
		LEFT JOIN courses c ON c.id = n.course_id
		WHERE tp.user_id = $1
		ORDER BY n.created_at DESC
		LIMIT 50
	`, teacherUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

// ─── Direct student message ──────────────────────────────────────────────────

func (r *CourseRepository) GetStudentUserIDByProfileID(ctx context.Context, studentProfileID uuid.UUID) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx, `SELECT user_id FROM student_profiles WHERE id = $1`, studentProfileID).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return userID, err
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func parseInt(s string) int {
	v, _ := strconv.Atoi(s)
	if v < 1 {
		return 1
	}
	return v
}
