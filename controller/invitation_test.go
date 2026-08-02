package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInvitationControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousRedisEnabled := common.RedisEnabled
	previousMainDatabaseType, previousLogDatabaseType := common.MainDatabaseType(), common.LogDatabaseType()
	previousInvitationRegistrationEnabled := common.InvitationRegistrationEnabled
	previousRegisterEnabled := common.RegisterEnabled
	previousPasswordRegisterEnabled := common.PasswordRegisterEnabled
	previousEmailVerificationEnabled := common.EmailVerificationEnabled
	previousQuotaForNewUser := common.QuotaForNewUser
	previousQuotaForInvitee := common.QuotaForInvitee
	previousQuotaForInviter := common.QuotaForInviter

	common.RedisEnabled = false
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.InvitationRegistrationEnabled = true
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = false
	common.EmailVerificationEnabled = false
	common.QuotaForNewUser = 0
	common.QuotaForInvitee = 0
	common.QuotaForInviter = 0

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Invitation{}, &model.Log{}))
	model.DB, model.LOG_DB = db, db

	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.RedisEnabled = previousRedisEnabled
		common.SetDatabaseTypes(previousMainDatabaseType, previousLogDatabaseType)
		common.InvitationRegistrationEnabled = previousInvitationRegistrationEnabled
		common.RegisterEnabled = previousRegisterEnabled
		common.PasswordRegisterEnabled = previousPasswordRegisterEnabled
		common.EmailVerificationEnabled = previousEmailVerificationEnabled
		common.QuotaForNewUser = previousQuotaForNewUser
		common.QuotaForInvitee = previousQuotaForInvitee
		common.QuotaForInviter = previousQuotaForInviter
	})

	return db
}

func performInvitationCreateRequest(t *testing.T) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/invitation/", strings.NewReader(`{"name":"local-test","count":1}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", 1)
	c.Set("username", "root")
	c.Set("role", common.RoleRootUser)
	CreateInvitations(c)
	return recorder
}

func performInvitationRegisterRequest(t *testing.T, username, code string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := common.Marshal(map[string]string{
		"username":        username,
		"password":        "password123",
		"invitation_code": code,
	})
	require.NoError(t, err)

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/invitation-register", strings.NewReader(string(body)))
	c.Request.Header.Set("Content-Type", "application/json")
	InvitationRegister(c)
	return recorder
}

func TestInvitationCreateRegisterAndRejectReuse(t *testing.T) {
	db := setupInvitationControllerTestDB(t)

	createRecorder := performInvitationCreateRequest(t)
	assert.Equal(t, http.StatusOK, createRecorder.Code)
	var createResponse struct {
		Success bool     `json:"success"`
		Message string   `json:"message"`
		Data    []string `json:"data"`
	}
	require.NoError(t, common.Unmarshal(createRecorder.Body.Bytes(), &createResponse))
	require.True(t, createResponse.Success, createResponse.Message)
	require.Len(t, createResponse.Data, 1)
	code := createResponse.Data[0]

	registerRecorder := performInvitationRegisterRequest(t, "invited-user", code)
	assert.Equal(t, http.StatusOK, registerRecorder.Code)
	var registerResponse struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(registerRecorder.Body.Bytes(), &registerResponse))
	require.True(t, registerResponse.Success, registerResponse.Message)

	var invitation model.Invitation
	require.NoError(t, db.First(&invitation).Error)
	assert.Equal(t, model.InvitationStatusUsed, invitation.Status)
	assert.NotZero(t, invitation.UsedBy)
	assert.NotZero(t, invitation.UsedAt)

	reuseRecorder := performInvitationRegisterRequest(t, "invited-user-two", code)
	assert.Equal(t, http.StatusOK, reuseRecorder.Code)
	var reuseResponse struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(reuseRecorder.Body.Bytes(), &reuseResponse))
	assert.False(t, reuseResponse.Success)
	assert.Contains(t, reuseResponse.Message, "Invitation code")

	var userCount int64
	require.NoError(t, db.Model(&model.User{}).Count(&userCount).Error)
	assert.EqualValues(t, 1, userCount)
}
