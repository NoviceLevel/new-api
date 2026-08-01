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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Gift as GiftIcon, RefreshCw } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { SectionPageLayout } from '@/components/layout'
import { Turnstile } from '@/components/turnstile'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCheckinStatus, performCheckin } from '@/features/profile/api'
import type { CheckinStatusResponse } from '@/features/profile/types'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { formatQuotaWithCurrency } from '@/lib/currency'

import { GiftCard } from './gift-card'

import './styles.css'

function GiftEmptyState({ message }: { message: string }) {
  return (
    <div className='text-muted-foreground flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center'>
      <GiftIcon className='size-8' />
      <p className='text-sm'>{message}</p>
    </div>
  )
}

export function Gift() {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const { status, loading: statusLoading } = useStatus()
  const queryClient = useQueryClient()
  const [today, setToday] = useState(() => new Date())
  const [turnstileModalVisible, setTurnstileModalVisible] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const todayString = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    [today]
  )
  const currentMonth = todayString.slice(0, 7)
  const checkinEnabled = status?.checkin_enabled === true
  const turnstileEnabled = !!(
    status?.turnstile_check && status?.turnstile_site_key
  )
  const turnstileSiteKey = status?.turnstile_site_key || ''
  const checkinQueryKey = useMemo(
    () => ['checkin-status', currentMonth] as const,
    [currentMonth]
  )
  const query = useQuery({
    queryKey: checkinQueryKey,
    queryFn: async () => {
      const response = await getCheckinStatus(currentMonth)
      if (response.success && response.data) return response.data
      throw new Error(response.message || t('Failed to fetch checkin status'))
    },
    enabled: checkinEnabled,
    staleTime: 30_000,
  })
  const checkinData = query.data
  const todayAward = checkinData?.stats.records.find(
    (record) => record.checkin_date === todayString
  )?.quota_awarded
  const checkedIn = checkinData?.stats.checked_in_today === true

  useEffect(() => {
    const nextDay = new Date(today)
    nextDay.setHours(24, 0, 0, 0)
    const timer = window.setTimeout(
      () => setToday(new Date()),
      Math.max(nextDay.getTime() - Date.now(), 1_000)
    )
    return () => window.clearTimeout(timer)
  }, [today])

  const checkinMutation = useMutation({
    mutationFn: (token?: string) => performCheckin(token),
  })

  const checkIn = useCallback(
    async (token?: string) => {
      try {
        const response = await checkinMutation.mutateAsync(token)
        if (response.success && response.data) {
          const reward = response.data.quota_awarded
          queryClient.setQueryData<CheckinStatusResponse>(
            checkinQueryKey,
            (current) => {
              if (!current) return current
              const records = current.stats.records.filter(
                (record) => record.checkin_date !== todayString
              )
              return {
                ...current,
                stats: {
                  ...current.stats,
                  checked_in_today: true,
                  total_checkins: current.stats.total_checkins + 1,
                  total_quota: current.stats.total_quota + reward,
                  checkin_count: current.stats.checkin_count + 1,
                  records: [
                    { checkin_date: todayString, quota_awarded: reward },
                    ...records,
                  ],
                },
              }
            }
          )
          setTurnstileModalVisible(false)
          toast.success(
            `${t('Check-in successful! Received')} ${formatQuotaWithCurrency(reward)}`
          )
          return true
        }

        const message = response.message || t('Check-in failed')
        if (!token && turnstileEnabled && message.includes('Turnstile')) {
          setTurnstileModalVisible(true)
          return false
        }
        if (token && turnstileEnabled && message.includes('Turnstile')) {
          setTurnstileWidgetKey((value) => value + 1)
        }
        toast.error(message)
        return false
      } catch {
        toast.error(t('Check-in failed'))
        return false
      }
    },
    [
      checkinMutation,
      checkinQueryKey,
      queryClient,
      t,
      todayString,
      turnstileEnabled,
    ]
  )

  let content: ReactNode
  if (statusLoading || (checkinEnabled && query.isLoading)) {
    content = (
      <div className='gift-stage'>
        <Skeleton className='h-[380px] w-full max-w-[620px] rounded-xl' />
      </div>
    )
  } else if (!checkinEnabled) {
    content = (
      <GiftEmptyState message={t('Daily check-in is currently unavailable')} />
    )
  } else if (query.isError || !checkinData) {
    content = (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>{t('Failed to fetch checkin status')}</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error
            ? query.error.message
            : t('Request failed')}
        </AlertDescription>
      </Alert>
    )
  } else {
    content = (
      <div className='gift-stage'>
        <GiftCard
          key={todayString}
          systemName={systemName}
          prizeName={
            todayAward === undefined
              ? ''
              : `+${formatQuotaWithCurrency(todayAward)}`
          }
          checkedIn={checkedIn}
          checkingIn={checkinMutation.isPending}
          onCheckin={() => checkIn()}
        />
      </div>
    )
  }

  return (
    <>
      <Dialog
        open={turnstileModalVisible}
        onOpenChange={(open) => {
          setTurnstileModalVisible(open)
          if (!open) setTurnstileWidgetKey((value) => value + 1)
        }}
        title={t('Security Check')}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        bodyClassName='space-y-4'
      >
        <div className='text-muted-foreground text-sm'>
          {t('Please complete the security check to continue.')}
        </div>
        <div className='flex justify-center py-4'>
          <Turnstile
            key={turnstileWidgetKey}
            siteKey={turnstileSiteKey}
            onVerify={(token) => void checkIn(token)}
            onExpire={() => setTurnstileWidgetKey((value) => value + 1)}
          />
        </div>
      </Dialog>

      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Daily Check-in')}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={!checkinEnabled || query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw
              className={query.isFetching ? 'animate-spin' : undefined}
            />
            {t('Refresh')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>{content}</SectionPageLayout.Content>
      </SectionPageLayout>
    </>
  )
}
