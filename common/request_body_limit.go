package common

import "github.com/QuantumNous/new-api/constant"

const defaultAnonymousRequestBodyLimitKB = 512
const defaultWebhookRequestBodyLimitKB = 10240 // 10MB for payment webhooks with line items

func GetAnonymousRequestBodyLimitBytes() int64 {
	limitKB := constant.AnonymousRequestBodyLimitKB
	if limitKB < 0 {
		limitKB = defaultAnonymousRequestBodyLimitKB
	}
	return int64(limitKB) << 10
}

func GetWebhookRequestBodyLimitBytes() int64 {
	limitKB := constant.WebhookRequestBodyLimitKB
	if limitKB < 0 {
		limitKB = defaultWebhookRequestBodyLimitKB
	}
	return int64(limitKB) << 10
}
