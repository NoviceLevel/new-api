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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getHealthTone, summarizeModelHealth } from './lib'

describe('model health presentation', () => {
  test('aggregates request totals and success rate across hourly buckets', () => {
    const summary = summarizeModelHealth([
      {
        hour: 1,
        total_count: 80,
        success_count: 78,
        probe_count: 0,
        success_rate: 97.5,
      },
      {
        hour: 2,
        total_count: 20,
        success_count: 19,
        probe_count: 0,
        success_rate: 95,
      },
    ])

    assert.deepEqual(summary, {
      totalCount: 100,
      successCount: 97,
      successRate: 97,
    })
  })

  test('classifies empty, healthy, degraded, and unhealthy buckets', () => {
    assert.equal(getHealthTone(0, 0), 'idle')
    assert.equal(getHealthTone(10, 99), 'healthy')
    assert.equal(getHealthTone(10, 95), 'degraded')
    assert.equal(getHealthTone(10, 94.9), 'unhealthy')
  })
})
