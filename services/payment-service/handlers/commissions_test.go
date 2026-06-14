package handlers

import (
	"math"
	"testing"
)

func TestCalculateCommissions_NoAffiliate(t *testing.T) {
	c := calculateCommissions(1000.0, false)

	if c.Teacher != 700.0 {
		t.Errorf("teacher: want 700, got %.2f", c.Teacher)
	}
	if c.Platform != 300.0 {
		t.Errorf("platform: want 300, got %.2f", c.Platform)
	}
	if c.Affiliate != 0 {
		t.Errorf("affiliate: want 0, got %.2f", c.Affiliate)
	}
	total := c.Teacher + c.Platform + c.Affiliate
	if math.Abs(total-1000.0) > 0.01 {
		t.Errorf("commissions don't add up: %.2f", total)
	}
}

func TestCalculateCommissions_WithAffiliate(t *testing.T) {
	c := calculateCommissions(1000.0, true)

	if c.Teacher != 700.0 {
		t.Errorf("teacher: want 700, got %.2f", c.Teacher)
	}
	if c.Affiliate != 100.0 {
		t.Errorf("affiliate: want 100, got %.2f", c.Affiliate)
	}
	if c.Platform != 200.0 {
		t.Errorf("platform: want 200, got %.2f", c.Platform)
	}
	total := c.Teacher + c.Platform + c.Affiliate
	if math.Abs(total-1000.0) > 0.01 {
		t.Errorf("commissions don't add up: %.2f", total)
	}
}

func TestCalculateCommissions_SmallAmount(t *testing.T) {
	c := calculateCommissions(1.00, false)
	total := c.Teacher + c.Platform + c.Affiliate
	if math.Abs(total-1.00) > 0.01 {
		t.Errorf("small amount commissions don't add up: %.4f", total)
	}
}

func TestCalculateCommissions_ZeroAmount(t *testing.T) {
	c := calculateCommissions(0.0, true)
	if c.Teacher != 0 || c.Platform != 0 || c.Affiliate != 0 {
		t.Error("zero gross should yield all-zero commissions")
	}
}
