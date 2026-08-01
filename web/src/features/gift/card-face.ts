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
// The lanyard badge is a 3D mesh whose front face is UV-mapped to a texture
// atlas, so its artwork has to be an image rather than DOM nodes. Painting it
// on a canvas keeps the badge in sync with the current locale, the site name
// and the awarded quota without shipping a pre-rendered asset per state.

/** Matches the aspect ratio of the badge's front face in `card.glb`. */
const FACE_WIDTH = 512
const FACE_HEIGHT = 724

const INK = '#f2fbf7'
const INK_MUTED = 'rgba(224, 247, 238, 0.62)'
const ACCENT = '#5ee0b0'

export interface CardFaceContent {
  systemName: string
  /** Small uppercase line above the headline, e.g. "Daily Check-in". */
  eyebrow: string
  /** Awarded quota once checked in, otherwise the call to action. */
  headline: string
  caption: string
  dateLabel: string
  checkedIn: boolean
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (context.measureText(text).width <= maxWidth) return text
  let visible = text
  while (visible.length > 1) {
    visible = visible.slice(0, -1)
    if (context.measureText(`${visible}…`).width <= maxWidth) break
  }
  return `${visible}…`
}

function drawGiftGlyph(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number
) {
  const half = size / 2
  const lidHeight = size * 0.22
  context.save()
  context.strokeStyle = ACCENT
  context.lineWidth = Math.max(3, size * 0.06)
  context.lineJoin = 'round'
  context.strokeRect(
    centerX - half,
    centerY - half + lidHeight,
    size,
    size - lidHeight
  )
  context.strokeRect(
    centerX - half * 1.12,
    centerY - half,
    size * 1.12,
    lidHeight
  )
  context.beginPath()
  context.moveTo(centerX, centerY - half)
  context.lineTo(centerX, centerY + half)
  context.stroke()
  context.restore()
}

/**
 * Paints the badge's front face. Returns a canvas rather than a data URL so the
 * caller can hand it straight to a `THREE.CanvasTexture` — no image decode, no
 * suspense boundary, so re-painting after a check-in never remounts the rope.
 */
export function drawCardFace(content: CardFaceContent): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = FACE_WIDTH
  canvas.height = FACE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) return canvas

  const backdrop = context.createLinearGradient(0, 0, FACE_WIDTH, FACE_HEIGHT)
  backdrop.addColorStop(0, '#0c211c')
  backdrop.addColorStop(0.55, '#123c31')
  backdrop.addColorStop(1, '#0a1a17')
  context.fillStyle = backdrop
  context.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  const glow = context.createRadialGradient(
    FACE_WIDTH * 0.8,
    FACE_HEIGHT * 0.16,
    0,
    FACE_WIDTH * 0.8,
    FACE_HEIGHT * 0.16,
    FACE_WIDTH * 0.85
  )
  glow.addColorStop(0, 'rgba(94, 224, 176, 0.34)')
  glow.addColorStop(1, 'rgba(94, 224, 176, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  // Punch hole for the badge clip.
  context.fillStyle = 'rgba(3, 12, 10, 0.72)'
  context.beginPath()
  context.ellipse(FACE_WIDTH / 2, 62, 44, 15, 0, 0, Math.PI * 2)
  context.fill()

  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'

  context.fillStyle = INK
  context.font = '700 40px "Public Sans", system-ui, sans-serif'
  context.fillText(
    fitText(context, content.systemName, FACE_WIDTH - 96),
    FACE_WIDTH / 2,
    172
  )

  context.fillStyle = ACCENT
  context.font = '700 22px "Public Sans", system-ui, sans-serif'
  context.fillText(
    fitText(context, content.eyebrow.toUpperCase(), FACE_WIDTH - 96),
    FACE_WIDTH / 2,
    212
  )

  drawGiftGlyph(context, FACE_WIDTH / 2, 336, 104)

  context.fillStyle = INK
  const headlineSize = content.checkedIn ? 76 : 52
  context.font = `800 ${headlineSize}px "Public Sans", system-ui, sans-serif`
  context.fillText(
    fitText(context, content.headline, FACE_WIDTH - 72),
    FACE_WIDTH / 2,
    488
  )

  context.fillStyle = INK_MUTED
  context.font = '400 22px "Public Sans", system-ui, sans-serif'
  context.fillText(
    fitText(context, content.caption, FACE_WIDTH - 88),
    FACE_WIDTH / 2,
    538
  )

  context.strokeStyle = 'rgba(94, 224, 176, 0.28)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(64, 596)
  context.lineTo(FACE_WIDTH - 64, 596)
  context.stroke()

  context.fillStyle = INK_MUTED
  context.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillText(content.dateLabel, FACE_WIDTH / 2, 646)

  return canvas
}
