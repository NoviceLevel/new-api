package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestEnsureSubscriptionPlanTableSQLiteIncludesDeletionState(t *testing.T) {
	previousDB := DB
	previousType := common.MainDatabaseType()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	DB = db
	common.SetMainDatabaseType(common.DatabaseTypeSQLite)
	t.Cleanup(func() {
		DB = previousDB
		common.SetMainDatabaseType(previousType)
	})

	require.NoError(t, ensureSubscriptionPlanTableSQLite())
	require.True(t, db.Migrator().HasColumn(&SubscriptionPlan{}, "DeletionScheduledAt"))
	require.True(t, db.Migrator().HasColumn(&SubscriptionPlan{}, "EnabledBeforeDeletion"))
}
