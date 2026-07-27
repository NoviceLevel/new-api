/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
package controller

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type modelHealthBucket struct {
	Hour         int64   `json:"hour"`
	TotalCount   int     `json:"total_count"`
	SuccessCount int     `json:"success_count"`
	ProbeCount   int     `json:"probe_count"`
	SuccessRate  float64 `json:"success_rate"`
}

type modelHealthModel struct {
	ModelName   string              `json:"model_name"`
	DisplayName string              `json:"display_name,omitempty"`
	Icon        string              `json:"icon,omitempty"`
	ChannelID   int                 `json:"channel_id"`
	Buckets     []modelHealthBucket `json:"buckets"`
}

type modelHealthLog struct {
	ModelName string
	ChannelID int `gorm:"column:channel_id"`
	CreatedAt int64
	Type      int
}

// GetUserModelHealth returns a rolling 24-hour reliability view for every
// enabled model/channel pair. The model list is the same source of truth as
// the model plaza; request logs only supply the hourly health measurements.
func GetUserModelHealth(c *gin.Context) {
	now := time.Now().UTC().Truncate(time.Hour)
	start := now.Add(-23 * time.Hour).Unix()

	type modelKey struct {
		name    string
		channel int
	}

	var channels []model.Channel
	if err := model.DB.Select("id, models").
		Where("status = ?", common.ChannelStatusEnabled).
		Find(&channels).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	bucketsByModel := make(map[modelKey]map[int64]*modelHealthBucket)
	for _, channel := range channels {
		for _, modelName := range strings.Split(channel.Models, ",") {
			modelName = strings.TrimSpace(modelName)
			if modelName == "" {
				continue
			}
			key := modelKey{name: modelName, channel: channel.Id}
			bucketsByModel[key] = make(map[int64]*modelHealthBucket)
		}
	}

	var logs []modelHealthLog
	if err := model.LOG_DB.Model(&model.Log{}).
		Select("model_name, channel_id, created_at, type").
		Where("created_at >= ? AND type IN ?", start, []int{model.LogTypeConsume, model.LogTypeError}).
		Find(&logs).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	for _, log := range logs {
		if log.ModelName == "" {
			continue
		}
		key := modelKey{name: log.ModelName, channel: log.ChannelID}
		if _, activeModel := bucketsByModel[key]; !activeModel {
			continue
		}
		hour := time.Unix(log.CreatedAt, 0).UTC().Truncate(time.Hour).Unix()
		bucket := bucketsByModel[key][hour]
		if bucket == nil {
			bucket = &modelHealthBucket{Hour: hour}
			bucketsByModel[key][hour] = bucket
		}
		bucket.TotalCount++
		if log.Type == model.LogTypeConsume {
			bucket.SuccessCount++
		}
	}

	keys := make([]modelKey, 0, len(bucketsByModel))
	for key := range bucketsByModel {
		keys = append(keys, key)
	}
	modelNames := make([]string, 0, len(keys))
	for _, key := range keys {
		modelNames = append(modelNames, key.name)
	}
	var metadata []struct {
		ModelName string
		Icon      string
	}
	if len(modelNames) > 0 {
		if err := model.DB.Model(&model.Model{}).
			Select("model_name, icon").
			Where("model_name IN ?", modelNames).
			Find(&metadata).Error; err != nil {
			common.ApiError(c, err)
			return
		}
	}
	iconByModel := make(map[string]string, len(metadata))
	for _, meta := range metadata {
		iconByModel[meta.ModelName] = meta.Icon
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].name == keys[j].name {
			return keys[i].channel < keys[j].channel
		}
		return keys[i].name < keys[j].name
	})

	models := make([]modelHealthModel, 0, len(keys))
	for _, key := range keys {
		buckets := make([]modelHealthBucket, 0, 24)
		for hour := start; hour <= now.Unix(); hour += int64(time.Hour.Seconds()) {
			bucket := bucketsByModel[key][hour]
			if bucket == nil {
				buckets = append(buckets, modelHealthBucket{Hour: hour})
				continue
			}
			bucket.SuccessRate = float64(bucket.SuccessCount) / float64(bucket.TotalCount) * 100
			buckets = append(buckets, *bucket)
		}
		models = append(models, modelHealthModel{
			ModelName:   key.name,
			DisplayName: key.name,
			Icon:        modelHealthIcon(key.name, iconByModel[key.name]),
			ChannelID:   key.channel,
			Buckets:     buckets,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"generated_at": time.Now().Unix(),
			"models":       models,
		},
	})
}

// modelHealthIcon follows the icon metadata used by the model plaza. Some
// custom models do not have a stored icon, so use the plaza's provider-name
// fallback for the common model families.
func modelHealthIcon(modelName, metadataIcon string) string {
	if strings.TrimSpace(metadataIcon) != "" {
		return metadataIcon
	}
	name := strings.ToLower(modelName)
	switch {
	case strings.Contains(name, "grok-") || strings.Contains(name, "xai-"):
		return "Grok.Color"
	case strings.Contains(name, "gpt-") || strings.Contains(name, "chatgpt-"):
		return "OpenAI.Color"
	case strings.Contains(name, "claude-") || strings.Contains(name, "anthropic"):
		return "Claude.Color"
	case strings.Contains(name, "gemini-") || strings.Contains(name, "learnlm-"):
		return "Gemini.Color"
	case strings.Contains(name, "deepseek-"):
		return "DeepSeek.Color"
	case strings.Contains(name, "qwen") || strings.Contains(name, "qwq-"):
		return "Qwen.Color"
	}
	return ""
}
