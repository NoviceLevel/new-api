package model

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	InvitationStatusAvailable = 1
	InvitationStatusDisabled  = 2
	InvitationStatusUsed      = 3
)

var ErrInvitationCodeInvalid = errors.New("invalid or unavailable invitation code")

type Invitation struct {
	Id         int    `json:"id"`
	Name       string `json:"name" gorm:"type:varchar(40);index"`
	CodeHash   string `json:"-" gorm:"type:char(64);uniqueIndex"`
	CodePrefix string `json:"code_prefix" gorm:"type:varchar(16);index"`
	Status     int    `json:"status" gorm:"default:1;index"`
	CreatedBy  int    `json:"created_by" gorm:"index"`
	UsedBy     int    `json:"used_by" gorm:"index"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
	UsedAt     int64  `json:"used_at" gorm:"bigint"`
}

func invitationHash(code string) string {
	sum := sha256.Sum256([]byte(strings.ToUpper(strings.TrimSpace(code))))
	return hex.EncodeToString(sum[:])
}

func generateInvitationCode() (string, error) {
	bytes := make([]byte, 15)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(bytes)), nil
}

func CreateInvitations(name string, count, createdBy int) ([]string, error) {
	codes := make([]string, 0, count)
	err := DB.Transaction(func(tx *gorm.DB) error {
		for len(codes) < count {
			code, err := generateInvitationCode()
			if err != nil {
				return err
			}
			invitation := Invitation{
				Name:       name,
				CodeHash:   invitationHash(code),
				CodePrefix: code[:8] + "...",
				Status:     InvitationStatusAvailable,
				CreatedBy:  createdBy,
				CreatedAt:  common.GetTimestamp(),
			}
			if err := tx.Create(&invitation).Error; err != nil {
				if errors.Is(err, gorm.ErrDuplicatedKey) {
					continue
				}
				return err
			}
			codes = append(codes, code)
		}
		return nil
	})
	return codes, err
}

func ListInvitations(keyword string, status int, offset, limit int) ([]*Invitation, int64, error) {
	query := DB.Model(&Invitation{})
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		query = query.Where("name LIKE ? OR code_prefix LIKE ?", keyword+"%", keyword+"%")
	}
	if status != 0 {
		query = query.Where("status = ?", status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var invitations []*Invitation
	if err := query.Order("id DESC").Limit(limit).Offset(offset).Find(&invitations).Error; err != nil {
		return nil, 0, err
	}
	return invitations, total, nil
}

func UpdateInvitationStatus(id, status int) error {
	if status != InvitationStatusAvailable && status != InvitationStatusDisabled {
		return errors.New("invalid invitation status")
	}
	result := DB.Model(&Invitation{}).Where("id = ? AND status <> ?", id, InvitationStatusUsed).Update("status", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrInvitationCodeInvalid
	}
	return nil
}

func DeleteInvitation(id int) error {
	result := DB.Where("id = ? AND status <> ?", id, InvitationStatusUsed).Delete(&Invitation{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrInvitationCodeInvalid
	}
	return nil
}

// ConsumeInvitationWithTx atomically assigns the one-time code to a new user.
func ConsumeInvitationWithTx(tx *gorm.DB, code string, userID int) error {
	hash := invitationHash(code)
	invitation := Invitation{}
	if err := lockForUpdate(tx).Where("code_hash = ?", hash).First(&invitation).Error; err != nil {
		return ErrInvitationCodeInvalid
	}
	if invitation.Status != InvitationStatusAvailable {
		return ErrInvitationCodeInvalid
	}
	result := tx.Model(&Invitation{}).
		Where("id = ? AND status = ?", invitation.Id, InvitationStatusAvailable).
		Updates(map[string]any{"status": InvitationStatusUsed, "used_by": userID, "used_at": common.GetTimestamp()})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrInvitationCodeInvalid
	}
	return nil
}
