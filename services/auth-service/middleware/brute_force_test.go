package middleware_test

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/eduhub/auth-service/middleware"
)

func newTestRedis(t *testing.T) (*redis.Client, func()) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis start: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	return rdb, func() {
		rdb.Close()
		mr.Close()
	}
}

func TestBruteForce_NotLocked_Initially(t *testing.T) {
	rdb, cleanup := newTestRedis(t)
	defer cleanup()

	bf := middleware.NewBruteForce(rdb)
	locked, _ := bf.IsLocked(context.Background(), "user@test.com", "1.2.3.4")
	if locked {
		t.Fatal("should not be locked on first attempt")
	}
}

func TestBruteForce_LockAfterFiveFailures(t *testing.T) {
	rdb, cleanup := newTestRedis(t)
	defer cleanup()

	bf := middleware.NewBruteForce(rdb)
	ctx := context.Background()
	email := "victim@test.com"
	ip := "10.0.0.1"

	for i := 0; i < 5; i++ {
		bf.RecordFailure(ctx, email, ip)
	}

	locked, reason := bf.IsLocked(ctx, email, ip)
	if !locked {
		t.Fatal("should be locked after 5 failures")
	}
	if reason == "" {
		t.Fatal("reason should not be empty")
	}
}

func TestBruteForce_ClearResetsLock(t *testing.T) {
	rdb, cleanup := newTestRedis(t)
	defer cleanup()

	bf := middleware.NewBruteForce(rdb)
	ctx := context.Background()
	email := "victim@test.com"
	ip := "10.0.0.1"

	for i := 0; i < 5; i++ {
		bf.RecordFailure(ctx, email, ip)
	}
	bf.ClearFailures(ctx, email)

	locked, _ := bf.IsLocked(ctx, email, ip)
	if locked {
		t.Fatal("should not be locked after clearing failures")
	}
}

func TestBruteForce_IPLockAfterTwentyFailures(t *testing.T) {
	rdb, cleanup := newTestRedis(t)
	defer cleanup()

	bf := middleware.NewBruteForce(rdb)
	ctx := context.Background()
	ip := "10.0.0.99"

	for i := 0; i < 20; i++ {
		bf.RecordFailure(ctx, "any@test.com", ip)
	}

	// IP should be locked regardless of email
	locked, _ := bf.IsLocked(ctx, "different@test.com", ip)
	if !locked {
		t.Fatal("IP should be locked after 20 failures")
	}
}
