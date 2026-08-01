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
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, HeartPulse, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { getModelHealth } from './api'
import { getHealthTone, summarizeModelHealth, type HealthTone } from './lib'
import type { ModelHealthBucket, ModelHealthModel } from './types'

const toneClasses: Record<HealthTone, string> = {
  idle: 'border-border/60 bg-muted/60 text-muted-foreground',
  healthy:
    'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  degraded:
    'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  unhealthy: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
}

function formatHour(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    hour12: false,
  }).format(new Date(timestamp * 1000))
}

function formatGeneratedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function formatSuccessRate(rate: number) {
  return `${rate.toFixed(rate >= 99.95 ? 0 : 1)}%`
}

function HealthCell({ bucket }: { bucket: ModelHealthBucket }) {
  const { t } = useTranslation()
  const tone = getHealthTone(bucket.total_count, bucket.success_rate)
  const label =
    bucket.total_count === 0
      ? t('No requests')
      : `${formatSuccessRate(bucket.success_rate)} - ${bucket.success_count}/${bucket.total_count}`

  return (
    <td className='px-0.5 py-2 text-center'>
      <div
        className={cn(
          'mx-auto flex size-8 items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums',
          toneClasses[tone]
        )}
        title={label}
        aria-label={label}
      >
        {bucket.total_count === 0 ? '-' : Math.round(bucket.success_rate)}
      </div>
    </td>
  )
}

function HealthRow({ model }: { model: ModelHealthModel }) {
  const summary = summarizeModelHealth(model.buckets)
  const tone = getHealthTone(summary.totalCount, summary.successRate)

  return (
    <tr className='border-t first:border-t-0'>
      <th
        scope='row'
        className='bg-background/95 sticky left-0 z-10 min-w-56 px-3 py-2 text-left font-medium backdrop-blur-sm'
      >
        <div className='flex min-w-0 items-center gap-2'>
          <span className='shrink-0'>{getLobeIcon(model.icon, 20)}</span>
          <span
            className='truncate'
            title={model.display_name || model.model_name}
          >
            {model.display_name || model.model_name}
          </span>
        </div>
      </th>
      <td className='text-muted-foreground w-20 px-2 py-2 text-center font-mono text-xs tabular-nums'>
        {model.channel_id}
      </td>
      {model.buckets.map((bucket) => (
        <HealthCell key={bucket.hour} bucket={bucket} />
      ))}
      <td className='w-24 px-2 py-2 text-center'>
        <span
          className={cn(
            'inline-flex min-w-14 justify-center rounded-md border px-1.5 py-1 text-xs font-semibold tabular-nums',
            toneClasses[tone]
          )}
        >
          {summary.totalCount === 0
            ? '-'
            : formatSuccessRate(summary.successRate)}
        </span>
      </td>
      <td className='w-24 px-3 py-2 text-right text-xs font-medium tabular-nums'>
        {summary.totalCount.toLocaleString()}
      </td>
    </tr>
  )
}

function LoadingRows() {
  return (
    <div className='space-y-2 rounded-md border p-3'>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className='h-10 w-full' />
      ))}
    </div>
  )
}

export function ModelHealth() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['model-health'],
    queryFn: getModelHealth,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
  const data = query.data
  const hours = data?.models[0]?.buckets ?? []
  let content: ReactNode

  if (query.isLoading) {
    content = <LoadingRows />
  } else if (query.isError) {
    content = (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>{t('Unable to load model health')}</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error
            ? query.error.message
            : t('Request failed')}
        </AlertDescription>
      </Alert>
    )
  } else if (!data || data.models.length === 0) {
    content = (
      <div className='text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center'>
        <HeartPulse className='size-8' />
        <p className='text-sm'>{t('No model health data')}</p>
      </div>
    )
  } else {
    content = (
      <div className='bg-card/70 overflow-x-auto rounded-md border'>
        <table className='w-full min-w-[1320px] border-collapse text-sm'>
          <thead className='bg-muted/60 text-muted-foreground'>
            <tr>
              <th
                scope='col'
                className='bg-muted sticky left-0 z-20 min-w-56 px-3 py-2 text-left text-xs font-medium'
              >
                {t('Model')}
              </th>
              <th
                scope='col'
                className='w-20 px-2 py-2 text-center text-xs font-medium'
              >
                {t('Channel')}
              </th>
              {hours.map((bucket) => (
                <th
                  key={bucket.hour}
                  scope='col'
                  className='w-9 px-0.5 py-2 text-center text-[10px] font-medium tabular-nums'
                >
                  {formatHour(bucket.hour)}
                </th>
              ))}
              <th
                scope='col'
                className='w-24 px-2 py-2 text-center text-xs font-medium'
              >
                {t('Success Rate')}
              </th>
              <th
                scope='col'
                className='w-24 px-3 py-2 text-right text-xs font-medium'
              >
                {t('Request Count')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.models.map((model) => (
              <HealthRow
                key={`${model.model_name}:${model.channel_id}`}
                model={model}
              />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Model health')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        {data && (
          <span className='text-muted-foreground hidden text-xs tabular-nums sm:inline'>
            {t('Updated at {{time}}', {
              time: formatGeneratedAt(data.generated_at),
            })}
          </span>
        )}
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className={cn(query.isFetching && 'animate-spin')} />
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>{content}</SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
