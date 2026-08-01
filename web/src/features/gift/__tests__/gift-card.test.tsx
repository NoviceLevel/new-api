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
import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'KeyboardEvent',
  'Node',
  'Element',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const i18next = (await import('i18next')).default
const { initReactI18next } = await import('react-i18next')
await i18next.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'A daily surprise': 'A daily surprise',
        'Check in daily to receive random quota rewards':
          'Check in daily to receive random quota rewards',
        'Check in now': 'Check in now',
        'Check-in Rewards': 'Check-in Rewards',
        'Checked in': 'Checked in',
        'Daily Check-in': 'Daily Check-in',
        'Rewards will be added directly to your balance':
          'Rewards will be added directly to your balance',
      },
    },
  },
})
const { GiftCard } = await import('../gift-card')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

async function renderCard(onCheckin: () => Promise<boolean>) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <GiftCard
        systemName='New API'
        prizeName='+10'
        checkedIn={false}
        checkingIn={false}
        onCheckin={onCheckin}
      />
    )
  })
  return { container, root }
}

describe('GiftCard lanyard check-in interaction', () => {
  after(() => domWindow.close())

  test('reveals the reward after keyboard check-in succeeds', async () => {
    let calls = 0
    const rendered = await renderCard(async () => {
      calls += 1
      return true
    })
    const button = rendered.container.querySelector<HTMLButtonElement>(
      '.gift-lanyard__checkin-control'
    )

    assert.ok(button)
    await act(async () => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    })

    assert.equal(calls, 1)
    assert.equal(button.dataset.complete, 'true')
    assert.equal(button.disabled, true)
    assert.match(rendered.container.textContent || '', /\+10/)

    await act(async () => rendered.root.unmount())
    rendered.container.remove()
  })

  test('keeps the lanyard action available when check-in is rejected', async () => {
    const rendered = await renderCard(async () => false)
    const button = rendered.container.querySelector<HTMLButtonElement>(
      '.gift-lanyard__checkin-control'
    )

    assert.ok(button)
    await act(async () => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      )
    })

    assert.equal(button.dataset.complete, 'false')
    assert.equal(button.disabled, false)

    await act(async () => rendered.root.unmount())
    rendered.container.remove()
  })
})
