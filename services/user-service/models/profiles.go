package models

import (
	"time"

	"github.com/google/uuid"
)

type StudentProfile struct {
	ID                uuid.UUID              `json:"id"`
	UserID            uuid.UUID              `json:"user_id"`
	FullName          string                 `json:"full_name"`
	DateOfBirth       *time.Time             `json:"date_of_birth,omitempty"`
	ProficiencyLevel  string                 `json:"proficiency_level"`
	LearningGoals     string                 `json:"learning_goals,omitempty"`
	DiagnosticAnswers map[string]interface{} `json:"diagnostic_answers,omitempty"`
	AvatarURL         string                 `json:"avatar_url,omitempty"`
	ParentID          *uuid.UUID             `json:"parent_id,omitempty"`
	Timezone          string                 `json:"timezone"`
	PreferredLanguage string                 `json:"preferred_language"`
	CreatedAt         time.Time              `json:"created_at"`
}

type CreateStudentProfileRequest struct {
	FullName         string     `json:"full_name" validate:"required,min=2,max=255"`
	DateOfBirth      *time.Time `json:"date_of_birth"`
	ProficiencyLevel string     `json:"proficiency_level" validate:"omitempty,oneof=beginner intermediate advanced"`
	LearningGoals    string     `json:"learning_goals"`
	Timezone         string     `json:"timezone"`
}

type UpdateStudentProfileRequest struct {
	FullName         string     `json:"full_name" validate:"omitempty,min=2,max=255"`
	DateOfBirth      *time.Time `json:"date_of_birth"`
	ProficiencyLevel string     `json:"proficiency_level" validate:"omitempty,oneof=beginner intermediate advanced"`
	LearningGoals    string     `json:"learning_goals"`
	AvatarURL        string     `json:"avatar_url"`
	Timezone         string     `json:"timezone"`
}

type TeacherProfile struct {
	ID                   uuid.UUID   `json:"id"`
	UserID               uuid.UUID   `json:"user_id"`
	FullName             string      `json:"full_name"`
	Bio                  string      `json:"bio,omitempty"`
	PresentationVideoURL string      `json:"presentation_video_url,omitempty"`
	CVURL                string      `json:"cv_url,omitempty"`
	Credentials          interface{} `json:"credentials,omitempty"`
	Rating               float64     `json:"rating"`
	TotalReviews         int         `json:"total_reviews"`
	TotalStudents        int         `json:"total_students"`
	TotalHoursTaught     float64     `json:"total_hours_taught"`
	IsValidated          bool        `json:"is_validated"`
	IsFeatured           bool        `json:"is_featured"`
	CommissionRate       float64     `json:"commission_rate,omitempty"`
	Timezone             string      `json:"timezone"`
	Languages            interface{} `json:"languages,omitempty"`
	Disciplines          interface{} `json:"disciplines,omitempty"`
	Availability         interface{} `json:"availability,omitempty"`
	CreatedAt            time.Time   `json:"created_at"`
}

type CreateTeacherProfileRequest struct {
	FullName             string      `json:"full_name" validate:"required,min=2,max=255"`
	Bio                  string      `json:"bio"`
	PresentationVideoURL string      `json:"presentation_video_url"`
	CVURL                string      `json:"cv_url"`
	Credentials          interface{} `json:"credentials"`
	Timezone             string      `json:"timezone"`
	Languages            interface{} `json:"languages"`
}

type UpdateTeacherProfileRequest struct {
	FullName             string      `json:"full_name" validate:"omitempty,min=2,max=255"`
	Bio                  string      `json:"bio"`
	PresentationVideoURL string      `json:"presentation_video_url"`
	CVURL                string      `json:"cv_url"`
	Credentials          interface{} `json:"credentials"`
	Timezone             string      `json:"timezone"`
	Languages            interface{} `json:"languages"`
}

type AvailabilitySlot struct {
	DayOfWeek int    `json:"day_of_week" validate:"min=0,max=6"`
	StartTime string `json:"start_time" validate:"required"`
	EndTime   string `json:"end_time" validate:"required"`
	Timezone  string `json:"timezone"`
}

type StudentDashboard struct {
	Profile          *StudentProfile `json:"profile"`
	EnrolledCourses  int             `json:"enrolled_courses"`
	CompletedCourses int             `json:"completed_courses"`
	UpcomingSessions interface{}     `json:"upcoming_sessions"`
	RecentProgress   interface{}     `json:"recent_progress"`
	TotalHoursStudied float64        `json:"total_hours_studied"`
}

type TeacherDashboard struct {
	Profile          *TeacherProfile `json:"profile"`
	EarningsThisMonth float64        `json:"earnings_this_month"`
	EarningsTotal     float64        `json:"earnings_total"`
	TotalStudents     int            `json:"total_students"`
	UpcomingSessions  interface{}    `json:"upcoming_sessions"`
	RecentFeedbacks   interface{}    `json:"recent_feedbacks"`
	PublishedCourses  int            `json:"published_courses"`
}
