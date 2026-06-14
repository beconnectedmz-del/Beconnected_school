package models

import (
	"time"

	"github.com/google/uuid"
)

// ─── Course ────────────────────────────────────────────────────────────────────

type Course struct {
	ID             uuid.UUID  `json:"id"`
	TeacherID      uuid.UUID  `json:"teacher_id"`
	DisciplineID   uuid.UUID  `json:"discipline_id"`
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	Level          string     `json:"level"`
	Price          float64    `json:"price"`
	LessonType     string     `json:"lesson_type"`
	TotalHours     float64    `json:"total_hours"`
	TotalLessons   int        `json:"total_lessons"`
	EnrolledCount  int        `json:"enrolled_count"`
	IsPublished    bool       `json:"is_published"`
	IsValidated    bool       `json:"is_validated"`
	IsFeatured     bool       `json:"is_featured"`
	ThumbnailURL   string     `json:"thumbnail_url,omitempty"`
	PromoVideoURL  string     `json:"promo_video_url,omitempty"`
	Tags           interface{} `json:"tags,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type CreateCourseRequest struct {
	DisciplineID  string  `json:"discipline_id" validate:"required,uuid"`
	Title         string  `json:"title" validate:"required,min=5,max=255"`
	Description   string  `json:"description"`
	Level         string  `json:"level" validate:"required,oneof=beginner intermediate advanced"`
	Price         float64 `json:"price" validate:"required,gte=0"`
	LessonType    string  `json:"lesson_type" validate:"required,oneof=live recorded hybrid"`
	TotalHours    float64 `json:"total_hours"`
	ThumbnailURL  string  `json:"thumbnail_url"`
	PromoVideoURL string  `json:"promo_video_url"`
	Tags          []string `json:"tags"`
}

type UpdateCourseRequest struct {
	Title         string   `json:"title" validate:"omitempty,min=5,max=255"`
	Description   string   `json:"description"`
	Level         string   `json:"level" validate:"omitempty,oneof=beginner intermediate advanced"`
	Price         *float64 `json:"price" validate:"omitempty,gte=0"`
	TotalHours    *float64 `json:"total_hours"`
	ThumbnailURL  string   `json:"thumbnail_url"`
	PromoVideoURL string   `json:"promo_video_url"`
	Tags          []string `json:"tags"`
}

type CourseFilters struct {
	DisciplineSlug string
	Level          string
	LessonType     string
	MinPrice       float64
	MaxPrice       float64
	IsValidated    bool
	TeacherID      string
	Search         string
	Page           int
	PageSize       int
	SortBy         string
}

// ─── Lesson ────────────────────────────────────────────────────────────────────

type Lesson struct {
	ID             uuid.UUID `json:"id"`
	CourseID       uuid.UUID `json:"course_id"`
	Title          string    `json:"title"`
	Description    string    `json:"description,omitempty"`
	LessonOrder    int       `json:"lesson_order"`
	VideoURL       string    `json:"video_url,omitempty"`
	ThumbnailURL   string    `json:"thumbnail_url,omitempty"`
	DurationMinutes int      `json:"duration_minutes"`
	IsFreePreview  bool      `json:"is_free_preview"`
	Status         string    `json:"status"`
	RejectionReason string   `json:"rejection_reason,omitempty"`
	Resources      interface{} `json:"resources,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateLessonRequest struct {
	Title           string      `json:"title" validate:"required,min=3,max=255"`
	Description     string      `json:"description"`
	LessonOrder     int         `json:"lesson_order" validate:"required,gte=1"`
	VideoURL        string      `json:"video_url"`
	ThumbnailURL    string      `json:"thumbnail_url"`
	DurationMinutes int         `json:"duration_minutes"`
	IsFreePreview   bool        `json:"is_free_preview"`
	Resources       interface{} `json:"resources"`
}

// ─── Enrollment ────────────────────────────────────────────────────────────────

type Enrollment struct {
	ID              uuid.UUID  `json:"id"`
	StudentID       uuid.UUID  `json:"student_id"`
	CourseID        uuid.UUID  `json:"course_id"`
	EnrolledAt      time.Time  `json:"enrolled_at"`
	ProgressPercent float64    `json:"progress_percent"`
	LastAccessedAt  *time.Time `json:"last_accessed_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	Status          string     `json:"status"`
	CertificateURL  string     `json:"certificate_url,omitempty"`
	PackageType     string     `json:"package_type,omitempty"`
	MonthlyPrice    float64    `json:"monthly_price,omitempty"`
	Course          *Course    `json:"course,omitempty"`
}

type LessonProgress struct {
	EnrollmentID   uuid.UUID  `json:"enrollment_id"`
	LessonID       uuid.UUID  `json:"lesson_id"`
	WatchedSeconds int        `json:"watched_seconds"`
	Completed      bool       `json:"completed"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
}

// ─── Live Session ──────────────────────────────────────────────────────────────

type LiveSession struct {
	ID              uuid.UUID  `json:"id"`
	TeacherID       uuid.UUID  `json:"teacher_id"`
	CourseID        *uuid.UUID `json:"course_id,omitempty"`
	StudentID       uuid.UUID  `json:"student_id"`
	ScheduledAt     time.Time  `json:"scheduled_at"`
	DurationMinutes int        `json:"duration_minutes"`
	Status          string     `json:"status"`
	RoomID          string     `json:"room_id,omitempty"`
	RecordingURL    string     `json:"recording_url,omitempty"`
	JoinURL         string     `json:"join_url,omitempty"`
	CancellationReason string  `json:"cancellation_reason,omitempty"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type ScheduleSessionRequest struct {
	TeacherID       string  `json:"teacher_id" validate:"required,uuid"`
	CourseID        string  `json:"course_id"`
	ScheduledAt     string  `json:"scheduled_at" validate:"required"`
	DurationMinutes int     `json:"duration_minutes" validate:"required,min=30,max=180"`
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

type Feedback struct {
	ID              uuid.UUID  `json:"id"`
	StudentID       uuid.UUID  `json:"student_id"`
	TeacherID       uuid.UUID  `json:"teacher_id"`
	CourseID        *uuid.UUID `json:"course_id,omitempty"`
	LiveSessionID   *uuid.UUID `json:"live_session_id,omitempty"`
	Rating          int        `json:"rating"`
	Comment         string     `json:"comment,omitempty"`
	TeacherResponse string     `json:"teacher_response,omitempty"`
	IsVisible       bool       `json:"is_visible"`
	FlaggedForReview bool      `json:"flagged_for_review"`
	CreatedAt       time.Time  `json:"created_at"`
}

type CreateFeedbackRequest struct {
	TeacherID     string `json:"teacher_id" validate:"required,uuid"`
	CourseID      string `json:"course_id"`
	LiveSessionID string `json:"live_session_id"`
	Rating        int    `json:"rating" validate:"required,min=1,max=5"`
	Comment       string `json:"comment" validate:"max=2000"`
}

// ─── Package ──────────────────────────────────────────────────────────────────

type CoursePackage struct {
	ID           uuid.UUID   `json:"id"`
	CourseID     uuid.UUID   `json:"course_id"`
	Type         string      `json:"type"`
	Name         string      `json:"name"`
	MonthlyPrice float64     `json:"monthly_price"`
	Description  string      `json:"description,omitempty"`
	Features     interface{} `json:"features,omitempty"`
	IsActive     bool        `json:"is_active"`
	CreatedAt    time.Time   `json:"created_at"`
}

type UpdatePackageRequest struct {
	Description string      `json:"description"`
	Features    interface{} `json:"features"`
	IsActive    bool        `json:"is_active"`
}
