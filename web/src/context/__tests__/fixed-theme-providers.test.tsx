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

for (const key of ['window', 'document', 'navigator', 'HTMLElement'] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const {
  ThemeCustomizationProvider,
  useThemeCustomization,
} = await import('../theme-customization-provider')
const { ThemeProvider, useTheme } = await import('../theme-provider')
const { getCookie } = await import('@/lib/cookies')
const { DEFAULT_THEME_CUSTOMIZATION, THEME_COOKIE_KEYS } =
  await import('@/lib/theme-customization')

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

after(() => {
  domWindow.close()
})

test('ignores and removes saved theme preferences', async () => {
  document.cookie = 'vite-ui-theme=dark; path=/'
  document.cookie = `${THEME_COOKIE_KEYS.preset}=ocean-breeze; path=/`
  document.cookie = `${THEME_COOKIE_KEYS.font}=serif; path=/`
  document.cookie = `${THEME_COOKIE_KEYS.radius}=xl; path=/`
  document.cookie = `${THEME_COOKIE_KEYS.scale}=xl; path=/`
  document.cookie = `${THEME_COOKIE_KEYS.contentLayout}=centered; path=/`
  document.documentElement.classList.add('dark')

  let renderedTheme: { theme: string; resolvedTheme: string } | undefined
  let renderedCustomization: typeof DEFAULT_THEME_CUSTOMIZATION | undefined

  function Probe() {
    const { theme, resolvedTheme } = useTheme()
    const { customization } = useThemeCustomization()
    renderedTheme = { theme, resolvedTheme }
    renderedCustomization = customization
    return null
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <ThemeProvider>
        <ThemeCustomizationProvider>
          <Probe />
        </ThemeCustomizationProvider>
      </ThemeProvider>
    )
  })

  assert.deepEqual(renderedTheme, { theme: 'light', resolvedTheme: 'light' })
  assert.deepEqual(renderedCustomization, DEFAULT_THEME_CUSTOMIZATION)
  assert.equal(document.documentElement.classList.contains('light'), true)
  assert.equal(document.documentElement.classList.contains('dark'), false)
  assert.equal(getCookie('vite-ui-theme'), undefined)
  for (const cookieName of Object.values(THEME_COOKIE_KEYS)) {
    assert.equal(getCookie(cookieName), undefined)
  }

  await act(async () => root.unmount())
  container.remove()
})
