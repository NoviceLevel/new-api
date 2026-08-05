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
import { Route } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import {
  formatHealthHour,
  formatHealthRate,
  getHealthTone,
  summarizeModelHealth,
  type HealthTone,
} from './lib'
import type { ModelHealthBucket, ModelHealthModel } from './types'

const cellClasses: Record<HealthTone, string> = {
  idle: 'border-border/50 bg-muted/70',
  healthy: 'border-emerald-600/20 bg-emerald-500/75',
  degraded: 'border-amber-600/25 bg-amber-500/75',
  unhealthy: 'border-red-600/25 bg-red-500/80',
}

const badgeClasses: Record<HealthTone, string> = {
  idle: 'border-border bg-muted text-muted-foreground',
  healthy:
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  degraded:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  unhealthy: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

const dotClasses: Record<HealthTone, string> = {
  idle: 'bg-muted-foreground/55',
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  unhealthy: 'bg-red-500',
}

function toneLabel(tone: HealthTone) {
  if (tone === 'healthy') return 'Healthy'
  if (tone === 'degraded') return 'Warning'
  if (tone === 'unhealthy') return 'Error'
  return 'No requests'
}

function toneDescription(tone: HealthTone) {
  if (tone === 'healthy') return '24h success rate ≥ 95%'
  if (tone === 'degraded') return '24h success rate between 80% and 95%'
  if (tone === 'unhealthy') return '24h success rate < 80%'
  return 'No request activity in the last 24h'
}

function bucketLabel(bucket: ModelHealthBucket, noRequests: string) {
  if (bucket.total_count === 0) {
    return `${formatHealthHour(bucket.hour)}:00 - ${noRequests}`
  }
  return `${formatHealthHour(bucket.hour)}:00 - ${formatHealthRate(bucket.success_rate)} (${bucket.success_count}/${bucket.total_count})`
}

export function ModelHealthRow(props: { model: ModelHealthModel }) {
  const { t } = useTranslation()
  const summary = summarizeModelHealth(props.model.buckets)
  const tone = getHealthTone(summary.totalCount, summary.successRate)
  const firstBucket = props.model.buckets[0]
  const lastBucket = props.model.buckets.at(-1)

  return (
    <TooltipProvider delay={0}>
      <article className='border-b px-3 py-3.5 last:border-b-0 sm:px-4 sm:py-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border'>
              {getLobeIcon(props.model.icon, 22)}
            </span>
            <div className='min-w-0'>
              <h3
                className='truncate text-sm font-semibold'
                title={props.model.display_name || props.model.model_name}
              >
                {props.model.display_name || props.model.model_name}
              </h3>
              <div className='text-muted-foreground mt-1 flex items-center gap-1.5 text-xs'>
                <Route className='size-3.5' aria-hidden='true' />
                <span>
                  {t('Channel')} {props.model.channel_id}
                </span>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-4 sm:gap-6'>
            <div className='text-right'>
              <div className='text-muted-foreground text-[10px] font-medium sm:text-xs'>
                {t('Success rate')}
              </div>
              <div className='mt-0.5 font-mono text-sm font-semibold tabular-nums'>
                {summary.totalCount === 0
                  ? '-'
                  : formatHealthRate(summary.successRate)}
              </div>
            </div>
            <div className='text-right'>
              <div className='text-muted-foreground text-[10px] font-medium sm:text-xs'>
                {t('Requests (24h)')}
              </div>
              <div className='mt-0.5 font-mono text-sm font-semibold tabular-nums'>
                {summary.totalCount.toLocaleString()}
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      'inline-flex h-7 cursor-help items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors',
                      badgeClasses[tone]
                    )}
                  />
                }
              >
                <span
                  className={cn('size-1.5 rounded-full', dotClasses[tone])}
                  aria-hidden='true'
                />
                {t(toneLabel(tone))}
              </TooltipTrigger>
              <TooltipContent side='top' className='text-xs'>
                {t(toneDescription(tone))}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className='mt-3.5'>
          <div className='text-muted-foreground mb-1.5 flex items-center justify-between text-[10px] sm:text-xs'>
            <span>{t('Last 24h usage')}</span>
            {firstBucket && lastBucket && (
              <span className='font-mono tabular-nums'>
                {formatHealthHour(firstBucket.hour)}:00 -{' '}
                {formatHealthHour(lastBucket.hour)}:59
              </span>
            )}
          </div>
          <div className='grid grid-cols-12 gap-1 sm:grid-cols-24'>
            {props.model.buckets.map((bucket, index) => {
              const bucketTone = getHealthTone(
                bucket.total_count,
                bucket.success_rate
              )
              const label = bucketLabel(bucket, t('No requests'))
              return (
                <Tooltip key={bucket.hour}>
                  <TooltipTrigger
                    render={
                      <span
                        className={cn(
                          'h-4 cursor-pointer rounded-[3px] border transition-transform hover:z-10 hover:scale-110 sm:h-5',
                          cellClasses[bucketTone],
                          index === props.model.buckets.length - 1 &&
                            'ring-foreground/15 ring-1 ring-offset-1 ring-offset-background'
                        )}
                        title={label}
                        aria-label={label}
                      />
                    }
                  />
                  <TooltipContent side='top' className='flex flex-col gap-1 p-2 text-xs'>
                    <div className='font-mono font-medium'>
                      {formatHealthHour(bucket.hour)}:00 -{' '}
                      {formatHealthHour(bucket.hour)}:59
                    </div>
                    {bucket.total_count === 0 ? (
                      <div className='opacity-80'>{t('No requests')}</div>
                    ) : (
                      <div className='space-y-0.5 opacity-90'>
                        <div>
                          {t('Success rate')}:{' '}
                          <span className='font-mono font-semibold'>
                            {formatHealthRate(bucket.success_rate)}
                          </span>
                        </div>
                        <div className='font-mono text-[11px] opacity-80'>
                          {bucket.success_count} / {bucket.total_count}{' '}
                          {t('requests')}
                        </div>
                        {bucket.probe_count > 0 && (
                          <div className='font-mono text-[11px] opacity-80'>
                            {bucket.probe_count} {t('probes')}
                          </div>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </article>
    </TooltipProvider>
  )
}
