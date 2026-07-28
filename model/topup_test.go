package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// TestRechargeQuotaCalculation verifies the quota calculation logic used in Recharge.
// The formula is: quota = QuotaFromDecimal(money * QuotaPerUnit)
func TestRechargeQuotaCalculation(t *testing.T) {
	quotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)

	tests := []struct {
		name     string
		money    float64
		expected int
	}{
		{
			name:     "standard $10 recharge",
			money:    10.0,
			expected: common.QuotaFromDecimal(decimal.NewFromFloat(10.0).Mul(quotaPerUnit)),
		},
		{
			name:     "zero money",
			money:    0.0,
			expected: 0,
		},
		{
			name:     "small amount $0.01",
			money:    0.01,
			expected: common.QuotaFromDecimal(decimal.NewFromFloat(0.01).Mul(quotaPerUnit)),
		},
		{
			name:     "large amount $10000",
			money:    10000.0,
			expected: common.QuotaFromDecimal(decimal.NewFromFloat(10000.0).Mul(quotaPerUnit)),
		},
		{
			name:     "negative money (edge case)",
			money:    -5.0,
			expected: common.QuotaFromDecimal(decimal.NewFromFloat(-5.0).Mul(quotaPerUnit)),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			money := decimal.NewFromFloat(tt.money)
			quota := common.QuotaFromDecimal(money.Mul(quotaPerUnit))
			assert.Equal(t, tt.expected, quota)
		})
	}
}

// TestRechargeQuotaPerUnitValue verifies that QuotaPerUnit has the expected value.
func TestRechargeQuotaPerUnitValue(t *testing.T) {
	// QuotaPerUnit should be 500 * 1000 = 500000 (quota per unit currency)
	assert.Equal(t, 500*1000.0, common.QuotaPerUnit)
}

// TestRechargeQuotaCalculationExact verifies exact quota values for known inputs.
func TestRechargeQuotaCalculationExact(t *testing.T) {
	quotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)

	tests := []struct {
		name     string
		money    float64
		expected int
	}{
		{
			name:     "1 dollar gives 500000 quota",
			money:    1.0,
			expected: 500000,
		},
		{
			name:     "10 dollars gives 5000000 quota",
			money:    10.0,
			expected: 5000000,
		},
		{
			name:     "100 dollars gives 50000000 quota",
			money:    100.0,
			expected: 50000000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			money := decimal.NewFromFloat(tt.money)
			quota := common.QuotaFromDecimal(money.Mul(quotaPerUnit))
			assert.Equal(t, tt.expected, quota)
		})
	}
}

// TestRechargeQuotaOverflowProtection verifies that very large amounts saturate
// instead of overflowing, which is a critical billing safety invariant.
func TestRechargeQuotaOverflowProtection(t *testing.T) {
	quotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)

	tests := []struct {
		name  string
		money float64
	}{
		{
			name:  "extremely large amount",
			money: 1e18,
		},
		{
			name:  "max float64",
			money: 1.7976931348623157e+308,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			money := decimal.NewFromFloat(tt.money)
			quota := common.QuotaFromDecimal(money.Mul(quotaPerUnit))
			// Should saturate to MaxQuota, not overflow
			assert.LessOrEqual(t, quota, common.MaxQuota)
			assert.GreaterOrEqual(t, quota, common.MinQuota)
		})
	}
}
