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
import { after, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Element',
  'customElements',
] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})
Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: matchMedia,
})
Object.defineProperty(domWindow, 'matchMedia', {
  configurable: true,
  value: matchMedia,
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const i18next = (await import('i18next')).default
const { initReactI18next } = await import('react-i18next')
await i18next.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Channel: 'Channel',
        Error: 'Error',
        Healthy: 'Healthy',
        'Last 24h usage': 'Last 24h usage',
        'No requests': 'No requests',
        'Requests (24h)': 'Requests (24h)',
        'Success rate': 'Success rate',
        Warning: 'Warning',
      },
    },
  },
})
const { ModelHealthRow } = await import('../model-health-row')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

after(() => domWindow.close())

test('shows all 24 hourly health buckets without a horizontal table', async () => {
  const startHour = 1_700_000_000
  const buckets = Array.from({ length: 24 }, (_, index) => ({
    hour: startHour + index * 60 * 60,
    total_count: index === 0 ? 10 : 0,
    success_count: index === 0 ? 9 : 0,
    probe_count: 0,
    success_rate: index === 0 ? 90 : 0,
  }))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <ModelHealthRow
        model={{
          model_name: 'Qwen3.6-27B',
          channel_id: 3,
          buckets,
        }}
      />
    )
  })

  assert.match(container.textContent || '', /Qwen3\.6-27B/)
  assert.match(container.textContent || '', /Channel 3/)
  assert.match(container.textContent || '', /90\.0%/)
  assert.equal(container.querySelectorAll('span[title*=":00 -"]').length, 24)
  const timeline = container.querySelector('.grid-cols-12')
  assert.ok(timeline)
  assert.equal(timeline.classList.contains('sm:grid-cols-24'), true)
  assert.equal(container.querySelector('table'), null)

  await act(async () => root.unmount())
  container.remove()
})
