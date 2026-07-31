package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChooseDBAllowsDefaultSQLiteModes(t *testing.T) {
	previousSQLitePath := common.SQLitePath
	common.SQLitePath = "file:database-selection-test?mode=memory&cache=shared"
	t.Cleanup(func() {
		common.SQLitePath = previousSQLitePath
	})

	for _, dsn := range []string{"", "local", "sqlite"} {
		t.Run(dsn, func(t *testing.T) {
			t.Setenv("TEST_SQL_DSN", dsn)
			db, databaseType, err := chooseDB("TEST_SQL_DSN", false)
			require.NoError(t, err)
			require.NotNil(t, db)
			assert.Equal(t, common.DatabaseTypeSQLite, databaseType)
		})
	}
}
