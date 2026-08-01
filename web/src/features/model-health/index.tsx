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
import {
  Activity,
  AlertCircle,
  Boxes,
  Gauge,
  HeartPulse,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { getModelHealth } from './api'
import {
  formatHealthRate,
  getHealthTone,
  summarizeFleetHealth,
  summarizeModelHealth,
  type HealthTone,
} from './lib'
import { ModelHealthRow } from './model-health-row'
import type { ModelHealthModel } from './types'

type HealthFilter = 'all' | HealthTone

const filters: Array<{ value: HealthFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'degraded', label: 'Warning' },
  { value: 'unhealthy', label: 'Error' },
  { value: 'idle', label: 'No requests' },
]

const toneTextClasses: Record<HealthTone, string> = {
  idle: 'text-muted-foreground',
  healthy: 'text-emerald-600 dark:text-emerald-400',
  degraded: 'text-amber-600 dark:text-amber-400',
  unhealthy: 'text-red-600 dark:text-red-400',
}

const toneSortOrder: Record<HealthTone, number> = {
  unhealthy: 0,
  degraded: 1,
  healthy: 2,
  idle: 3,
}

function toneLabel(tone: HealthTone) {
  if (tone === 'healthy') return 'Healthy'
  if (tone === 'degraded') return 'Warning'
  if (tone === 'unhealthy') return 'Error'
  return 'No requests'
}

function toneIconBadge(tone: HealthTone): IconBadgeTone {
  if (tone === 'unhealthy') return 'destructive'
  if (tone === 'degraded') return 'warning'
  if (tone === 'healthy') return 'success'
  return 'neutral'
}

function formatGeneratedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function LoadingState() {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-24 w-full rounded-lg' />
      <Skeleton className='h-12 w-full rounded-lg' />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className='h-32 w-full rounded-lg' />
      ))}
    </div>
  )
}

function SummaryMetric(props: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  tone: IconBadgeTone
  valueClassName?: string
}) {
  const Icon = props.icon
  return (
    <div className='flex min-w-0 items-center gap-3 border-b p-3 last:border-b-0 sm:p-4 md:border-r md:border-b-0 md:last:border-r-0'>
      <IconBadge tone={props.tone} size='md'>
        <Icon />
      </IconBadge>
      <div className='min-w-0'>
        <div className='text-muted-foreground truncate text-[11px] font-medium sm:text-xs'>
          {props.label}
        </div>
        <div
          className={cn(
            'mt-0.5 truncate font-mono text-base font-semibold tabular-nums',
            props.valueClassName
          )}
        >
          {props.value}
        </div>
      </div>
    </div>
  )
}

function filterModels(
  models: ModelHealthModel[],
  filter: HealthFilter,
  search: string
) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  return models
    .filter((model) => {
      const summary = summarizeModelHealth(model.buckets)
      const tone = getHealthTone(summary.totalCount, summary.successRate)
      if (filter !== 'all' && tone !== filter) return false
      if (!normalizedSearch) return true
      return `${model.display_name || ''} ${model.model_name} ${model.channel_id}`
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    })
    .sort((left, right) => {
      const leftSummary = summarizeModelHealth(left.buckets)
      const rightSummary = summarizeModelHealth(right.buckets)
      const leftTone = getHealthTone(
        leftSummary.totalCount,
        leftSummary.successRate
      )
      const rightTone = getHealthTone(
        rightSummary.totalCount,
        rightSummary.successRate
      )
      return (
        toneSortOrder[leftTone] - toneSortOrder[rightTone] ||
        rightSummary.totalCount - leftSummary.totalCount ||
        left.model_name.localeCompare(right.model_name)
      )
    })
}

export function ModelHealth() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<HealthFilter>('all')
  const healthQuery = useQuery({
    queryKey: ['model-health'],
    queryFn: getModelHealth,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
  const data = healthQuery.data
  const fleet = useMemo(
    () => summarizeFleetHealth(data?.models ?? []),
    [data?.models]
  )
  const visibleModels = useMemo(
    () => filterModels(data?.models ?? [], filter, search),
    [data?.models, filter, search]
  )
  let content: ReactNode

  if (healthQuery.isLoading) {
    content = <LoadingState />
  } else if (healthQuery.isError) {
    content = (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>{t('Unable to load model health')}</AlertTitle>
        <AlertDescription>
          {healthQuery.error instanceof Error
            ? healthQuery.error.message
            : t('Request failed')}
        </AlertDescription>
      </Alert>
    )
  } else if (!data || data.models.length === 0) {
    content = (
      <div className='text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center'>
        <HeartPulse className='size-8' />
        <p className='text-sm'>{t('No model health data')}</p>
      </div>
    )
  } else {
    content = (
      <div className='space-y-3'>
        <section className='bg-card grid overflow-hidden rounded-lg border sm:grid-cols-2 md:grid-cols-4'>
          <SummaryMetric
            icon={HeartPulse}
            label={t('Status')}
            value={t(toneLabel(fleet.tone))}
            tone={toneIconBadge(fleet.tone)}
            valueClassName={toneTextClasses[fleet.tone]}
          />
          <SummaryMetric
            icon={Boxes}
            label={t('Active models')}
            value={`${fleet.activeModels}/${fleet.totalModels}`}
            tone='info'
          />
          <SummaryMetric
            icon={Activity}
            label={t('Requests (24h)')}
            value={fleet.totalCount.toLocaleString()}
            tone='primary'
          />
          <SummaryMetric
            icon={Gauge}
            label={t('Success rate')}
            value={
              fleet.totalCount === 0 ? '-' : formatHealthRate(fleet.successRate)
            }
            tone='chart-4'
            valueClassName={toneTextClasses[fleet.tone]}
          />
        </section>

        <section className='bg-card overflow-hidden rounded-lg border'>
          <div className='flex flex-col gap-2.5 border-b p-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative w-full sm:max-w-64'>
              <Search
                className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2'
                aria-hidden='true'
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Search models...')}
                className='pl-8'
                aria-label={t('Search models')}
              />
            </div>
            <div
              className='bg-muted/70 flex max-w-full gap-0.5 overflow-x-auto rounded-lg p-0.5'
              aria-label={t('Status')}
            >
              {filters.map((item) => (
                <button
                  key={item.value}
                  type='button'
                  aria-pressed={filter === item.value}
                  className={cn(
                    'text-muted-foreground h-7 shrink-0 rounded-md border border-transparent px-2.5 text-xs font-medium transition-colors',
                    filter === item.value &&
                      'border-border bg-background text-foreground'
                  )}
                  onClick={() => setFilter(item.value)}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
          </div>

          {visibleModels.length === 0 ? (
            <div className='text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 text-center'>
              <Search className='size-6' aria-hidden='true' />
              <p className='text-sm'>{t('No results found')}</p>
            </div>
          ) : (
            <div role='list'>
              {visibleModels.map((model) => (
                <div
                  key={`${model.model_name}:${model.channel_id}`}
                  role='listitem'
                >
                  <ModelHealthRow model={model} />
                </div>
              ))}
            </div>
          )}
        </section>
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
          disabled={healthQuery.isFetching}
          onClick={() => healthQuery.refetch()}
        >
          <RefreshCw className={cn(healthQuery.isFetching && 'animate-spin')} />
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>{content}</SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
