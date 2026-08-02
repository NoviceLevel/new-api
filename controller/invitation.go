package controller

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type invitationCreateRequest struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

func ListInvitations(c *gin.Context) {
	page := common.GetPageQuery(c)
	status, _ := strconv.Atoi(c.Query("status"))
	items, total, err := model.ListInvitations(c.Query("keyword"), status, page.GetStartIdx(), page.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	page.SetTotal(int(total))
	page.SetItems(items)
	common.ApiSuccess(c, page)
}

func CreateInvitations(c *gin.Context) {
	var request invitationCreateRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	request.Name = strings.TrimSpace(request.Name)
	if utf8.RuneCountInString(request.Name) == 0 || utf8.RuneCountInString(request.Name) > 40 || request.Count < 1 || request.Count > 100 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	codes, err := model.CreateInvitations(request.Name, request.Count, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.create", map[string]any{"name": request.Name, "count": request.Count})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": codes})
}

func UpdateInvitationStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	var request struct {
		Status int `json:"status"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if err := model.UpdateInvitationStatus(id, request.Status); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.status", map[string]any{"id": id, "status": request.Status})
	common.ApiSuccess(c, nil)
}

func DeleteInvitation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if err := model.DeleteInvitation(id); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.delete", map[string]any{"id": id})
	common.ApiSuccess(c, nil)
}

type invitationRegisterRequest struct {
	InvitationCode   string `json:"invitation_code"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	Email            string `json:"email"`
	AffCode          string `json:"aff_code"`
	VerificationCode string `json:"verification_code"`
}

func InvitationRegister(c *gin.Context) {
	if !common.InvitationRegistrationEnabled || !common.RegisterEnabled {
		common.ApiErrorI18n(c, i18n.MsgUserRegisterDisabled)
		return
	}
	var request invitationRegisterRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	request.Username = strings.TrimSpace(request.Username)
	request.Email = model.NormalizeEmail(request.Email)
	request.InvitationCode = strings.TrimSpace(request.InvitationCode)
	if request.Username == "" || request.Password == "" || request.InvitationCode == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user := model.User{Username: request.Username, Password: request.Password}
	if err := common.Validate.Struct(&user); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserInputInvalid, map[string]any{"Error": err.Error()})
		return
	}
	exists, err := model.CheckUserExistOrDeleted(user.Username, "")
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		return
	}
	if exists {
		common.ApiErrorI18n(c, i18n.MsgUserExists)
		return
	}
	if common.EmailVerificationEnabled {
		if request.Email == "" || request.VerificationCode == "" {
			common.ApiErrorI18n(c, i18n.MsgUserEmailVerificationRequired)
			return
		}
		if !common.VerifyCodeWithKey(request.Email, request.VerificationCode, common.EmailVerificationPurpose) {
			common.ApiErrorI18n(c, i18n.MsgUserVerificationCodeError)
			return
		}
		if err := model.EnsureEmailAvailable(request.Email, 0); err != nil {
			if errors.Is(err, model.ErrEmailAlreadyTaken) {
				common.ApiErrorI18n(c, i18n.MsgUserEmailAlreadyTaken)
				return
			}
			common.ApiErrorI18n(c, i18n.MsgDatabaseError)
			return
		}
	}
	inviterId, _ := model.GetUserIdByAffCode(request.AffCode)
	cleanUser := model.User{Username: user.Username, Password: user.Password, DisplayName: user.Username, Role: common.RoleCommonUser, InviterId: inviterId}
	if common.EmailVerificationEnabled {
		cleanUser.Email = request.Email
	}
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		if err := cleanUser.InsertWithTx(tx, inviterId); err != nil {
			return err
		}
		return model.ConsumeInvitationWithTx(tx, request.InvitationCode, cleanUser.Id)
	})
	if err != nil {
		if errors.Is(err, model.ErrInvitationCodeInvalid) {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invitation code is invalid, used, or disabled."})
			return
		}
		common.ApiError(c, err)
		return
	}
	cleanUser.FinishInsert(inviterId)
	common.ApiSuccess(c, nil)
}

func InvitationLogin(c *gin.Context) {
	Login(c)
}
