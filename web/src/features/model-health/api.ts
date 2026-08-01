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
import { api } from '@/lib/api'

import type { ModelHealthData, ModelHealthResponse } from './types'

export async function getModelHealth(): Promise<ModelHealthData> {
  const response = await api.get<ModelHealthResponse>('/api/user/model-health')
  const result = response.data

  if (!result.success || !result.data) {
    throw new Error(result.message || 'Unable to load model health')
  }

  return result.data
}
