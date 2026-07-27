package controller

import (
	"errors"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
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

func makeDailyGiftResponse(gift *model.DailyGift, now time.Time) dailyGiftResponse {
	date, expiresAt := dailyGiftDay(now)
	response := dailyGiftResponse{
		GiftDate:  date,
		ExpiresAt: expiresAt,
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

// ensureDailyGiftPlanTx creates the hidden local equivalent of the source
// site's LightSnow daily subscription when a restored database has no plans.
func ensureDailyGiftPlanTx(tx *gorm.DB) (*model.SubscriptionPlan, error) {
	var plan model.SubscriptionPlan
	err := tx.Where("title = ? AND subtitle = ?", dailyGiftPlanTitle, dailyGiftPlanSubtitle).First(&plan).Error
	if err == nil {
		if plan.Enabled {
			if err := tx.Model(&model.SubscriptionPlan{}).Where("id = ?", plan.Id).Update("enabled", false).Error; err != nil {
				return nil, err
			}
			plan.Enabled = false
		}
		return &plan, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	plan = model.SubscriptionPlan{
		Title:         dailyGiftPlanTitle,
		Subtitle:      dailyGiftPlanSubtitle,
		PriceAmount:   0,
		Currency:      "USD",
		DurationUnit:  model.SubscriptionDurationDay,
		DurationValue: 1,
		TotalAmount:   0,
		Enabled:       false,
		SortOrder:     -1000,
	}
	if err := tx.Create(&plan).Error; err != nil {
		return nil, err
	}
	// SubscriptionPlan.Enabled has a database default of true. Persist the
	// hidden gift-plan state explicitly after Create applies that default.
	if err := tx.Model(&model.SubscriptionPlan{}).Where("id = ?", plan.Id).Update("enabled", false).Error; err != nil {
		return nil, err
	}
	plan.Enabled = false
	return &plan, nil
}

func dailyGiftJSON(c *gin.Context, response dailyGiftResponse) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func GetDailyGift(c *gin.Context) {
	now := time.Now()
	date, _ := dailyGiftDay(now)
	gift, err := getDailyGift(c.GetInt("id"), date)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dailyGiftJSON(c, makeDailyGiftResponse(gift, now))
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
		plan, err := ensureDailyGiftPlanTx(tx)
		if err != nil {
			return err
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
	dailyGiftJSON(c, makeDailyGiftResponse(&gift, now))
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
	dailyGiftJSON(c, makeDailyGiftResponse(&gift, now))
}
