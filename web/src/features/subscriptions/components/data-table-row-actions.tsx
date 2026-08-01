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
import type { Row } from '@tanstack/react-table'
import { Pencil, Power, PowerOff, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { cancelPlanDeletion } from '../api'
import type { PlanRecord } from '../types'
import { useSubscriptions } from './subscriptions-provider'

interface DataTableRowActionsProps {
  row: Row<PlanRecord>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow, complianceConfirmed, triggerRefresh } =
    useSubscriptions()
  const isEnabled = row.original.plan.enabled
  const deletionScheduled = row.original.plan.deletion_scheduled_at > 0
  const toggleLabel = isEnabled ? t('Disable') : t('Enable')

  const handleEdit = () => {
    setCurrentRow(row.original)
    setOpen('update')
  }

  const handleToggleStatus = () => {
    setCurrentRow(row.original)
    setOpen('toggle-status')
  }

  const handleResetSubscriptions = () => {
    setCurrentRow(row.original)
    setOpen('reset-subscriptions')
  }

  const handleDelete = () => {
    setCurrentRow(row.original)
    setOpen('delete')
  }

  const handleCancelDeletion = async () => {
    try {
      const result = await cancelPlanDeletion(row.original.plan.id)
      if (!result.success) {
        throw new Error(result.message || t('Operation failed'))
      }
      toast.success('已取消自动删除')
      triggerRefresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Operation failed')
      )
    }
  }

  if (deletionScheduled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!complianceConfirmed}
              onClick={handleCancelDeletion}
              aria-label='取消自动删除'
              className='text-warning hover:text-warning'
            />
          }
        >
          <Undo2 />
        </TooltipTrigger>
        <TooltipContent>取消自动删除</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className='-ml-1.5 flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!complianceConfirmed}
              onClick={handleEdit}
              aria-label={t('Edit')}
            />
          }
        >
          <Pencil />
        </TooltipTrigger>
        <TooltipContent>{t('Edit')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!complianceConfirmed}
              onClick={handleResetSubscriptions}
              aria-label={t('Reset subscription quota')}
            />
          }
        >
          <RotateCcw />
        </TooltipTrigger>
        <TooltipContent>{t('Reset subscription quota')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!complianceConfirmed}
              onClick={handleToggleStatus}
              aria-label={toggleLabel}
              className={
                isEnabled
                  ? 'text-destructive hover:text-destructive'
                  : 'text-success hover:text-success'
              }
            />
          }
        >
          {isEnabled ? <PowerOff /> : <Power />}
        </TooltipTrigger>
        <TooltipContent>{toggleLabel}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!complianceConfirmed}
              onClick={handleDelete}
              aria-label={t('Delete')}
              className='text-destructive hover:text-destructive'
            />
          }
        >
          <Trash2 />
        </TooltipTrigger>
        <TooltipContent>{t('Delete')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
