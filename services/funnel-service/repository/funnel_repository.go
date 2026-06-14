package repository

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/funnel-service/models"
)

var ErrNotFound = errors.New("not found")
var ErrDuplicate = errors.New("already exists")

type FunnelRepository struct {
	db *pgxpool.Pool
}

func NewFunnelRepository(db *pgxpool.Pool) *FunnelRepository {
	return &FunnelRepository{db: db}
}

// ─── Leads ────────────────────────────────────────────────────────────────────

func (r *FunnelRepository) CreateLead(ctx context.Context, req *models.CreateLeadRequest, ipAddress, userAgent string) (*models.Lead, error) {
	lead := &models.Lead{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO leads (email, name, phone, interest_discipline, interest_level,
		                   affiliate_code, utm_source, utm_medium, utm_campaign,
		                   ip_address, user_agent, source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::INET,$11,
		        CASE WHEN $6 != '' THEN 'affiliate' WHEN $7 != '' THEN 'paid' ELSE 'organic' END)
		RETURNING id, email, name, phone, interest_discipline, interest_level,
		          source, affiliate_code, utm_source, utm_medium, utm_campaign,
		          status, created_at`,
		req.Email, req.Name, req.Phone, req.InterestDiscipline, req.InterestLevel,
		req.AffiliateCode, req.UTMSource, req.UTMMedium, req.UTMCampaign,
		nullStr(ipAddress), userAgent,
	).Scan(
		&lead.ID, &lead.Email, &lead.Name, &lead.Phone, &lead.InterestDiscipline,
		&lead.InterestLevel, &lead.Source, &lead.AffiliateCode, &lead.UTMSource,
		&lead.UTMMedium, &lead.UTMCampaign, &lead.Status, &lead.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Incrementar click counter do afiliado (se houver código)
	if req.AffiliateCode != "" {
		r.db.Exec(ctx,
			`UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE affiliate_code = $1`,
			req.AffiliateCode,
		)
	}

	return lead, nil
}

func (r *FunnelRepository) ListLeads(ctx context.Context, status string, page, pageSize int) (map[string]interface{}, error) {
	cond := ""
	args := []interface{}{}
	idx := 1
	if status != "" {
		cond = fmt.Sprintf("WHERE status = $%d", idx)
		args = append(args, status)
		idx++
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT id, email, name, phone, interest_discipline, source,
		       affiliate_code, status, created_at, COUNT(*) OVER() as total
		FROM leads %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, cond, idx, idx+1),
		append(args, pageSize, (page-1)*pageSize)...,
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

func (r *FunnelRepository) UpdateLead(ctx context.Context, leadID uuid.UUID, req *models.UpdateLeadRequest) error {
	_, err := r.db.Exec(ctx,
		`UPDATE leads SET status = $1, notes = COALESCE(NULLIF($2,''), notes), updated_at = NOW() WHERE id = $3`,
		req.Status, req.Notes, leadID,
	)
	return err
}

func (r *FunnelRepository) ConvertLead(ctx context.Context, leadID, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE leads SET
		  status = 'converted',
		  converted_user_id = $1,
		  converted_at = NOW(),
		  updated_at = NOW()
		WHERE id = $2`, userID, leadID,
	)
	return err
}

func (r *FunnelRepository) GetLeadStats(ctx context.Context, from, to string) (map[string]interface{}, error) {
	var total, converted, lost, contacted int64
	r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*),
		  COUNT(*) FILTER (WHERE status = 'converted'),
		  COUNT(*) FILTER (WHERE status = 'lost'),
		  COUNT(*) FILTER (WHERE status IN ('contacted','qualified'))
		FROM leads
		WHERE created_at BETWEEN $1 AND $2`, from, to,
	).Scan(&total, &converted, &lost, &contacted)

	rate := 0.0
	if total > 0 {
		rate = float64(converted) / float64(total) * 100
	}

	return map[string]interface{}{
		"total": total, "converted": converted, "lost": lost,
		"contacted": contacted, "conversion_rate": rate,
		"period": from + " - " + to,
	}, nil
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

func (r *FunnelRepository) RegisterAffiliate(ctx context.Context, userID uuid.UUID, req *models.RegisterAffiliateRequest) (*models.Affiliate, error) {
	// Verificar se já é afiliado
	var exists bool
	r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM affiliates WHERE user_id = $1)`, userID).Scan(&exists)
	if exists {
		return nil, ErrDuplicate
	}

	code := generateAffiliateCode(userID)

	affiliate := &models.Affiliate{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO affiliates (user_id, affiliate_code, payout_method, payout_details)
		VALUES ($1, $2, $3, $4::JSONB)
		RETURNING id, user_id, affiliate_code, commission_rate, total_earned,
		          total_conversions, total_clicks, payout_method, is_active, created_at`,
		userID, code, req.PayoutMethod, `{"details":"`+req.PayoutDetails+`"}`,
	).Scan(
		&affiliate.ID, &affiliate.UserID, &affiliate.AffiliateCode,
		&affiliate.CommissionRate, &affiliate.TotalEarned, &affiliate.TotalConversions,
		&affiliate.TotalClicks, &affiliate.PayoutMethod, &affiliate.IsActive, &affiliate.CreatedAt,
	)
	return affiliate, err
}

func (r *FunnelRepository) GetAffiliateByUserID(ctx context.Context, userID uuid.UUID) (*models.Affiliate, error) {
	a := &models.Affiliate{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, affiliate_code, commission_rate, total_earned,
		       total_conversions, total_clicks, payout_method, is_active, approved_at, created_at
		FROM affiliates WHERE user_id = $1`, userID,
	).Scan(
		&a.ID, &a.UserID, &a.AffiliateCode, &a.CommissionRate, &a.TotalEarned,
		&a.TotalConversions, &a.TotalClicks, &a.PayoutMethod, &a.IsActive, &a.ApprovedAt, &a.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (r *FunnelRepository) GetAffiliateDashboard(ctx context.Context, userID uuid.UUID) (*models.AffiliateDashboard, error) {
	affiliate, err := r.GetAffiliateByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var earningsMonth float64
	var clicksMonth int
	r.db.QueryRow(ctx, `
		SELECT
		  COALESCE(SUM(t.seller_amount), 0),
		  (SELECT COUNT(*) FROM affiliate_clicks ac
		   JOIN affiliates a ON a.id = ac.affiliate_id
		   WHERE a.user_id = $1
		     AND DATE_TRUNC('month', ac.clicked_at) = DATE_TRUNC('month', NOW()))
		FROM transactions t
		JOIN affiliates a ON a.user_id = $1
		WHERE t.seller_id = a.user_id
		  AND t.payment_status = 'paid'
		  AND DATE_TRUNC('month', t.paid_at) = DATE_TRUNC('month', NOW())`, userID,
	).Scan(&earningsMonth, &clicksMonth)

	convRate := 0.0
	if affiliate.TotalClicks > 0 {
		convRate = float64(affiliate.TotalConversions) / float64(affiliate.TotalClicks) * 100
	}

	// Conversões recentes
	rows, _ := r.db.Query(ctx, `
		SELECT l.name, l.email, l.interest_discipline, l.converted_at
		FROM leads l
		WHERE l.affiliate_code = $1 AND l.status = 'converted'
		ORDER BY l.converted_at DESC LIMIT 10`, affiliate.AffiliateCode,
	)
	defer rows.Close()
	var conversions []map[string]interface{}
	for rows.Next() {
		vals, _ := rows.Values()
		fields := rows.FieldDescriptions()
		row := make(map[string]interface{})
		for i, fd := range fields {
			row[string(fd.Name)] = vals[i]
		}
		conversions = append(conversions, row)
	}

	return &models.AffiliateDashboard{
		Affiliate:         affiliate,
		EarningsThisMonth: earningsMonth,
		ClicksThisMonth:   clicksMonth,
		ConversionRate:    convRate,
		RecentConversions: conversions,
	}, nil
}

func (r *FunnelRepository) GetAffiliateReport(ctx context.Context, userID uuid.UUID, from, to string) (*models.AffiliateReport, error) {
	affiliate, err := r.GetAffiliateByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	report := &models.AffiliateReport{Period: from + " - " + to}

	r.db.QueryRow(ctx, `
		SELECT
		  (SELECT COUNT(*) FROM affiliate_clicks ac JOIN affiliates a ON a.id = ac.affiliate_id
		   WHERE a.user_id = $1 AND ac.clicked_at BETWEEN $2 AND $3),
		  (SELECT COUNT(*) FROM leads WHERE affiliate_code = $4 AND created_at BETWEEN $2 AND $3),
		  (SELECT COUNT(*) FROM leads WHERE affiliate_code = $4 AND status = 'converted' AND converted_at BETWEEN $2 AND $3),
		  COALESCE((SELECT SUM(t.seller_amount) FROM transactions t JOIN affiliates a ON a.user_id = $1
		            WHERE t.seller_id = a.user_id AND t.payment_status = 'paid' AND t.paid_at BETWEEN $2 AND $3), 0)`,
		userID, from, to, affiliate.AffiliateCode,
	).Scan(&report.TotalClicks, &report.TotalLeads, &report.TotalConversions, &report.TotalEarned)

	if report.TotalClicks > 0 {
		report.ConversionRate = float64(report.TotalConversions) / float64(report.TotalClicks) * 100
	}

	return report, nil
}

func (r *FunnelRepository) RegisterClick(ctx context.Context, affiliateCode, ipAddress, userAgent, referrer, landingPage string) error {
	var affiliateID uuid.UUID
	err := r.db.QueryRow(ctx,
		`SELECT id FROM affiliates WHERE affiliate_code = $1 AND is_active = TRUE`, affiliateCode,
	).Scan(&affiliateID)
	if err != nil {
		return ErrNotFound
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO affiliate_clicks (affiliate_id, ip_address, user_agent, referrer, landing_page)
		VALUES ($1, $2::INET, $3, $4, $5)`,
		affiliateID, nullStr(ipAddress), userAgent, referrer, landingPage,
	)
	if err != nil {
		return err
	}

	r.db.Exec(ctx,
		`UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = $1`, affiliateID,
	)
	return nil
}

func (r *FunnelRepository) ListAllAffiliates(ctx context.Context, page, pageSize int) (map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT a.id, a.affiliate_code, a.commission_rate, a.total_earned,
		       a.total_conversions, a.total_clicks, a.is_active, a.created_at,
		       u.email as user_email,
		       COUNT(*) OVER() as total
		FROM affiliates a
		JOIN users u ON u.id = a.user_id
		ORDER BY a.total_earned DESC
		LIMIT $1 OFFSET $2`, pageSize, (page-1)*pageSize,
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

func (r *FunnelRepository) ApproveAffiliate(ctx context.Context, affiliateID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE affiliates SET is_active = TRUE, approved_at = NOW(), updated_at = NOW() WHERE id = $1`, affiliateID,
	)
	return err
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

func (r *FunnelRepository) ListCampaigns(ctx context.Context, status string, page, pageSize int) (map[string]interface{}, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	cond := ""
	args := []interface{}{}
	idx := 1
	if status != "" {
		cond = fmt.Sprintf("WHERE status = $%d", idx)
		args = append(args, status)
		idx++
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT id, name, type, status, target_segment, COALESCE(subject,''),
		       discount_percent, COALESCE(promo_code,''), target_count, sent_count,
		       opened_count, clicked_count, converted_count, scheduled_at, launched_at,
		       completed_at, created_at, COUNT(*) OVER() as total
		FROM campaigns %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, cond, idx, idx+1),
		append(args, pageSize, (page-1)*pageSize)...,
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

func (r *FunnelRepository) CreateCampaign(ctx context.Context, req *models.CreateCampaignRequest, userID uuid.UUID) (*models.Campaign, error) {
	var targetCourseID *uuid.UUID
	if req.TargetCourseID != "" {
		id, err := uuid.Parse(req.TargetCourseID)
		if err == nil {
			targetCourseID = &id
		}
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err == nil {
			scheduledAt = &t
		}
	}

	targetSeg := req.TargetSegment
	if targetSeg == "" {
		targetSeg = "all"
	}

	campaign := &models.Campaign{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO campaigns (name, type, target_segment, subject, content,
		                       discount_percent, promo_code, target_course_id,
		                       scheduled_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, name, type, status, target_segment, COALESCE(subject,''),
		          COALESCE(content,''), discount_percent, COALESCE(promo_code,''),
		          target_course_id, scheduled_at, launched_at, completed_at,
		          target_count, sent_count, opened_count, clicked_count, converted_count, created_at`,
		req.Name, req.Type, targetSeg, req.Subject, req.Content,
		req.DiscountPercent, req.PromoCode, targetCourseID, scheduledAt, userID,
	).Scan(
		&campaign.ID, &campaign.Name, &campaign.Type, &campaign.Status,
		&campaign.TargetSegment, &campaign.Subject, &campaign.Content,
		&campaign.DiscountPercent, &campaign.PromoCode, &campaign.TargetCourseID,
		&campaign.ScheduledAt, &campaign.LaunchedAt, &campaign.CompletedAt,
		&campaign.TargetCount, &campaign.SentCount, &campaign.OpenedCount,
		&campaign.ClickedCount, &campaign.ConvertedCount, &campaign.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return campaign, nil
}

func (r *FunnelRepository) UpdateCampaignStatus(ctx context.Context, id uuid.UUID, status string) error {
	extra := ""
	if status == "active" {
		extra = ", launched_at = NOW()"
	} else if status == "completed" {
		extra = ", completed_at = NOW()"
	}
	_, err := r.db.Exec(ctx,
		fmt.Sprintf(`UPDATE campaigns SET status = $1%s, updated_at = NOW() WHERE id = $2`, extra),
		status, id,
	)
	return err
}

// ─── Segments ─────────────────────────────────────────────────────────────────

func (r *FunnelRepository) ListSegments(ctx context.Context) ([]models.Segment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, COALESCE(description,''), criteria, member_count,
		       last_computed_at, is_system, created_at
		FROM segments ORDER BY is_system DESC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var segs []models.Segment
	for rows.Next() {
		var s models.Segment
		rows.Scan(&s.ID, &s.Name, &s.Description, &s.Criteria, &s.MemberCount,
			&s.LastComputedAt, &s.IsSystem, &s.CreatedAt)
		segs = append(segs, s)
	}
	return segs, nil
}

func (r *FunnelRepository) CreateSegment(ctx context.Context, name, description, criteriaJSON string) (*models.Segment, error) {
	if criteriaJSON == "" {
		criteriaJSON = "{}"
	}
	seg := &models.Segment{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO segments (name, description, criteria)
		VALUES ($1, $2, $3::JSONB)
		RETURNING id, name, COALESCE(description,''), criteria, member_count,
		          last_computed_at, is_system, created_at`,
		name, description, criteriaJSON,
	).Scan(&seg.ID, &seg.Name, &seg.Description, &seg.Criteria, &seg.MemberCount,
		&seg.LastComputedAt, &seg.IsSystem, &seg.CreatedAt)
	if err != nil {
		return nil, err
	}
	return seg, nil
}

// ─── Funnel KPIs ──────────────────────────────────────────────────────────────

func (r *FunnelRepository) GetFunnelKPIs(ctx context.Context) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// Total leads and by status
	var total, newLeads, contacted, qualified, converted, lost int64
	r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*),
		  COUNT(*) FILTER (WHERE status = 'new'),
		  COUNT(*) FILTER (WHERE status = 'contacted'),
		  COUNT(*) FILTER (WHERE status = 'qualified'),
		  COUNT(*) FILTER (WHERE status = 'converted'),
		  COUNT(*) FILTER (WHERE status = 'lost')
		FROM leads
	`).Scan(&total, &newLeads, &contacted, &qualified, &converted, &lost)

	convRate := 0.0
	if total > 0 {
		convRate = float64(converted) / float64(total) * 100
	}
	result["total_leads"] = total
	result["leads_new"] = newLeads
	result["leads_contacted"] = contacted
	result["leads_qualified"] = qualified
	result["leads_converted"] = converted
	result["leads_lost"] = lost
	result["conversion_rate"] = convRate

	// Leads this week / this month
	var thisWeek, thisMonth int64
	r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW())),
		  COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))
		FROM leads
	`).Scan(&thisWeek, &thisMonth)
	result["leads_this_week"] = thisWeek
	result["leads_this_month"] = thisMonth

	// Campaigns summary
	var totalCampaigns, activeCampaigns int64
	r.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'active')
		FROM campaigns
	`).Scan(&totalCampaigns, &activeCampaigns)
	result["total_campaigns"] = totalCampaigns
	result["active_campaigns"] = activeCampaigns

	// Affiliates summary
	var totalAffiliates, activeAffiliates int64
	r.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = TRUE)
		FROM affiliates
	`).Scan(&totalAffiliates, &activeAffiliates)
	result["total_affiliates"] = totalAffiliates
	result["active_affiliates"] = activeAffiliates

	return result, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func generateAffiliateCode(userID uuid.UUID) string {
	prefix := strings.ToUpper(userID.String()[:4])
	suffix := fmt.Sprintf("%04d", rand.New(rand.NewSource(time.Now().UnixNano())).Intn(9999))
	return prefix + suffix
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
