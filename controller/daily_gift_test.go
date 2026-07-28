package controller

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDailyGiftDay verifies that dailyGiftDay returns the correct date and expiry.
func TestDailyGiftDay(t *testing.T) {
	tests := []struct {
		name         string
		now          time.Time
		expectedDate string
	}{
		{
			name:         "midday",
			now:          time.Date(2024, 1, 15, 12, 0, 0, 0, time.Local),
			expectedDate: "2024-01-15",
		},
		{
			name:         "start of day",
			now:          time.Date(2024, 1, 15, 0, 0, 0, 0, time.Local),
			expectedDate: "2024-01-15",
		},
		{
			name:         "end of day",
			now:          time.Date(2024, 1, 15, 23, 59, 59, 0, time.Local),
			expectedDate: "2024-01-15",
		},
		{
			name:         "leap year date",
			now:          time.Date(2024, 2, 29, 10, 0, 0, 0, time.Local),
			expectedDate: "2024-02-29",
		},
		{
			name:         "year boundary",
			now:          time.Date(2024, 12, 31, 23, 59, 59, 0, time.Local),
			expectedDate: "2024-12-31",
		},
		{
			name:         "new year",
			now:          time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local),
			expectedDate: "2025-01-01",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			date, expiresAt := dailyGiftDay(tt.now)
			assert.Equal(t, tt.expectedDate, date)

			// Verify expiresAt is the next day at midnight
			nextDay := time.Date(tt.now.Year(), tt.now.Month(), tt.now.Day()+1, 0, 0, 0, 0, time.Local)
			assert.Equal(t, nextDay.Unix(), expiresAt)
		})
	}
}

// TestDailyGiftDayExpiryAlwaysMidnight verifies that the expiry is always midnight of the next day.
func TestDailyGiftDayExpiryAlwaysMidnight(t *testing.T) {
	now := time.Date(2024, 6, 15, 14, 30, 45, 0, time.Local)
	_, expiresAt := dailyGiftDay(now)

	expiryTime := time.Unix(expiresAt, 0).In(time.Local)
	assert.Equal(t, 0, expiryTime.Hour(), "expiry hour should be 0")
	assert.Equal(t, 0, expiryTime.Minute(), "expiry minute should be 0")
	assert.Equal(t, 0, expiryTime.Second(), "expiry second should be 0")
	assert.Equal(t, now.Day()+1, expiryTime.Day(), "expiry should be next day")
}

// TestNormalizeDailyGiftPlan verifies that normalizeDailyGiftPlan validates inputs correctly.
func TestNormalizeDailyGiftPlan(t *testing.T) {
	tests := []struct {
		name        string
		plan        *model.SubscriptionPlan
		expectError bool
	}{
		{
			name: "valid plan with all fields",
			plan: &model.SubscriptionPlan{
				Title:               "Test Plan",
				Subtitle:            "Test Subtitle",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				TotalAmount:         1000,
				QuotaResetPeriod:    model.SubscriptionResetDaily,
				UpgradeGroup:        "",
				DowngradeGroup:      "",
				AllowWalletOverflow: common.GetPointer(true),
			},
			expectError: false,
		},
		{
			name: "valid plan with custom duration",
			plan: &model.SubscriptionPlan{
				Title:               "Custom Plan",
				Subtitle:            "Custom Subtitle",
				DurationUnit:        model.SubscriptionDurationCustom,
				CustomSeconds:       86400,
				TotalAmount:         500,
				QuotaResetPeriod:    model.SubscriptionResetNever,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expectError: false,
		},
		{
			name: "valid plan with valid upgrade group",
			plan: &model.SubscriptionPlan{
				Title:               "VIP Plan",
				Subtitle:            "VIP Subtitle",
				DurationUnit:        model.SubscriptionDurationMonth,
				DurationValue:       1,
				TotalAmount:         2000,
				QuotaResetPeriod:    model.SubscriptionResetMonthly,
				UpgradeGroup:        "vip",
				DowngradeGroup:      "default",
				AllowWalletOverflow: common.GetPointer(true),
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := normalizeDailyGiftPlan(tt.plan)
			if tt.expectError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// TestNormalizeDailyGiftPlanDefaults verifies that normalizeDailyGiftPlan sets correct defaults.
func TestNormalizeDailyGiftPlanDefaults(t *testing.T) {
	tests := []struct {
		name     string
		plan     *model.SubscriptionPlan
		expected *model.SubscriptionPlan
	}{
		{
			name: "empty title gets default",
			plan: &model.SubscriptionPlan{
				Title:               "",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expected: &model.SubscriptionPlan{
				Title:           dailyGiftPlanTitle,
				Subtitle:        dailyGiftPlanSubtitle,
				DurationUnit:    model.SubscriptionDurationDay,
				DurationValue:   1,
				Currency:        "USD",
				SortOrder:       -1000,
				IsDailyGift:     true,
				AllowBalancePay: common.GetPointer(false),
			},
		},
		{
			name: "empty subtitle gets default",
			plan: &model.SubscriptionPlan{
				Title:               "Custom Title",
				Subtitle:            "",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expected: &model.SubscriptionPlan{
				Title:           "Custom Title",
				Subtitle:        dailyGiftPlanSubtitle,
				DurationUnit:    model.SubscriptionDurationDay,
				DurationValue:   1,
				Currency:        "USD",
				SortOrder:       -1000,
				IsDailyGift:     true,
				AllowBalancePay: common.GetPointer(false),
			},
		},
		{
			name: "empty duration unit defaults to day",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        "",
				DurationValue:       1,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expected: &model.SubscriptionPlan{
				Title:           "Test",
				Subtitle:        dailyGiftPlanSubtitle,
				DurationUnit:    model.SubscriptionDurationDay,
				DurationValue:   1,
				Currency:        "USD",
				SortOrder:       -1000,
				IsDailyGift:     true,
				AllowBalancePay: common.GetPointer(false),
			},
		},
		{
			name: "zero duration value defaults to 1",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       0,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expected: &model.SubscriptionPlan{
				Title:           "Test",
				Subtitle:        dailyGiftPlanSubtitle,
				DurationUnit:    model.SubscriptionDurationDay,
				DurationValue:   1,
				Currency:        "USD",
				SortOrder:       -1000,
				IsDailyGift:     true,
				AllowBalancePay: common.GetPointer(false),
			},
		},
		{
			name: "price amount is always zero",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				PriceAmount:         100,
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				AllowWalletOverflow: common.GetPointer(true),
			},
			expected: &model.SubscriptionPlan{
				Title:           "Test",
				Subtitle:        dailyGiftPlanSubtitle,
				PriceAmount:     0,
				DurationUnit:    model.SubscriptionDurationDay,
				DurationValue:   1,
				Currency:        "USD",
				SortOrder:       -1000,
				IsDailyGift:     true,
				AllowBalancePay: common.GetPointer(false),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := normalizeDailyGiftPlan(tt.plan)
			require.NoError(t, err)
			assert.Equal(t, tt.expected.Title, tt.plan.Title)
			assert.Equal(t, tt.expected.Subtitle, tt.plan.Subtitle)
			assert.Equal(t, tt.expected.DurationUnit, tt.plan.DurationUnit)
			assert.Equal(t, tt.expected.DurationValue, tt.plan.DurationValue)
			assert.Equal(t, tt.expected.Currency, tt.plan.Currency)
			assert.Equal(t, tt.expected.SortOrder, tt.plan.SortOrder)
			assert.Equal(t, tt.expected.IsDailyGift, tt.plan.IsDailyGift)
			assert.Equal(t, *tt.expected.AllowBalancePay, *tt.plan.AllowBalancePay)
		})
	}
}

// TestNormalizeDailyGiftPlanInvalidInputs verifies that normalizeDailyGiftPlan rejects invalid inputs.
func TestNormalizeDailyGiftPlanInvalidInputs(t *testing.T) {
	tests := []struct {
		name     string
		plan     *model.SubscriptionPlan
		errorMsg string
	}{
		{
			name: "custom duration with zero seconds",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationCustom,
				CustomSeconds:       0,
				AllowWalletOverflow: common.GetPointer(true),
			},
			errorMsg: "custom duration must be greater than zero",
		},
		{
			name: "custom duration with negative seconds",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationCustom,
				CustomSeconds:       -100,
				AllowWalletOverflow: common.GetPointer(true),
			},
			errorMsg: "custom duration must be greater than zero",
		},
		{
			name: "negative total amount",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				TotalAmount:         -100,
				AllowWalletOverflow: common.GetPointer(true),
			},
			errorMsg: "daily gift quota cannot be negative",
		},
		{
			name: "invalid upgrade group",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				UpgradeGroup:        "nonexistent",
				AllowWalletOverflow: common.GetPointer(true),
			},
			errorMsg: "daily gift upgrade group does not exist",
		},
		{
			name: "invalid downgrade group",
			plan: &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				DowngradeGroup:      "nonexistent",
				AllowWalletOverflow: common.GetPointer(true),
			},
			errorMsg: "daily gift downgrade group does not exist",
		},
		{
			name: "custom reset period with zero seconds",
			plan: &model.SubscriptionPlan{
				Title:                 "Test",
				DurationUnit:          model.SubscriptionDurationDay,
				DurationValue:         1,
				QuotaResetPeriod:      model.SubscriptionResetCustom,
				QuotaResetCustomSeconds: 0,
				AllowWalletOverflow:   common.GetPointer(true),
			},
			errorMsg: "daily gift custom reset period must be greater than zero",
		},
		{
			name: "custom reset period with negative seconds",
			plan: &model.SubscriptionPlan{
				Title:                 "Test",
				DurationUnit:          model.SubscriptionDurationDay,
				DurationValue:         1,
				QuotaResetPeriod:      model.SubscriptionResetCustom,
				QuotaResetCustomSeconds: -60,
				AllowWalletOverflow:   common.GetPointer(true),
			},
			errorMsg: "daily gift custom reset period must be greater than zero",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := normalizeDailyGiftPlan(tt.plan)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorMsg)
		})
	}
}

// TestNormalizeDailyGiftPlanWalletOverflow verifies that AllowWalletOverflow defaults to true when nil.
func TestNormalizeDailyGiftPlanWalletOverflow(t *testing.T) {
	plan := &model.SubscriptionPlan{
		Title:               "Test",
		DurationUnit:        model.SubscriptionDurationDay,
		DurationValue:       1,
		AllowWalletOverflow: nil, // Should default to true
	}

	err := normalizeDailyGiftPlan(plan)
	require.NoError(t, err)
	require.NotNil(t, plan.AllowWalletOverflow)
	assert.True(t, *plan.AllowWalletOverflow)
}

// TestNormalizeDailyGiftPlanQuotaResetPeriodNormalization verifies that quota reset period is normalized.
func TestNormalizeDailyGiftPlanQuotaResetPeriodNormalization(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "valid daily",
			input:    model.SubscriptionResetDaily,
			expected: model.SubscriptionResetDaily,
		},
		{
			name:     "valid weekly",
			input:    model.SubscriptionResetWeekly,
			expected: model.SubscriptionResetWeekly,
		},
		{
			name:     "valid monthly",
			input:    model.SubscriptionResetMonthly,
			expected: model.SubscriptionResetMonthly,
		},
		{
			name:     "invalid becomes never",
			input:    "invalid",
			expected: model.SubscriptionResetNever,
		},
		{
			name:     "empty becomes never",
			input:    "",
			expected: model.SubscriptionResetNever,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := &model.SubscriptionPlan{
				Title:               "Test",
				DurationUnit:        model.SubscriptionDurationDay,
				DurationValue:       1,
				QuotaResetPeriod:    tt.input,
				AllowWalletOverflow: common.GetPointer(true),
			}

			err := normalizeDailyGiftPlan(plan)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, plan.QuotaResetPeriod)
		})
	}
}
