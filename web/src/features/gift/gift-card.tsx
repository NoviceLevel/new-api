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
  scratched: boolean
  redeemed: boolean
  scratching: boolean
  redeeming: boolean
  onScratch: () => Promise<void>
  onRedeem: () => void
}

type Point = { x: number; y: number }

const REVEAL_THRESHOLD = 0.45

export function GiftCard({
  systemName,
  prizeName,
  scratched,
  redeemed,
  scratching,
  redeeming,
  onScratch,
  onRedeem,
}: GiftCardProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const scratchRequestRef = useRef(false)
  const startedLocallyRef = useRef(false)
  const previousPointRef = useRef<Point | null>(null)
  const revealTimerRef = useRef<number | null>(null)
  const [revealed, setRevealed] = useState(scratched)
  const [showAction, setShowAction] = useState(scratched)

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
    context.fillStyle = '#e4e4e7'
    context.fillRect(0, 0, bounds.width, bounds.height)
    context.fillStyle = 'rgba(39, 39, 42, 0.06)'
    for (let x = 0; x < bounds.width; x += 5) {
      for (let y = 0; y < bounds.height; y += 5) {
        if ((x + y) % 15 === 0) context.fillRect(x, y, 2, 2)
      }
    }
    context.font =
      '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    context.fillStyle = '#71717a'
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
    if (scratched && !startedLocallyRef.current) {
      setRevealed(true)
      setShowAction(true)
    }
  }, [scratched])

  useEffect(() => {
    initializeCanvas()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(initializeCanvas)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [initializeCanvas])

  useEffect(
    () => () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current)
      }
    },
    []
  )

  const ensureScratched = useCallback(async () => {
    if (scratched || scratchRequestRef.current) return scratched
    scratchRequestRef.current = true
    startedLocallyRef.current = true
    try {
      await onScratch()
      return true
    } catch {
      startedLocallyRef.current = false
      return false
    } finally {
      scratchRequestRef.current = false
    }
  }, [onScratch, scratched])

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
    revealTimerRef.current = window.setTimeout(() => {
      setShowAction(true)
      revealTimerRef.current = null
    }, 450)
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
    if (!drawingRef.current || scratching || revealed) return
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
      setShowAction(true)
    }
  }

  let actionLabel = t('Activate gift')
  if (redeemed) actionLabel = t('Activated')
  else if (redeeming) actionLabel = t('Activating...')

  return (
    <article className='gift-scratch-card'>
      <header className='gift-scratch-card__header'>
        <span className='gift-scratch-card__brand'>{systemName}</span>
        <h3>{t("Today's gift")}</h3>
        <p>{t('A little surprise, every day')}</p>
      </header>

      <div className='gift-scratch-card__scratch-area'>
        <div className='gift-scratch-card__prize'>
          <span>{t('Daily subscription')}</span>
          <strong>{prizeName || t('A daily surprise')}</strong>
          <button
            type='button'
            className='gift-scratch-card__activate'
            data-visible={showAction}
            disabled={!showAction || redeemed || redeeming}
            onClick={onRedeem}
          >
            {actionLabel}
          </button>
        </div>
        <canvas
          ref={canvasRef}
          role='button'
          tabIndex={revealed ? -1 : 0}
          aria-label={t('Scratch the daily gift card')}
          aria-busy={scratching}
          className='gift-scratch-card__canvas'
          data-revealed={revealed}
          data-busy={scratching}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={revealIfComplete}
          onPointerCancel={revealIfComplete}
          onPointerLeave={revealIfComplete}
          onKeyDown={handleKeyDown}
        />
      </div>

      <footer className='gift-scratch-card__footer'>
        <div className='gift-scratch-card__barcode' aria-hidden='true' />
        <p>
          {t(
            '{{system}} reserves the final interpretation of this event. The gift takes effect immediately after activation.',
            { system: systemName }
          )}
        </p>
      </footer>
    </article>
  )
}
