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
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

import { getDailyGift, redeemDailyGift, scratchDailyGift } from './api'
import { GiftCard } from './gift-card'
import type { DailyGift } from './types'

import './styles.css'

const giftQueryKey = ['daily-gift'] as const

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
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: giftQueryKey,
    queryFn: getDailyGift,
    staleTime: 30_000,
  })
  const gift = query.data

  useEffect(() => {
    if (!gift?.expires_at) return
    const delay = Math.min(
      Math.max(gift.expires_at * 1000 - Date.now(), 0),
      2_147_483_647
    )
    const timer = window.setTimeout(() => query.refetch(), delay)
    return () => window.clearTimeout(timer)
  }, [gift?.expires_at, query])

  const updateGift = (nextGift: DailyGift) => {
    queryClient.setQueryData(giftQueryKey, nextGift)
  }

  const scratchMutation = useMutation({
    mutationFn: scratchDailyGift,
    onSuccess: updateGift,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t('Unable to scratch the card')
      )
    },
  })

  const redeemMutation = useMutation({
    mutationFn: redeemDailyGift,
    onSuccess: (nextGift) => {
      updateGift(nextGift)
      toast.success(
        t('{{plan}} is now active', {
          plan: nextGift.prize.name || t('Subscription'),
        })
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Unable to activate the gift')
      )
    },
  })

  let content: ReactNode
  if (query.isLoading) {
    content = (
      <div className='gift-stage'>
        <Skeleton className='h-[500px] w-full max-w-[720px] rounded-lg' />
      </div>
    )
  } else if (query.isError || !gift) {
    content = (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>{t("Unable to load today's gift")}</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error
            ? query.error.message
            : t('Request failed')}
        </AlertDescription>
      </Alert>
    )
  } else if (!gift.configured) {
    content = <GiftEmptyState message={t('No gift plan is available')} />
  } else if (!gift.enabled && !gift.scratched) {
    content = (
      <GiftEmptyState message={t('Daily gift is currently unavailable')} />
    )
  } else {
    content = (
      <div className='gift-stage'>
        <GiftCard
          systemName={systemName}
          prizeName={gift.prize.name}
          scratched={gift.scratched}
          redeemed={gift.redeemed}
          scratching={scratchMutation.isPending}
          redeeming={redeemMutation.isPending}
          onScratch={async () => {
            await scratchMutation.mutateAsync()
          }}
          onRedeem={() => redeemMutation.mutate()}
        />
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Gift')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={query.isFetching}
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
  )
}
