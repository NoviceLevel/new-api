package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCalcPlanEndTime verifies the calcPlanEndTime function for different duration units.
func TestCalcPlanEndTime(t *testing.T) {
	baseTime := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	tests := []struct {
		name        string
		plan        *SubscriptionPlan
		expected    int64
		expectError bool
	}{
		{
			name: "1 day duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationDay,
				DurationValue: 1,
			},
			expected: baseTime.Add(24 * time.Hour).Unix(),
		},
		{
			name: "7 days duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationDay,
				DurationValue: 7,
			},
			expected: baseTime.Add(7 * 24 * time.Hour).Unix(),
		},
		{
			name: "1 month duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationMonth,
				DurationValue: 1,
			},
			expected: baseTime.AddDate(0, 1, 0).Unix(),
		},
		{
			name: "3 months duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationMonth,
				DurationValue: 3,
			},
			expected: baseTime.AddDate(0, 3, 0).Unix(),
		},
		{
			name: "1 year duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationYear,
				DurationValue: 1,
			},
			expected: baseTime.AddDate(1, 0, 0).Unix(),
		},
		{
			name: "2 years duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationYear,
				DurationValue: 2,
			},
			expected: baseTime.AddDate(2, 0, 0).Unix(),
		},
		{
			name: "1 hour duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationHour,
				DurationValue: 1,
			},
			expected: baseTime.Add(time.Hour).Unix(),
		},
		{
			name: "12 hours duration",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationHour,
				DurationValue: 12,
			},
			expected: baseTime.Add(12 * time.Hour).Unix(),
		},
		{
			name: "custom duration 1 day",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationCustom,
				CustomSeconds: 86400,
			},
			expected: baseTime.Add(86400 * time.Second).Unix(),
		},
		{
			name: "custom duration 1 week",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationCustom,
				CustomSeconds: 604800,
			},
			expected: baseTime.Add(604800 * time.Second).Unix(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := calcPlanEndTime(baseTime, tt.plan)
			if tt.expectError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCalcPlanEndTimeNilPlan verifies that calcPlanEndTime returns an error for nil plan.
func TestCalcPlanEndTimeNilPlan(t *testing.T) {
	_, err := calcPlanEndTime(time.Now(), nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "plan is nil")
}

// TestCalcPlanEndTimeInvalidDuration verifies error cases for invalid duration values.
func TestCalcPlanEndTimeInvalidDuration(t *testing.T) {
	baseTime := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	tests := []struct {
		name string
		plan *SubscriptionPlan
	}{
		{
			name: "zero duration value for day",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationDay,
				DurationValue: 0,
			},
		},
		{
			name: "negative duration value for month",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationMonth,
				DurationValue: -1,
			},
		},
		{
			name: "zero duration value for year",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationYear,
				DurationValue: 0,
			},
		},
		{
			name: "invalid duration unit",
			plan: &SubscriptionPlan{
				DurationUnit:  "invalid",
				DurationValue: 1,
			},
		},
		{
			name: "empty duration unit",
			plan: &SubscriptionPlan{
				DurationUnit:  "",
				DurationValue: 1,
			},
		},
		{
			name: "custom duration with zero seconds",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationCustom,
				CustomSeconds: 0,
			},
		},
		{
			name: "custom duration with negative seconds",
			plan: &SubscriptionPlan{
				DurationUnit:  SubscriptionDurationCustom,
				CustomSeconds: -100,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := calcPlanEndTime(baseTime, tt.plan)
			require.Error(t, err)
		})
	}
}

// TestNormalizeResetPeriod verifies the NormalizeResetPeriod function for valid/invalid inputs.
func TestNormalizeResetPeriod(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "daily reset period",
			input:    SubscriptionResetDaily,
			expected: SubscriptionResetDaily,
		},
		{
			name:     "weekly reset period",
			input:    SubscriptionResetWeekly,
			expected: SubscriptionResetWeekly,
		},
		{
			name:     "monthly reset period",
			input:    SubscriptionResetMonthly,
			expected: SubscriptionResetMonthly,
		},
		{
			name:     "custom reset period",
			input:    SubscriptionResetCustom,
			expected: SubscriptionResetCustom,
		},
		{
			name:     "never reset period",
			input:    SubscriptionResetNever,
			expected: SubscriptionResetNever,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeResetPeriod(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestNormalizeResetPeriodInvalidInputs verifies that invalid inputs default to "never".
func TestNormalizeResetPeriodInvalidInputs(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{
			name:  "empty string",
			input: "",
		},
		{
			name:  "random string",
			input: "invalid",
		},
		{
			name:  "whitespace only",
			input: "   ",
		},
		{
			name:  "mixed case",
			input: "Daily",
		},
		{
			name:  "numeric string",
			input: "123",
		},
		{
			name:  "special characters",
			input: "daily!",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeResetPeriod(tt.input)
			assert.Equal(t, SubscriptionResetNever, result)
		})
	}
}

// TestNormalizeResetPeriodEdgeCases verifies edge cases for NormalizeResetPeriod.
func TestNormalizeResetPeriodEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "daily with leading space",
			input:    " daily",
			expected: SubscriptionResetDaily,
		},
		{
			name:     "daily with trailing space",
			input:    "daily ",
			expected: SubscriptionResetDaily,
		},
		{
			name:     "daily with leading and trailing space",
			input:    " daily ",
			expected: SubscriptionResetDaily,
		},
		{
			name:     "weekly with whitespace",
			input:    " weekly ",
			expected: SubscriptionResetWeekly,
		},
		{
			name:     "monthly with whitespace",
			input:    " monthly ",
			expected: SubscriptionResetMonthly,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeResetPeriod(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
