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
import { Gift as GiftIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/i18n/languages'

import { drawCardFace } from './card-face'
import Lanyard, { type LanyardPullState } from './lanyard'

type GiftCardProps = {
  systemName: string
  prizeName: string
  checkedIn: boolean
  checkingIn: boolean
  onCheckin: () => Promise<boolean>
}

export function GiftCard(props: GiftCardProps) {
  const { t, i18n } = useTranslation()
  const requestRef = useRef(false)
  const [checkedIn, setCheckedIn] = useState(props.checkedIn)
  const [pullState, setPullState] = useState<LanyardPullState>('idle')
  const canUseWebGL =
    typeof window !== 'undefined' && 'WebGLRenderingContext' in window

  useEffect(() => {
    if (props.checkedIn) setCheckedIn(true)
  }, [props.checkedIn])

  const activate = useCallback(async () => {
    if (checkedIn || requestRef.current) return checkedIn
    requestRef.current = true
    try {
      const success = await props.onCheckin()
      if (success) setCheckedIn(true)
      return success
    } finally {
      requestRef.current = false
    }
  }, [checkedIn, props])

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(
        toIntlLocale(i18n.resolvedLanguage || i18n.language),
        {
          month: 'short',
          day: 'numeric',
        }
      ).format(new Date()),
    [i18n.language, i18n.resolvedLanguage]
  )

  const cardFace = useMemo(() => {
    if (typeof document === 'undefined') return null
    return drawCardFace({
      systemName: props.systemName,
      eyebrow: t('Daily Check-in'),
      headline: checkedIn
        ? props.prizeName || t('Checked in')
        : t('Check in now'),
      caption: checkedIn
        ? t('Rewards will be added directly to your balance')
        : t('Check in daily to receive random quota rewards'),
      dateLabel,
      checkedIn,
    })
  }, [checkedIn, dateLabel, props.prizeName, props.systemName, t])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    void activate()
  }

  return (
    <section
      className='gift-lanyard'
      data-pull-state={pullState}
      aria-label={t('Daily Check-in')}
    >
      <div className='gift-lanyard__scene'>
        {canUseWebGL ? (
          <Lanyard
            frontFace={cardFace}
            pullDisabled={checkedIn || props.checkingIn}
            onPullStateChange={setPullState}
            onPull={() => void activate()}
          />
        ) : (
          <div className='gift-lanyard__fallback' aria-hidden='true'>
            <span className='gift-lanyard__fallback-cord' />
            <span className='gift-lanyard__fallback-card'>
              <GiftIcon />
              <strong>{props.systemName}</strong>
              <small>{t('Daily Check-in')}</small>
            </span>
          </div>
        )}
      </div>

      <button
        type='button'
        className='gift-lanyard__checkin-control sr-only'
        data-complete={checkedIn}
        disabled={checkedIn || props.checkingIn}
        onClick={() => void activate()}
        onKeyDown={handleKeyDown}
      >
        {checkedIn ? t('Checked in') : t('Check in now')}
      </button>
      <span className='sr-only' aria-live='polite'>
        {checkedIn ? props.prizeName : ''}
      </span>
    </section>
  )
}
