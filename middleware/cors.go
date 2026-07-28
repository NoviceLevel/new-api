package middleware

import (
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"*"}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins != "" {
		// Explicit origins configured: whitelist them and allow credentials
		config.AllowOrigins = parseOrigins(allowedOrigins)
		config.AllowCredentials = true
		common.SysLog("CORS: using ALLOWED_ORIGINS whitelist: " + allowedOrigins)
	} else {
		// No whitelist configured: allow all origins but WITHOUT credentials.
		// AllowAllOrigins + AllowCredentials is a security risk (any origin
		// can make credentialed requests).
		config.AllowAllOrigins = true
		config.AllowCredentials = false
		common.SysLog("CORS: ALLOWED_ORIGINS not set, falling back to AllowAllOrigins without credentials")
	}

	return cors.New(config)
}

// parseOrigins splits a comma-separated list of origins and trims whitespace.
func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if v := strings.TrimSpace(p); v != "" {
			out = append(out, v)
		}
	}
	return out
}

func Version() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
