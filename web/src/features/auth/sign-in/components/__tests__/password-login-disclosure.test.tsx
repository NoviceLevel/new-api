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
  'MouseEvent',
  'Node',
  'Element',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  configurable: true,
  value: (callback: FrameRequestCallback) => {
    callback(domWindow.performance.now())
    return 0
  },
})
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  configurable: true,
  value: (_handle: number) => undefined,
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
        'Sign in with password': 'Sign in with password',
      },
    },
  },
})
const { PasswordLoginDisclosure } = await import('../password-login-disclosure')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

async function renderDisclosure(collapsedByDefault: boolean) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <PasswordLoginDisclosure collapsedByDefault={collapsedByDefault}>
        <label htmlFor='username'>Username</label>
        <input id='username' />
      </PasswordLoginDisclosure>
    )
  })
  return { container, root }
}

describe('password login disclosure', () => {
  after(() => domWindow.close())

  test('starts collapsed and expands when an alternative login exists', async () => {
    const rendered = await renderDisclosure(true)
    const trigger = rendered.container.querySelector<HTMLButtonElement>(
      'button[aria-expanded]'
    )

    assert.ok(trigger)
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')

    await act(async () => trigger.click())

    assert.equal(trigger.getAttribute('aria-expanded'), 'true')
    assert.ok(rendered.container.querySelector('#username'))

    await act(async () => rendered.root.unmount())
    rendered.container.remove()
  })

  test('shows the form directly when password login is the only option', async () => {
    const rendered = await renderDisclosure(false)

    assert.equal(
      rendered.container.querySelector('button[aria-expanded]'),
      null
    )
    assert.ok(rendered.container.querySelector('#username'))

    await act(async () => rendered.root.unmount())
    rendered.container.remove()
  })
})
