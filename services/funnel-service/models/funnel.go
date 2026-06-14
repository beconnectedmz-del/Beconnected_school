package models

import (
	"time"

	"github.com/google/uuid"
)

// ─── Lead ─────────────────────────────────────────────────────────────────────

type Lead struct {
	ID                 uuid.UUID  `json:"id"`
	Email              string     `json:"email,omitempty"`
	Name               string     `json:"name,omitempty"`
	Phone              string     `json:"phone,omitempty"`
	InterestDiscipline string     `json:"interest_discipline,omitempty"`
	InterestLevel      string     `json:"interest_level,omitempty"`
	Source             string     `json:"source"`
	AffiliateCode      string     `json:"affiliate_code,omitempty"`
	UTMSource          string     `json:"utm_source,omitempty"`
	UTMMedium          string     `json:"utm_medium,omitempty"`
	UTMCampaign        string     `json:"utm_campaign,omitempty"`
	Status             string     `json:"status"`
	ConvertedUserID    *uuid.UUID `json:"converted_user_id,omitempty"`
	ConvertedAt        *time.Time `json:"converted_at,omitempty"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

type CreateLeadRequest struct {
	Email              string `json:"email" validate:"omitempty,email"`
	Name               string `json:"name"`
	Phone              string `json:"phone"`
	InterestDiscipline string `json:"interest_discipline"`
	InterestLevel      string `json:"interest_level" validate:"omitempty,oneof=beginner intermediate advanced"`
	AffiliateCode      string `json:"affiliate_code"`
	UTMSource          string `json:"utm_source"`
	UTMMedium          string `json:"utm_medium"`
	UTMCampaign        string `json:"utm_campaign"`
}

type UpdateLeadRequest struct {
	Status string `json:"status" validate:"required,oneof=new contacted qualified converted lost unsubscribed"`
	Notes  string `json:"notes"`
}

// ─── Affiliate ────────────────────────────────────────────────────────────────

type Affiliate struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	AffiliateCode    string     `json:"affiliate_code"`
	CommissionRate   float64    `json:"commission_rate"`
	TotalEarned      float64    `json:"total_earned"`
	TotalConversions int        `json:"total_conversions"`
	TotalClicks      int        `json:"total_clicks"`
	PayoutMethod     string     `json:"payout_method,omitempty"`
	IsActive         bool       `json:"is_active"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type RegisterAffiliateRequest struct {
	PayoutMethod  string `json:"payout_method" validate:"required"`
	PayoutDetails string `json:"payout_details"`
}

type AffiliateDashboard struct {
	Affiliate        *Affiliate          `json:"affiliate"`
	EarningsThisMonth float64            `json:"earnings_this_month"`
	PendingPayouts    float64            `json:"pending_payouts"`
	RecentConversions []map[string]interface{} `json:"recent_conversions"`
	ClicksThisMonth   int                `json:"clicks_this_month"`
	ConversionRate    float64            `json:"conversion_rate"`
}

type AffiliateReport struct {
	Period           string                   `json:"period"`
	TotalClicks      int                      `json:"total_clicks"`
	TotalLeads       int                      `json:"total_leads"`
	TotalConversions int                      `json:"total_conversions"`
	TotalEarned      float64                  `json:"total_earned"`
	ConversionRate   float64                  `json:"conversion_rate"`
	TopDisciplines   []map[string]interface{} `json:"top_disciplines"`
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

type Campaign struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Type            string     `json:"type"`
	Status          string     `json:"status"`
	TargetSegment   string     `json:"target_segment"`
	Subject         string     `json:"subject,omitempty"`
	Content         string     `json:"content,omitempty"`
	DiscountPercent int        `json:"discount_percent"`
	PromoCode       string     `json:"promo_code,omitempty"`
	TargetCourseID  *uuid.UUID `json:"target_course_id,omitempty"`
	ScheduledAt     *time.Time `json:"scheduled_at,omitempty"`
	LaunchedAt      *time.Time `json:"launched_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	TargetCount     int        `json:"target_count"`
	SentCount       int        `json:"sent_count"`
	OpenedCount     int        `json:"opened_count"`
	ClickedCount    int        `json:"clicked_count"`
	ConvertedCount  int        `json:"converted_count"`
	CreatedAt       time.Time  `json:"created_at"`
}

type CreateCampaignRequest struct {
	Name            string `json:"name" validate:"required,min=3,max=255"`
	Type            string `json:"type" validate:"required,oneof=email push in_app sms"`
	TargetSegment   string `json:"target_segment"`
	Subject         string `json:"subject"`
	Content         string `json:"content"`
	DiscountPercent int    `json:"discount_percent"`
	PromoCode       string `json:"promo_code"`
	TargetCourseID  string `json:"target_course_id"`
	ScheduledAt     string `json:"scheduled_at"`
}

// ─── Segment ──────────────────────────────────────────────────────────────────

type Segment struct {
	ID             uuid.UUID   `json:"id"`
	Name           string      `json:"name"`
	Description    string      `json:"description,omitempty"`
	Criteria       interface{} `json:"criteria"`
	MemberCount    int         `json:"member_count"`
	LastComputedAt *time.Time  `json:"last_computed_at,omitempty"`
	IsSystem       bool        `json:"is_system"`
	CreatedAt      time.Time   `json:"created_at"`
}
