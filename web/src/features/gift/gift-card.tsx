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
import { CheckCircle2, Gift as GiftIcon, Sparkles, Ticket } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

type GiftCardProps = {
  systemName: string
  prizeName: string
  checkedIn: boolean
  checkingIn: boolean
  onScratch: () => Promise<boolean>
}

type Point = { x: number; y: number }

const REVEAL_THRESHOLD = 0.45

export function GiftCard(props: GiftCardProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const scratchRequestRef = useRef(false)
  const startedLocallyRef = useRef(false)
  const previousPointRef = useRef<Point | null>(null)
  const [revealed, setRevealed] = useState(props.checkedIn)

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container || revealed) return

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    const ratio = window.devicePixelRatio || 1
    const bounds = container.getBoundingClientRect()
    canvas.width = Math.round(bounds.width * ratio)
    canvas.height = Math.round(bounds.height * ratio)
    canvas.style.width = `${bounds.width}px`
    canvas.style.height = `${bounds.height}px`

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = '#e5efec'
    context.fillRect(0, 0, bounds.width, bounds.height)
    context.fillStyle = 'rgba(43, 109, 95, 0.07)'
    for (let x = 0; x < bounds.width; x += 5) {
      for (let y = 0; y < bounds.height; y += 5) {
        if ((x + y) % 15 === 0) context.fillRect(x, y, 2, 2)
      }
    }
    context.strokeStyle = 'rgba(43, 109, 95, 0.035)'
    context.lineWidth = 1
    for (let x = -bounds.height; x < bounds.width; x += 18) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x + bounds.height, bounds.height)
      context.stroke()
    }
    context.font =
      '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    context.fillStyle = '#47776e'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(
      t('Scratch to reveal your gift'),
      bounds.width / 2,
      bounds.height / 2
    )
    context.globalCompositeOperation = 'destination-out'
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.lineWidth = 26
  }, [revealed, t])

  useEffect(() => {
    if (props.checkedIn && !startedLocallyRef.current) {
      setRevealed(true)
    }
  }, [props.checkedIn])

  useEffect(() => {
    initializeCanvas()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(initializeCanvas)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [initializeCanvas])

  const ensureScratched = useCallback(async () => {
    if (props.checkedIn || scratchRequestRef.current) return props.checkedIn
    scratchRequestRef.current = true
    startedLocallyRef.current = true
    try {
      const checkedIn = await props.onScratch()
      if (!checkedIn) startedLocallyRef.current = false
      return checkedIn
    } catch {
      startedLocallyRef.current = false
      return false
    } finally {
      scratchRequestRef.current = false
    }
  }, [props])

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  const scratchPoint = (point: Point) => {
    const context = canvasRef.current?.getContext('2d', {
      willReadFrequently: true,
    })
    if (!context) return
    context.beginPath()
    context.arc(point.x, point.y, 13, 0, Math.PI * 2)
    context.fill()
  }

  const revealIfComplete = () => {
    if (!drawingRef.current || revealed) return
    drawingRef.current = false
    previousPointRef.current = null

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !context) return
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let transparent = 0
    let sampled = 0
    for (let index = 3; index < pixels.length; index += 16) {
      sampled += 1
      if (pixels[index] < 128) transparent += 1
    }
    if (sampled === 0 || transparent / sampled < REVEAL_THRESHOLD) return

    setRevealed(true)
  }

  const handlePointerDown = async (event: PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return
    event.preventDefault()
    const point = pointFromEvent(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    previousPointRef.current = point
    if (!(await ensureScratched())) {
      drawingRef.current = false
      previousPointRef.current = null
      return
    }
    scratchPoint(point)
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || props.checkingIn || revealed) return
    event.preventDefault()
    const point = pointFromEvent(event)
    const previous = previousPointRef.current
    const context = canvasRef.current?.getContext('2d', {
      willReadFrequently: true,
    })
    if (context && previous) {
      context.beginPath()
      context.moveTo(previous.x, previous.y)
      context.lineTo(point.x, point.y)
      context.stroke()
    }
    previousPointRef.current = point
  }

  const handleKeyDown = async (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (await ensureScratched()) {
      setRevealed(true)
    }
  }

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  return (
    <article className='gift-scratch-card'>
      <header className='gift-scratch-card__header'>
        <div className='gift-scratch-card__topline'>
          <div className='gift-scratch-card__brand'>
            <span className='gift-scratch-card__brand-mark' aria-hidden='true'>
              <GiftIcon />
            </span>
            <span>{props.systemName}</span>
          </div>
          <time>{todayLabel}</time>
        </div>
        <div className='gift-scratch-card__title-row'>
          <div>
            <h3>{t('Daily Check-in')}</h3>
            <p>{t('Check in daily to receive random quota rewards')}</p>
          </div>
          <div
            className='gift-scratch-card__status'
            data-complete={revealed}
            aria-live='polite'
          >
            {revealed ? (
              <CheckCircle2 aria-hidden='true' />
            ) : (
              <Sparkles aria-hidden='true' />
            )}
            <span>{revealed ? t('Checked in') : t('Check in now')}</span>
          </div>
        </div>
      </header>

      <div className='gift-scratch-card__scratch-area'>
        <div className='gift-scratch-card__ticket-label'>
          <Ticket aria-hidden='true' />
          <span>{t("Today's gift")}</span>
        </div>
        <div className='gift-scratch-card__prize'>
          <span className='gift-scratch-card__prize-icon' aria-hidden='true'>
            <GiftIcon />
          </span>
          <span>{t('Check-in Rewards')}</span>
          <strong>{props.prizeName || t('A daily surprise')}</strong>
        </div>
        <canvas
          ref={canvasRef}
          role='button'
          tabIndex={revealed ? -1 : 0}
          aria-label={t('Check in now')}
          aria-busy={props.checkingIn}
          className='gift-scratch-card__canvas'
          data-revealed={revealed}
          data-busy={props.checkingIn}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={revealIfComplete}
          onPointerCancel={revealIfComplete}
          onPointerLeave={revealIfComplete}
          onKeyDown={handleKeyDown}
        />
      </div>

      <footer className='gift-scratch-card__footer'>
        <Sparkles aria-hidden='true' />
        <div>
          <strong>
            {revealed ? t('Checked in') : t('Scratch to reveal your gift')}
          </strong>
          <span>{t('Rewards will be added directly to your balance')}</span>
        </div>
      </footer>
    </article>
  )
}
