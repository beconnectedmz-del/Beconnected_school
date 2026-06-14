package middleware

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	emailMaxAttempts = 5
	ipMaxAttempts    = 20
)

type BruteForce struct {
	rdb *redis.Client
}

func NewBruteForce(rdb *redis.Client) *BruteForce {
	return &BruteForce{rdb: rdb}
}

// IsLocked checks whether the email or IP is temporarily blocked.
func (b *BruteForce) IsLocked(ctx context.Context, email, ip string) (bool, string) {
	emailKey := fmt.Sprintf("bf:email:%s", email)
	if val, err := b.rdb.Get(ctx, emailKey).Result(); err == nil {
		if n, _ := strconv.Atoi(val); n >= emailMaxAttempts {
			ttl, _ := b.rdb.TTL(ctx, emailKey).Result()
			return true, fmt.Sprintf("conta bloqueada. Tente novamente em %d minuto(s)", int(ttl.Minutes())+1)
		}
	}

	ipKey := fmt.Sprintf("bf:ip:%s", ip)
	if val, err := b.rdb.Get(ctx, ipKey).Result(); err == nil {
		if n, _ := strconv.Atoi(val); n >= ipMaxAttempts {
			ttl, _ := b.rdb.TTL(ctx, ipKey).Result()
			return true, fmt.Sprintf("demasiadas tentativas. Tente novamente em %d minuto(s)", int(ttl.Minutes())+1)
		}
	}

	return false, ""
}

// RecordFailure increments failure counters with progressive lockout duration.
func (b *BruteForce) RecordFailure(ctx context.Context, email, ip string) {
	emailKey := fmt.Sprintf("bf:email:%s", email)
	n, _ := b.rdb.Incr(ctx, emailKey).Result()
	b.rdb.Expire(ctx, emailKey, lockoutDuration(int(n), emailMaxAttempts))

	ipKey := fmt.Sprintf("bf:ip:%s", ip)
	m, _ := b.rdb.Incr(ctx, ipKey).Result()
	b.rdb.Expire(ctx, ipKey, lockoutDuration(int(m), ipMaxAttempts))
}

// ClearFailures removes the email failure counter on successful login.
func (b *BruteForce) ClearFailures(ctx context.Context, email string) {
	b.rdb.Del(ctx, fmt.Sprintf("bf:email:%s", email))
}

// lockoutDuration returns progressively longer durations as attempts grow.
func lockoutDuration(attempts, threshold int) time.Duration {
	ratio := attempts / threshold
	switch {
	case ratio < 2:
		return 15 * time.Minute
	case ratio < 4:
		return time.Hour
	default:
		return 24 * time.Hour
	}
}
