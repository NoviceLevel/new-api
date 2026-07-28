package model

// DailyGift records one daily scratch-card reward per user. GiftDate uses the
// server-local YYYY-MM-DD date so a user can only redeem one prize per day.
type DailyGift struct {
	Id          int    `json:"id"`
	UserId      int    `json:"user_id" gorm:"uniqueIndex:idx_daily_gift_user_date,priority:1"`
	GiftDate    string `json:"gift_date" gorm:"type:varchar(10);uniqueIndex:idx_daily_gift_user_date,priority:2;index:idx_daily_gift_plan_date_redeemed,priority:2"`
	PrizePlanId int    `json:"prize_plan_id" gorm:"index:idx_daily_gift_plan_date_redeemed,priority:1"`
	Scratched   bool   `json:"scratched" gorm:"default:false"`
	Redeemed    bool   `json:"redeemed" gorm:"default:false;index:idx_daily_gift_plan_date_redeemed,priority:3"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}
