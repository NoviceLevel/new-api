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
along with this program. If not, see <https://www.gnu.org/licenses/>

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'

import type {
  ApiResponse,
  CreateInvitationsPayload,
  InvitationPage,
  ListInvitationsParams,
} from './types'

export async function getInvitations(
  params: ListInvitationsParams
): Promise<ApiResponse<InvitationPage>> {
  const res = await api.get('/api/invitation/', { params })
  return res.data
}

export async function createInvitations(
  payload: CreateInvitationsPayload
): Promise<ApiResponse<string[]>> {
  const res = await api.post('/api/invitation/', payload)
  return res.data
}

export async function updateInvitationStatus(
  id: number,
  status: number
): Promise<ApiResponse> {
  const res = await api.patch('/api/invitation/' + id + '/status', { status })
  return res.data
}

export async function deleteInvitation(id: number): Promise<ApiResponse> {
  const res = await api.delete('/api/invitation/' + id)
  return res.data
}
