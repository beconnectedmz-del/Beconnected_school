package models

import (
	"time"

	"github.com/google/uuid"
)

type Transaction struct {
	ID             uuid.UUID  `json:"id"`
	StudentID      uuid.UUID  `json:"student_id"`
	CourseID       *uuid.UUID `json:"course_id,omitempty"`
	LiveSessionID  *uuid.UUID `json:"live_session_id,omitempty"`
	GrossAmount    float64    `json:"gross_amount"`
	TeacherAmount  float64    `json:"teacher_amount"`
	PlatformAmount float64    `json:"platform_amount"`
	SellerAmount   float64    `json:"seller_amount"`
	SellerID       *uuid.UUID `json:"seller_id,omitempty"`
	Currency       string     `json:"currency"`
	PaymentMethod  string     `json:"payment_method"`
	PaymentGateway string     `json:"payment_gateway,omitempty"`
	GatewayTxID    string     `json:"gateway_tx_id,omitempty"`
	PaymentStatus  string     `json:"payment_status"`
	PaidAt         *time.Time `json:"paid_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type Payout struct {
	ID           uuid.UUID  `json:"id"`
	RecipientID  uuid.UUID  `json:"recipient_id"`
	Amount       float64    `json:"amount"`
	Currency     string     `json:"currency"`
	PeriodStart  *time.Time `json:"period_start,omitempty"`
	PeriodEnd    *time.Time `json:"period_end,omitempty"`
	PayoutMethod string     `json:"payout_method"`
	Status       string     `json:"status"`
	ProcessedBy  *uuid.UUID `json:"processed_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type CheckoutRequest struct {
	CourseID      string  `json:"course_id"`
	LiveSessionID string  `json:"live_session_id"`
	GrossAmount   float64 `json:"gross_amount" validate:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" validate:"required"`
	AffiliateCode string  `json:"affiliate_code"`
	CustomerPhone string  `json:"customer_phone"`
}

type EarningsReport struct {
	TeacherID      string             `json:"teacher_id"`
	Period         string             `json:"period"`
	TotalEarned    float64            `json:"total_earned"`
	PendingPayout  float64            `json:"pending_payout"`
	PaidOut        float64            `json:"paid_out"`
	TransactionCount int              `json:"transaction_count"`
	Breakdown      []EarningBreakdown `json:"breakdown"`
}

type EarningBreakdown struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Count  int     `json:"count"`
}

type FinancialReport struct {
	Period          string  `json:"period"`
	TotalRevenue    float64 `json:"total_revenue"`
	TeacherPayouts  float64 `json:"teacher_payouts"`
	PlatformRevenue float64 `json:"platform_revenue"`
	AffiliatePayouts float64 `json:"affiliate_payouts"`
	TransactionCount int    `json:"transaction_count"`
	RefundCount      int    `json:"refund_count"`
}
