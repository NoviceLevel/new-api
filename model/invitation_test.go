package model

import (
	"errors"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInvitationFixture(t *testing.T) string {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&Invitation{}))
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Invitation{}).Error)
	t.Cleanup(func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Invitation{}).Error)
	})

	codes, err := CreateInvitations("invitation-test", 1, 1)
	require.NoError(t, err)
	require.Len(t, codes, 1)
	return codes[0]
}

func TestInvitationCodeConsumesExactlyOnce(t *testing.T) {
	code := setupInvitationFixture(t)

	require.NoError(t, DB.Transaction(func(tx *gorm.DB) error {
		return ConsumeInvitationWithTx(tx, code, 101)
	}))

	err := DB.Transaction(func(tx *gorm.DB) error {
		return ConsumeInvitationWithTx(tx, code, 102)
	})
	require.ErrorIs(t, err, ErrInvitationCodeInvalid)

	var invitation Invitation
	require.NoError(t, DB.First(&invitation).Error)
	assert.Equal(t, InvitationStatusUsed, invitation.Status)
	assert.Equal(t, 101, invitation.UsedBy)
	assert.NotEqual(t, code, invitation.CodeHash)
	assert.Equal(t, code[:8]+"...", invitation.CodePrefix)

	assert.ErrorIs(t, UpdateInvitationStatus(invitation.Id, InvitationStatusAvailable), ErrInvitationCodeInvalid)
	assert.ErrorIs(t, DeleteInvitation(invitation.Id), ErrInvitationCodeInvalid)
}

func TestDisabledInvitationCannotBeConsumed(t *testing.T) {
	code := setupInvitationFixture(t)

	var invitation Invitation
	require.NoError(t, DB.First(&invitation).Error)
	require.NoError(t, UpdateInvitationStatus(invitation.Id, InvitationStatusDisabled))

	err := DB.Transaction(func(tx *gorm.DB) error {
		return ConsumeInvitationWithTx(tx, code, 101)
	})
	require.ErrorIs(t, err, ErrInvitationCodeInvalid)
	require.NoError(t, DeleteInvitation(invitation.Id))
}

func TestInvitationConcurrentConsumptionHasOneWinner(t *testing.T) {
	code := setupInvitationFixture(t)

	const attempts = 5
	results := make(chan error, attempts)
	var wg sync.WaitGroup
	wg.Add(attempts)
	for i := 0; i < attempts; i++ {
		go func(userID int) {
			defer wg.Done()
			results <- DB.Transaction(func(tx *gorm.DB) error {
				return ConsumeInvitationWithTx(tx, code, userID)
			})
		}(i + 1)
	}
	wg.Wait()
	close(results)

	successes := 0
	for err := range results {
		if err == nil {
			successes++
			continue
		}
		assert.True(t, errors.Is(err, ErrInvitationCodeInvalid))
	}
	assert.Equal(t, 1, successes)
}
