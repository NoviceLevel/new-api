package model

const (
	legacyDailyGiftPlanTitle    = "LightSnow"
	legacyDailyGiftPlanSubtitle = "Daily gift reward"
)

// DailyGift records one daily scratch-card reward per user. GiftDate uses the
// server-local YYYY-MM-DD date so a user can only redeem one prize per day.
type DailyGift struct {
	Id          int    `json:"id"`
	UserId      int    `json:"user_id" gorm:"uniqueIndex:idx_daily_gift_user_date,priority:1"`
	GiftDate    string `json:"gift_date" gorm:"type:varchar(10);uniqueIndex:idx_daily_gift_user_date,priority:2"`
	PrizePlanId int    `json:"prize_plan_id" gorm:"index"`
	Scratched   bool   `json:"scratched" gorm:"default:false"`
	Redeemed    bool   `json:"redeemed" gorm:"default:false"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}

// migrateLegacyDailyGiftPlans marks the previously auto-created reward plan
// as a system gift plan. Before this migration, that row was hidden by setting
// enabled=false, so it must be enabled once to preserve its original behavior.
func migrateLegacyDailyGiftPlans() error {
	return DB.Model(&SubscriptionPlan{}).
		Where("title = ? AND subtitle = ? AND is_daily_gift = ?", legacyDailyGiftPlanTitle, legacyDailyGiftPlanSubtitle, false).
		Updates(map[string]interface{}{
			"is_daily_gift":     true,
			"enabled":           true,
			"allow_balance_pay": false,
		}).Error
}
