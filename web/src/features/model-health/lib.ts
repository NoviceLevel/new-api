/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { ModelHealthBucket, ModelHealthModel } from './types'

export type HealthTone = 'idle' | 'healthy' | 'degraded' | 'unhealthy'

export type FleetHealthSummary = {
  totalModels: number
  activeModels: number
  totalCount: number
  successCount: number
  successRate: number
  tone: HealthTone
}

export function summarizeModelHealth(buckets: ModelHealthBucket[]) {
  const totals = buckets.reduce(
    (result, bucket) => ({
      totalCount: result.totalCount + bucket.total_count,
      successCount: result.successCount + bucket.success_count,
    }),
    { totalCount: 0, successCount: 0 }
  )

  return {
    ...totals,
    successRate:
      totals.totalCount === 0
        ? 0
        : (totals.successCount / totals.totalCount) * 100,
  }
}

export function getHealthTone(
  totalCount: number,
  successRate: number
): HealthTone {
  if (totalCount === 0) return 'idle'
  if (successRate >= 99) return 'healthy'
  if (successRate >= 95) return 'degraded'
  return 'unhealthy'
}

export function summarizeFleetHealth(
  models: ModelHealthModel[]
): FleetHealthSummary {
  const totals = models.reduce(
    (result, model) => {
      const summary = summarizeModelHealth(model.buckets)
      return {
        activeModels: result.activeModels + (summary.totalCount > 0 ? 1 : 0),
        totalCount: result.totalCount + summary.totalCount,
        successCount: result.successCount + summary.successCount,
      }
    },
    { activeModels: 0, totalCount: 0, successCount: 0 }
  )
  const successRate =
    totals.totalCount === 0
      ? 0
      : (totals.successCount / totals.totalCount) * 100

  return {
    totalModels: models.length,
    ...totals,
    successRate,
    tone: getHealthTone(totals.totalCount, successRate),
  }
}

export function formatHealthHour(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    hour12: false,
  }).format(new Date(timestamp * 1000))
}

export function formatHealthRate(rate: number) {
  return `${rate.toFixed(rate >= 99.95 ? 0 : 1)}%`
}
