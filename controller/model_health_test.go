package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestModelHealthIcon(t *testing.T) {
	tests := []struct {
		name         string
		modelName    string
		metadataIcon string
		vendorIcon   string
		want         string
	}{
		{
			name:         "model icon takes precedence",
			modelName:    "step-3.7-flash",
			metadataIcon: "Custom.Color",
			vendorIcon:   "Stepfun.Color",
			want:         "Custom.Color",
		},
		{
			name:       "uses vendor icon when model icon is empty",
			modelName:  "step-3.7-flash",
			vendorIcon: "Stepfun.Color",
			want:       "Stepfun.Color",
		},
		{
			name:      "uses StepFun family fallback without metadata",
			modelName: "step-3.7-flash",
			want:      "Stepfun",
		},
		{
			name:      "uses family fallback without metadata",
			modelName: "qwen3.6-27b",
			want:      "Qwen.Color",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, modelHealthIcon(tt.modelName, tt.metadataIcon, tt.vendorIcon))
		})
	}
}
