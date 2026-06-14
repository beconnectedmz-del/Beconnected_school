package scheduler

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eduhub/course-service/notify"
)

// StartSessionReminder checks every minute for sessions starting in ~30 min
// and fires a reminder notification.
func StartSessionReminder(pool *pgxpool.Pool, notif *notify.Client) {
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		log.Println("session reminder scheduler started")
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			processReminders(ctx, pool, notif)
			cancel()
		}
	}()
}

func processReminders(ctx context.Context, pool *pgxpool.Pool, notif *notify.Client) {
	rows, err := pool.Query(ctx, `
		SELECT
			ls.id, ls.room_id, ls.scheduled_at,
			us.email AS student_email, sp.user_id AS student_user_id,
			ut.email AS teacher_email,
			c.title  AS course_title
		FROM live_sessions ls
		JOIN student_profiles sp ON sp.id = ls.student_id
		JOIN teacher_profiles tp ON tp.id = ls.teacher_id
		JOIN users us ON us.id = sp.user_id
		JOIN users ut ON ut.id = tp.user_id
		JOIN courses c  ON c.id  = ls.course_id
		WHERE ls.status        = 'scheduled'
		  AND ls.reminder_sent = false
		  AND ls.scheduled_at BETWEEN NOW() + INTERVAL '28 minutes'
		                           AND NOW() + INTERVAL '32 minutes'
	`)
	if err != nil {
		log.Printf("reminder query error: %v", err)
		return
	}
	defer rows.Close()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	for rows.Next() {
		var (
			id, roomID, courseTitle                string
			studentEmail, teacherEmail, studentUID string
			scheduledAt                            time.Time
		)
		if err := rows.Scan(&id, &roomID, &scheduledAt,
			&studentEmail, &studentUID, &teacherEmail, &courseTitle); err != nil {
			continue
		}

		// Mark notified (idempotency guard)
		if _, err := pool.Exec(ctx,
			`UPDATE live_sessions SET reminder_sent = true WHERE id = $1`, id); err != nil {
			log.Printf("reminder mark failed %s: %v", id, err)
			continue
		}

		notif.Send(ctx, "session_reminder", map[string]interface{}{
			"session": map[string]interface{}{
				"id":           id,
				"discipline":   courseTitle,
				"scheduled_at": scheduledAt,
				"join_url":     frontendURL + "/session/" + roomID,
			},
			"student": map[string]interface{}{
				"id":    studentUID,
				"email": studentEmail,
				"name":  studentEmail,
			},
			"teacher": map[string]interface{}{"name": teacherEmail},
		})
		log.Printf("reminder sent for session %s", id)
	}
}
