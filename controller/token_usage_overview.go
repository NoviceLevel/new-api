package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type tokenUsageHour struct {
	Timestamp int64 `json:"timestamp"`
	Tokens    int64 `json:"tokens"`
}

type tokenUsageLogRow struct {
	CreatedAt        int64
	PromptTokens     int64
	CompletionTokens int64
}

func GetTokenUsageOverview(c *gin.Context) {
	now := time.Now().UTC()
	currentHour := now.Truncate(time.Hour)
	start := currentHour.Add(-23 * time.Hour).Unix()
	end := currentHour.Add(time.Hour).Unix()

	var total struct {
		Tokens int64
	}
	if err := model.LOG_DB.Table("logs").
		Select("COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) AS tokens").
		Where("type = ?", model.LogTypeConsume).
		Scan(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	var rows []tokenUsageLogRow
	if err := model.LOG_DB.Table("logs").
		Select("created_at, prompt_tokens, completion_tokens").
		Where("type = ? AND created_at >= ? AND created_at < ?", model.LogTypeConsume, start, end).
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	hourly := make([]tokenUsageHour, 24)
	indexes := make(map[int64]int, len(hourly))
	for i := range hourly {
		timestamp := start + int64(i)*int64(time.Hour/time.Second)
		hourly[i] = tokenUsageHour{Timestamp: timestamp}
		indexes[timestamp] = i
	}

	var last24Hours int64
	for _, row := range rows {
		hour := row.CreatedAt - row.CreatedAt%int64(time.Hour/time.Second)
		index, ok := indexes[hour]
		if !ok {
			continue
		}
		tokens := row.PromptTokens + row.CompletionTokens
		hourly[index].Tokens += tokens
		last24Hours += tokens
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_tokens":    total.Tokens,
			"last_24h_tokens": last24Hours,
			"hourly":          hourly,
		},
	})
}
