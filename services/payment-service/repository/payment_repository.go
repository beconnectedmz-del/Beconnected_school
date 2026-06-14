package repository

import (
	"context"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/payment-service/models"
)

type PaymentRepository struct {
	db *pgxpool.Pool
}

func NewPaymentRepository(db *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) CreateTransaction(ctx context.Context, tx *models.Transaction) (*models.Transaction, error) {
	// Transacção atómica: nunca actualizar saldos sem garantia ACID
	dbTx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer dbTx.Rollback(ctx)

	created := &models.Transaction{}
	err = dbTx.QueryRow(ctx,
		`INSERT INTO transactions
		   (student_id, course_id, live_session_id, gross_amount, teacher_amount, platform_amount,
		    seller_amount, seller_id, currency, payment_method, payment_status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
		 RETURNING id, student_id, course_id, gross_amount, teacher_amount, platform_amount,
		           seller_amount, currency, payment_method, payment_status, created_at`,
		tx.StudentID, tx.CourseID, tx.LiveSessionID,
		tx.GrossAmount, tx.TeacherAmount, tx.PlatformAmount,
		tx.SellerAmount, tx.SellerID, tx.Currency, tx.PaymentMethod,
	).Scan(
		&created.ID, &created.StudentID, &created.CourseID,
		&created.GrossAmount, &created.TeacherAmount, &created.PlatformAmount,
		&created.SellerAmount, &created.Currency, &created.PaymentMethod,
		&created.PaymentStatus, &created.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := dbTx.Commit(ctx); err != nil {
		return nil, err
	}

	return created, nil
}

func (r *PaymentRepository) ConfirmPayment(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE transactions SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`, id,
	)
	return err
}

func (r *PaymentRepository) FailPayment(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE transactions SET payment_status = 'failed', updated_at = NOW() WHERE id = $1`, id,
	)
	return err
}

func (r *PaymentRepository) UpdateGatewayTxID(ctx context.Context, id uuid.UUID, gatewayTxID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE transactions SET gateway_tx_id = $2, updated_at = NOW() WHERE id = $1`, id, gatewayTxID,
	)
	return err
}

func (r *PaymentRepository) FindAffiliateUserID(ctx context.Context, code string) (*uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx,
		`SELECT user_id FROM affiliates WHERE affiliate_code = $1 AND is_active = TRUE`, code,
	).Scan(&userID)
	if err != nil {
		return nil, err
	}
	return &userID, nil
}

func (r *PaymentRepository) GetStudentTransactions(ctx context.Context, studentID uuid.UUID, page, pageSize int) (map[string]interface{}, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, course_id, gross_amount, teacher_amount, platform_amount, seller_amount,
		        currency, payment_method, payment_status, paid_at, created_at,
		        COUNT(*) OVER() as total
		 FROM transactions WHERE student_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		studentID, pageSize, (page-1)*pageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	var total int64
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, f := range fields {
			if string(f.Name) == "total" {
				if v, ok := vals[i].(int64); ok {
					total = v
				}
				continue
			}
			row[string(f.Name)] = vals[i]
		}
		result = append(result, row)
	}

	return map[string]interface{}{
		"data": result, "total": total, "page": page, "page_size": pageSize,
	}, nil
}

func (r *PaymentRepository) GetTeacherEarnings(ctx context.Context, userID uuid.UUID, from, to string) (*models.EarningsReport, error) {
	report := &models.EarningsReport{Period: from + " - " + to}

	r.db.QueryRow(ctx, `
		SELECT
		  COALESCE(SUM(t.teacher_amount), 0),
		  COUNT(*)
		FROM transactions t
		JOIN courses c ON c.id = t.course_id
		JOIN teacher_profiles tp ON tp.id = c.teacher_id
		WHERE tp.user_id = $1
		  AND t.payment_status = 'paid'
		  AND t.paid_at BETWEEN $2 AND $3`,
		userID, from, to,
	).Scan(&report.TotalEarned, &report.TransactionCount)

	return report, nil
}

func (r *PaymentRepository) CreatePayout(ctx context.Context, recipientID uuid.UUID, amount float64, method string) (*models.Payout, error) {
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastOfMonth := firstOfMonth.AddDate(0, 1, -1)

	payout := &models.Payout{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO payouts (recipient_id, amount, currency, period_start, period_end, payout_method, status)
		 VALUES ($1, $2, 'MZN', $3, $4, $5, 'pending')
		 RETURNING id, recipient_id, amount, currency, period_start, period_end, payout_method, status, created_at`,
		recipientID, amount, firstOfMonth, lastOfMonth, method,
	).Scan(
		&payout.ID, &payout.RecipientID, &payout.Amount, &payout.Currency,
		&payout.PeriodStart, &payout.PeriodEnd, &payout.PayoutMethod, &payout.Status, &payout.CreatedAt,
	)
	return payout, err
}

func (r *PaymentRepository) GetPayoutsByRecipient(ctx context.Context, recipientID uuid.UUID) ([]models.Payout, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, recipient_id, amount, currency, period_start, period_end, payout_method, status, created_at
		 FROM payouts WHERE recipient_id = $1 ORDER BY created_at DESC`, recipientID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payouts []models.Payout
	for rows.Next() {
		var p models.Payout
		rows.Scan(&p.ID, &p.RecipientID, &p.Amount, &p.Currency,
			&p.PeriodStart, &p.PeriodEnd, &p.PayoutMethod, &p.Status, &p.CreatedAt)
		payouts = append(payouts, p)
	}
	return payouts, nil
}

func (r *PaymentRepository) GetPendingPayouts(ctx context.Context) ([]models.Payout, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, recipient_id, amount, currency, payout_method, status, created_at
		 FROM payouts WHERE status = 'pending' ORDER BY created_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payouts []models.Payout
	for rows.Next() {
		var p models.Payout
		rows.Scan(&p.ID, &p.RecipientID, &p.Amount, &p.Currency, &p.PayoutMethod, &p.Status, &p.CreatedAt)
		payouts = append(payouts, p)
	}
	return payouts, nil
}

func (r *PaymentRepository) ApprovePayout(ctx context.Context, id, approverID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE payouts SET status = 'processing', processed_by = $1, updated_at = NOW() WHERE id = $2`,
		approverID, id,
	)
	return err
}

func (r *PaymentRepository) GetFinancialReport(ctx context.Context, from, to string) (*models.FinancialReport, error) {
	report := &models.FinancialReport{Period: from + " - " + to}
	r.db.QueryRow(ctx, `
		SELECT
		  COALESCE(SUM(gross_amount), 0),
		  COALESCE(SUM(teacher_amount), 0),
		  COALESCE(SUM(platform_amount), 0),
		  COALESCE(SUM(seller_amount), 0),
		  COUNT(*),
		  COUNT(*) FILTER (WHERE payment_status = 'refunded')
		FROM transactions
		WHERE payment_status IN ('paid','refunded')
		  AND paid_at BETWEEN $1 AND $2`,
		from, to,
	).Scan(
		&report.TotalRevenue, &report.TeacherPayouts, &report.PlatformRevenue,
		&report.AffiliatePayouts, &report.TransactionCount, &report.RefundCount,
	)
	return report, nil
}

func (r *PaymentRepository) ListAllTransactions(ctx context.Context, page, pageSize int, status string) (map[string]interface{}, error) {
	query := `SELECT id, student_id, course_id, gross_amount, teacher_amount, platform_amount,
	           payment_status, paid_at, created_at, COUNT(*) OVER() as total
	           FROM transactions`
	args := []interface{}{}

	if status != "" {
		query += ` WHERE payment_status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`
	nextIdx := len(args) + 1
	query += ` LIMIT $` + itoa(nextIdx) + ` OFFSET $` + itoa(nextIdx+1)
	args = append(args, pageSize, (page-1)*pageSize)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	var total int64
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, f := range fields {
			if string(f.Name) == "total" {
				if v, ok := vals[i].(int64); ok {
					total = v
				}
				continue
			}
			row[string(f.Name)] = vals[i]
		}
		result = append(result, row)
	}

	return map[string]interface{}{
		"data": result, "total": total, "page": page, "page_size": pageSize,
	}, nil
}

func itoa(i int) string {
	return strconv.Itoa(i)
}
