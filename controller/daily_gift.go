package controller

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	dailyGiftPlanTitle    = "LightSnow"
	dailyGiftPlanSubtitle = "Daily gift reward"
)

type dailyGiftPrize struct {
	Name string `json:"name"`
}

type dailyGiftResponse struct {
	GiftDate  string         `json:"gift_date"`
	ExpiresAt int64          `json:"expires_at"`
	Scratched bool           `json:"scratched"`
	Redeemed  bool           `json:"redeemed"`
	Enabled   bool           `json:"enabled"`
	Prize     dailyGiftPrize `json:"prize"`
}

func dailyGiftDay(now time.Time) (string, int64) {
	localNow := now.In(time.Local)
	nextDay := time.Date(localNow.Year(), localNow.Month(), localNow.Day()+1, 0, 0, 0, 0, time.Local)
	return localNow.Format("2006-01-02"), nextDay.Unix()
}

func dailyGiftPlanName(planID int) string {
	if planID == 0 {
		return dailyGiftPlanTitle
	}
	var plan model.SubscriptionPlan
	if err := model.DB.Select("title").First(&plan, planID).Error; err == nil && plan.Title != "" {
		return plan.Title
	}
	return dailyGiftPlanTitle
}

func dailyGiftPlan() (*model.SubscriptionPlan, error) {
	var plan model.SubscriptionPlan
	err := model.DB.Where("is_daily_gift = ?", true).Order("id asc").First(&plan).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func makeDailyGiftResponse(gift *model.DailyGift, now time.Time, plan *model.SubscriptionPlan) dailyGiftResponse {
	date, expiresAt := dailyGiftDay(now)
	response := dailyGiftResponse{
		GiftDate:  date,
		ExpiresAt: expiresAt,
		Enabled:   plan != nil && plan.Enabled,
		Prize:     dailyGiftPrize{Name: dailyGiftPlanTitle},
	}
	if gift != nil {
		response.GiftDate = gift.GiftDate
		response.Scratched = gift.Scratched
		response.Redeemed = gift.Redeemed
		response.Prize.Name = dailyGiftPlanName(gift.PrizePlanId)
	}
	return response
}

func getDailyGift(userID int, date string) (*model.DailyGift, error) {
	var gift model.DailyGift
	err := model.DB.Where("user_id = ? AND gift_date = ?", userID, date).First(&gift).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &gift, nil
}

func dailyGiftPlanTx(tx *gorm.DB) (*model.SubscriptionPlan, error) {
	var plan model.SubscriptionPlan
	err := tx.Where("is_daily_gift = ?", true).Order("id asc").First(&plan).Error
	if err == nil {
		return &plan, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return nil, nil
}

func dailyGiftJSON(c *gin.Context, response dailyGiftResponse) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func GetDailyGift(c *gin.Context) {
	now := time.Now()
	date, _ := dailyGiftDay(now)
	plan, err := dailyGiftPlan()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	gift, err := getDailyGift(c.GetInt("id"), date)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dailyGiftJSON(c, makeDailyGiftResponse(gift, now, plan))
}

func ScratchDailyGift(c *gin.Context) {
	now := time.Now()
	date, _ := dailyGiftDay(now)
	userID := c.GetInt("id")
	var gift model.DailyGift
	if err := model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND gift_date = ?", userID, date).First(&gift).Error; err == nil {
			if gift.Scratched {
				return nil
			}
			gift.Scratched = true
			return tx.Save(&gift).Error
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		plan, err := dailyGiftPlanTx(tx)
		if err != nil {
			return err
		}
		if plan == nil || !plan.Enabled {
			return errors.New("daily gift is disabled")
		}
		gift = model.DailyGift{
			UserId:      userID,
			GiftDate:    date,
			PrizePlanId: plan.Id,
			Scratched:   true,
		}
		return tx.Create(&gift).Error
	}); err != nil {
		common.ApiError(c, err)
		return
	}
	plan, err := dailyGiftPlan()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dailyGiftJSON(c, makeDailyGiftResponse(&gift, now, plan))
}

func RedeemDailyGift(c *gin.Context) {
	now := time.Now()
	date, _ := dailyGiftDay(now)
	userID := c.GetInt("id")
	var gift model.DailyGift
	if err := model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND gift_date = ?", userID, date).First(&gift).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("scratch the daily gift before redeeming")
			}
			return err
		}
		if !gift.Scratched {
			return errors.New("scratch the daily gift before redeeming")
		}
		if gift.Redeemed {
			return nil
		}
		var plan model.SubscriptionPlan
		if err := tx.First(&plan, gift.PrizePlanId).Error; err != nil {
			return err
		}
		if _, err := model.CreateUserSubscriptionFromPlanTx(tx, userID, &plan, "daily_gift"); err != nil {
			return err
		}
		gift.Redeemed = true
		return tx.Save(&gift).Error
	}); err != nil {
		common.ApiError(c, err)
		return
	}
	plan, err := dailyGiftPlan()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dailyGiftJSON(c, makeDailyGiftResponse(&gift, now, plan))
}

func normalizeDailyGiftPlan(plan *model.SubscriptionPlan) error {
	plan.Title = strings.TrimSpace(plan.Title)
	if plan.Title == "" {
		plan.Title = dailyGiftPlanTitle
	}
	plan.Subtitle = strings.TrimSpace(plan.Subtitle)
	if plan.Subtitle == "" {
		plan.Subtitle = dailyGiftPlanSubtitle
	}
	if plan.DurationUnit == "" {
		plan.DurationUnit = model.SubscriptionDurationDay
	}
	if plan.DurationValue <= 0 && plan.DurationUnit != model.SubscriptionDurationCustom {
		plan.DurationValue = 1
	}
	if plan.DurationUnit == model.SubscriptionDurationCustom && plan.CustomSeconds <= 0 {
		return errors.New("custom duration must be greater than zero")
	}
	if plan.TotalAmount < 0 {
		return errors.New("daily gift quota cannot be negative")
	}
	plan.UpgradeGroup = strings.TrimSpace(plan.UpgradeGroup)
	if plan.UpgradeGroup != "" {
		if _, ok := ratio_setting.GetGroupRatioCopy()[plan.UpgradeGroup]; !ok {
			return errors.New("daily gift upgrade group does not exist")
		}
	}
	plan.DowngradeGroup = strings.TrimSpace(plan.DowngradeGroup)
	if plan.DowngradeGroup != "" {
		if _, ok := ratio_setting.GetGroupRatioCopy()[plan.DowngradeGroup]; !ok {
			return errors.New("daily gift downgrade group does not exist")
		}
	}
	plan.QuotaResetPeriod = model.NormalizeResetPeriod(plan.QuotaResetPeriod)
	if plan.QuotaResetPeriod == model.SubscriptionResetCustom && plan.QuotaResetCustomSeconds <= 0 {
		return errors.New("daily gift custom reset period must be greater than zero")
	}
	plan.PriceAmount = 0
	plan.Currency = "USD"
	plan.SortOrder = -1000
	plan.IsDailyGift = true
	plan.AllowBalancePay = common.GetPointer(false)
	if plan.AllowWalletOverflow == nil {
		plan.AllowWalletOverflow = common.GetPointer(true)
	}
	return nil
}

func upsertDailyGiftPlan(rewardPlan *model.SubscriptionPlan) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		existingPlan, err := dailyGiftPlanTx(tx)
		if err != nil {
			return err
		}
		if existingPlan == nil {
			return tx.Create(rewardPlan).Error
		}
		rewardPlan.Id = existingPlan.Id
		return tx.Model(&model.SubscriptionPlan{}).Where("id = ?", existingPlan.Id).Updates(map[string]interface{}{
			"title":                      rewardPlan.Title,
			"subtitle":                   rewardPlan.Subtitle,
			"duration_unit":              rewardPlan.DurationUnit,
			"duration_value":             rewardPlan.DurationValue,
			"custom_seconds":             rewardPlan.CustomSeconds,
			"enabled":                    rewardPlan.Enabled,
			"total_amount":               rewardPlan.TotalAmount,
			"upgrade_group":              rewardPlan.UpgradeGroup,
			"downgrade_group":            rewardPlan.DowngradeGroup,
			"quota_reset_period":         rewardPlan.QuotaResetPeriod,
			"quota_reset_custom_seconds": rewardPlan.QuotaResetCustomSeconds,
			"allow_balance_pay":          false,
			"allow_wallet_overflow":      *rewardPlan.AllowWalletOverflow,
			"is_daily_gift":              true,
			"updated_at":                 common.GetTimestamp(),
		}).Error
	})
}
