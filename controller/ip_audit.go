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
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const (
	ipAuditRetentionMinutes = 30 * 24 * 60
	ipAuditDefaultWindow    = 24 * 60
	ipAuditDefaultRequests  = 1000
	ipAuditDefaultUsers     = 3
	ipAuditDefaultRPM       = 60
	ipAuditDefaultPageSize  = 20
	ipAuditMaxPageSize      = 100
	ipAuditUsersPerItem     = 10
)

type ipAuditLog struct {
	IP        string
	UserID    int
	Username  string
	CreatedAt int64
}

type ipAuditUser struct {
	UserID       int    `json:"user_id"`
	Username     string `json:"username"`
	RequestCount int    `json:"request_count"`
}

type ipAuditItem struct {
	IP             string        `json:"ip"`
	UserCount      int           `json:"user_count"`
	Users          []ipAuditUser `json:"users"`
	UsersTruncated bool          `json:"users_truncated"`
	RequestCount   int           `json:"request_count"`
	PeakRPM        int           `json:"peak_rpm"`
	FirstSeenAt    int64         `json:"first_seen_at"`
	LastSeenAt     int64         `json:"last_seen_at"`
	CountAnomaly   bool          `json:"count_anomaly"`
	RPMAnomaly     bool          `json:"rpm_anomaly"`
}

type ipAuditSummary struct {
	TotalIPs        int `json:"total_ips"`
	TotalUsers      int `json:"total_users"`
	TotalRequests   int `json:"total_requests"`
	CountAnomalyIPs int `json:"count_anomaly_ips"`
	RPMAnomalyIPs   int `json:"rpm_anomaly_ips"`
	AnyAnomalyIPs   int `json:"any_anomaly_ips"`
}

type ipAuditAggregate struct {
	firstSeenAt  int64
	lastSeenAt   int64
	requestCount int
	users        map[int]*ipAuditUser
	minutes      map[int64]int
}

func ipAuditPositiveInt(c *gin.Context, key string, fallback, maximum int) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil || value <= 0 {
		return fallback
	}
	if maximum > 0 && value > maximum {
		return maximum
	}
	return value
}

// GetIPAudit aggregates authenticated API request logs by IP address. The
// source data is retained for a maximum of 30 days, matching the dashboard.
func GetIPAudit(c *gin.Context) {
	windowMinutes := ipAuditPositiveInt(c, "window_minutes", ipAuditDefaultWindow, ipAuditRetentionMinutes)
	requestThreshold := ipAuditPositiveInt(c, "request_threshold", ipAuditDefaultRequests, 0)
	userThreshold := ipAuditPositiveInt(c, "user_threshold", ipAuditDefaultUsers, 0)
	rpmThreshold := ipAuditPositiveInt(c, "rpm_threshold", ipAuditDefaultRPM, 0)
	page := ipAuditPositiveInt(c, "page", 1, 0)
	pageSize := ipAuditPositiveInt(c, "page_size", ipAuditDefaultPageSize, ipAuditMaxPageSize)
	query := strings.TrimSpace(c.Query("query"))
	anomaly := c.Query("anomaly")
	sortBy := c.Query("sort")

	start := time.Now().Add(-time.Duration(windowMinutes) * time.Minute).Unix()
	var logs []ipAuditLog
	if err := model.LOG_DB.Model(&model.Log{}).
		Select("ip, user_id, username, created_at").
		Where("created_at >= ? AND type IN ? AND ip <> ''", start, []int{model.LogTypeConsume, model.LogTypeError}).
		Find(&logs).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	aggregates := make(map[string]*ipAuditAggregate)
	allUsers := make(map[int]struct{})
	for _, log := range logs {
		ip := strings.TrimSpace(log.IP)
		if ip == "" || (query != "" && !strings.Contains(strings.ToLower(ip), strings.ToLower(query))) {
			continue
		}
		aggregate := aggregates[ip]
		if aggregate == nil {
			aggregate = &ipAuditAggregate{
				firstSeenAt: log.CreatedAt,
				lastSeenAt:  log.CreatedAt,
				users:       make(map[int]*ipAuditUser),
				minutes:     make(map[int64]int),
			}
			aggregates[ip] = aggregate
		}
		aggregate.requestCount++
		if log.CreatedAt < aggregate.firstSeenAt {
			aggregate.firstSeenAt = log.CreatedAt
		}
		if log.CreatedAt > aggregate.lastSeenAt {
			aggregate.lastSeenAt = log.CreatedAt
		}
		aggregate.minutes[log.CreatedAt/60]++
		user := aggregate.users[log.UserID]
		if user == nil {
			user = &ipAuditUser{UserID: log.UserID, Username: log.Username}
			aggregate.users[log.UserID] = user
		}
		user.RequestCount++
		allUsers[log.UserID] = struct{}{}
	}

	items := make([]ipAuditItem, 0, len(aggregates))
	summary := ipAuditSummary{TotalUsers: len(allUsers)}
	for ip, aggregate := range aggregates {
		peakRPM := 0
		for _, count := range aggregate.minutes {
			if count > peakRPM {
				peakRPM = count
			}
		}
		users := make([]ipAuditUser, 0, len(aggregate.users))
		for _, user := range aggregate.users {
			users = append(users, *user)
		}
		sort.Slice(users, func(i, j int) bool {
			if users[i].RequestCount == users[j].RequestCount {
				return users[i].UserID < users[j].UserID
			}
			return users[i].RequestCount > users[j].RequestCount
		})
		countAnomaly := aggregate.requestCount > requestThreshold || len(users) > userThreshold
		rpmAnomaly := peakRPM > rpmThreshold
		if anomaly == "any" && !countAnomaly && !rpmAnomaly ||
			anomaly == "count" && !countAnomaly ||
			anomaly == "rpm" && !rpmAnomaly ||
			anomaly == "normal" && (countAnomaly || rpmAnomaly) {
			continue
		}
		item := ipAuditItem{
			IP:             ip,
			UserCount:      len(users),
			Users:          users,
			RequestCount:   aggregate.requestCount,
			PeakRPM:        peakRPM,
			FirstSeenAt:    aggregate.firstSeenAt,
			LastSeenAt:     aggregate.lastSeenAt,
			CountAnomaly:   countAnomaly,
			RPMAnomaly:     rpmAnomaly,
			UsersTruncated: len(users) > ipAuditUsersPerItem,
		}
		if item.UsersTruncated {
			item.Users = users[:ipAuditUsersPerItem]
		}
		items = append(items, item)
		summary.TotalRequests += aggregate.requestCount
		if countAnomaly {
			summary.CountAnomalyIPs++
		}
		if rpmAnomaly {
			summary.RPMAnomalyIPs++
		}
		if countAnomaly || rpmAnomaly {
			summary.AnyAnomalyIPs++
		}
	}
	summary.TotalIPs = len(items)

	sort.Slice(items, func(i, j int) bool {
		left, right := items[i], items[j]
		switch sortBy {
		case "requests":
			return left.RequestCount > right.RequestCount
		case "rpm":
			return left.PeakRPM > right.PeakRPM
		case "users":
			return left.UserCount > right.UserCount
		case "recent":
			return left.LastSeenAt > right.LastSeenAt
		default:
			leftRisk := boolToInt(left.RPMAnomaly)*2 + boolToInt(left.CountAnomaly)
			rightRisk := boolToInt(right.RPMAnomaly)*2 + boolToInt(right.CountAnomaly)
			if leftRisk != rightRisk {
				return leftRisk > rightRisk
			}
			return left.RequestCount > right.RequestCount
		}
	})

	total := len(items)
	startIndex := (page - 1) * pageSize
	endIndex := startIndex + pageSize
	if startIndex >= total {
		items = []ipAuditItem{}
	} else {
		if endIndex > total {
			endIndex = total
		}
		items = items[startIndex:endIndex]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"generated_at":   time.Now().Unix(),
			"retention_days": 30,
			"summary":        summary,
			"items":          items,
			"total":          total,
			"page":           page,
			"page_size":      pageSize,
		},
	})
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
