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
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'
import { runInNewContext } from 'node:vm'

import { Window } from 'happy-dom'

const script = await readFile(
  new URL('../../../../public/user-dock-navigation.js', import.meta.url),
  'utf8'
)
const styles = await readFile(
  new URL('../../../../public/krulu-dock-override.css', import.meta.url),
  'utf8'
)

function createPage(
  initialRole: number | null,
  options: {
    includeDesktopSidebar?: boolean
    includeSharedSource?: boolean
    initiallyCollapsed?: boolean
  } = {}
) {
  const role = initialRole
  const window = new Window({ url: 'http://127.0.0.1/dashboard/overview' })
  window.document.body.innerHTML = `
    ${
      options.includeSharedSource === false
        ? ''
        : `<div data-user-dock-source hidden>
            <a href="/dashboard/overview"><svg></svg>Overview</a>
            <a href="/keys"><svg></svg>API Keys</a>
            <a href="/profile"><svg></svg>Profile</a>
          </div>`
    }
    ${
      options.includeDesktopSidebar === false
        ? ''
        : `<aside data-slot="sidebar-container">
            <a href="/dashboard/overview"><svg></svg>Overview</a>
            <a href="/keys"><svg></svg>API Keys</a>
            <a href="/profile"><svg></svg>Profile</a>
          </aside>`
    }
    <div class="krulu-dock-outer${options.initiallyCollapsed ? ' krulu-dock-auto-collapsible krulu-dock-collapsed' : ''}">
      <nav class="krulu-dock-panel"${options.initiallyCollapsed ? ' aria-hidden="true"' : ''}>
        <div class="krulu-dock-item">
          <a class="krulu-dock-link" href="/"><svg></svg></a>
        </div>
        <div class="krulu-dock-item">
          <a class="krulu-dock-link" href="/dashboard"><svg></svg></a>
        </div>
        <div class="krulu-dock-item">
          <a class="krulu-dock-link" href="/pricing"><svg></svg></a>
        </div>
        <div class="krulu-dock-item">
          <a class="krulu-dock-link" href="/profile"><svg></svg></a>
        </div>
      </nav>
      ${options.initiallyCollapsed ? '<button class="krulu-dock-handle"></button>' : ''}
    </div>
  `
  window.fetch = async () =>
    new window.Response(JSON.stringify({ success: role !== null, data: { role } }), {
      status: role === null ? 401 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  runInNewContext(script, {
    document: window.document,
    fetch: window.fetch,
    location: window.location,
    MutationObserver: window.MutationObserver,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    URL: window.URL,
  })
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'))
  return { window }
}

describe('user dock navigation', () => {
  test('keeps the dock panel flat without a cast shadow', () => {
    assert.match(
      styles,
      /\.krulu-dock-panel\s*\{[^}]*box-shadow:\s*none\s*!important;/s
    )
  })

  test('uses horizontal scrolling and fixed touch targets on mobile', () => {
    assert.match(styles, /@media \(max-width: 767px\)/)
    assert.match(
      styles,
      /\.krulu-dock-outer\[data-user-dock\][^{]*\{[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*x proximity;/s
    )
    assert.match(
      styles,
      /\.krulu-dock-outer\[data-user-dock\] \.krulu-dock-item\s*\{[^}]*width:\s*3\.25rem\s*!important;[^}]*height:\s*3\.25rem\s*!important;/s
    )
    assert.match(
      styles,
      /\.krulu-dock-outer\.krulu-dock-collapsed\s*\{[^}]*transform:\s*translateX\(-50%\)\s*!important;/s
    )
  })

  test('keeps the mobile dock visible when the base component collapses it', async () => {
    const { window } = createPage(1, { initiallyCollapsed: true })
    await window.happyDOM.waitUntilComplete()

    const outer = window.document.querySelector('.krulu-dock-outer')
    const panel = window.document.querySelector('.krulu-dock-panel')
    assert.ok(outer)
    assert.ok(panel)

    assert.equal(outer.classList.contains('krulu-dock-collapsed'), false)
    assert.equal(
      outer.classList.contains('krulu-dock-auto-collapsible'),
      false
    )
    assert.equal(panel.hasAttribute('aria-hidden'), false)
    assert.equal(outer.querySelector('.krulu-dock-handle'), null)
    window.close()
  })

  test('adds visible sidebar destinations for a common user without duplicates', async () => {
    const { window } = createPage(1)
    await window.happyDOM.waitUntilComplete()

    const dockLinks = [
      ...window.document.querySelectorAll(
        '.krulu-dock-item:not([data-user-dock-hidden]) a'
      ),
    ]
    assert.deepEqual(
      dockLinks.map((link) => link.getAttribute('href')),
      [
        '/',
        '/pricing',
        '/dashboard/overview',
        '/keys',
        '/profile',
      ]
    )
    assert.equal(
      window.document.querySelectorAll('.krulu-dock-panel a[href="/profile"]')
        .length,
      1
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock')
    )

    const panel = window.document.querySelector('.krulu-dock-panel')
    const dockItems = [
      ...window.document.querySelectorAll(
        '.krulu-dock-item:not([data-user-dock-hidden])'
      ),
    ]
    assert.ok(panel)
    assert.ok(panel.hasAttribute('data-user-dock-interaction'))
    dockItems.forEach((item, index) => {
      item.getBoundingClientRect = () =>
        new window.DOMRect(index * 50, 600, 50, 50)
    })

    const overviewItem = window.document
      .querySelector('.krulu-dock-panel a[href="/dashboard/overview"]')
      ?.closest('.krulu-dock-item')
    const homeItem = window.document
      .querySelector('.krulu-dock-panel a[href="/"]')
      ?.closest('.krulu-dock-item')
    assert.ok(overviewItem)
    assert.ok(homeItem)

    overviewItem.dispatchEvent(
      new window.MouseEvent('mousemove', { bubbles: true, clientX: 125 })
    )
    await window.happyDOM.waitUntilComplete()
    assert.match(
      overviewItem.getAttribute('style') ?? '',
      /--user-dock-size:\s*70px/
    )
    assert.doesNotMatch(
      homeItem.getAttribute('style') ?? '',
      /--user-dock-size:\s*70px/
    )

    const tooltip = window.document.querySelector('[data-user-dock-tooltip]')
    assert.equal(tooltip?.textContent, 'Overview')
    assert.ok(tooltip?.hasAttribute('data-visible'))

    panel.dispatchEvent(new window.MouseEvent('mouseleave'))
    await window.happyDOM.waitUntilComplete()
    assert.match(
      overviewItem.getAttribute('style') ?? '',
      /--user-dock-size:\s*50px/
    )
    assert.equal(tooltip?.hasAttribute('data-visible'), false)
    window.close()
  })

  test('adds the complete user dock on mobile without a desktop sidebar', async () => {
    const { window } = createPage(1, { includeDesktopSidebar: false })
    await window.happyDOM.waitUntilComplete()

    assert.deepEqual(
      [
        ...window.document.querySelectorAll(
          '.krulu-dock-item:not([data-user-dock-hidden]) a'
        ),
      ].map((link) => link.getAttribute('href')),
      [
        '/',
        '/pricing',
        '/dashboard/overview',
        '/keys',
        '/profile',
      ]
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock')
    )
    window.close()
  })

  test('uses the complete built-in mobile navigation before shared data renders', async () => {
    const { window } = createPage(1, {
      includeDesktopSidebar: false,
      includeSharedSource: false,
    })
    await window.happyDOM.waitUntilComplete()

    assert.deepEqual(
      [
        ...window.document.querySelectorAll(
          '.krulu-dock-item:not([data-user-dock-hidden]) a'
        ),
      ].map((link) => link.getAttribute('href')),
      [
        '/',
        '/pricing',
        '/dashboard/overview',
        '/dashboard/models',
        '/keys',
        '/usage-logs/common',
        '/model-health',
        '/usage-logs/task',
        '/gift',
        '/wallet',
        '/profile',
      ]
    )
    window.close()
  })

  test('keeps the existing dock unchanged for an administrator', async () => {
    const { window } = createPage(10)
    await window.happyDOM.waitUntilComplete()

    assert.equal(
      window.document.querySelectorAll('[data-user-dock-item]').length,
      0
    )
    assert.deepEqual(
      [...window.document.querySelectorAll('.krulu-dock-panel a')].map((link) =>
        link.getAttribute('href')
      ),
      ['/', '/dashboard', '/pricing', '/profile']
    )
    assert.equal(
      window.document.querySelectorAll('[data-user-dock-hidden]').length,
      0
    )
    assert.equal(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock'),
      false
    )
    assert.equal(
      window.document
        .querySelector('.krulu-dock-panel')
        ?.hasAttribute('data-user-dock-interaction'),
      false
    )
    window.close()
  })

  test('uses the user capsule sizing for the guest home dock', async () => {
    const { window } = createPage(null)
    await window.happyDOM.waitUntilComplete()

    assert.equal(
      window.document.querySelectorAll('[data-user-dock-item]').length,
      0
    )
    assert.deepEqual(
      [
        ...window.document.querySelectorAll(
          '.krulu-dock-item:not([data-user-dock-hidden]) a'
        ),
      ].map((link) => link.getAttribute('href')),
      ['/', '/pricing', '/profile']
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-panel a[href="/dashboard"]')
        ?.closest('.krulu-dock-item')
        ?.hasAttribute('data-user-dock-hidden')
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock')
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock-guest')
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-panel')
        ?.hasAttribute('data-user-dock-interaction')
    )
    window.close()
  })

  test('uses the common-user hover treatment for the active guest link', () => {
    assert.match(
      styles,
      /\.krulu-dock-outer\[data-user-dock-guest\][^{]*\s+\.krulu-dock-link\[data-status='active'\]:hover\s*\{[^}]*color:\s*var\(--foreground\);[^}]*box-shadow:\s*none;/s
    )
  })

  test('hides the dock tooltip immediately when a navigation link is clicked', async () => {
    const { window } = createPage(null)
    await window.happyDOM.waitUntilComplete()

    const panel = window.document.querySelector('.krulu-dock-panel')
    const homeLink = window.document.querySelector(
      '.krulu-dock-panel a[href="/"]'
    )
    const homeItem = homeLink?.closest('.krulu-dock-item')
    assert.ok(panel)
    assert.ok(homeLink)
    assert.ok(homeItem)

    homeLink.setAttribute('aria-label', 'Home')
    homeItem.getBoundingClientRect = () =>
      new window.DOMRect(100, 600, 50, 50)
    homeItem.dispatchEvent(
      new window.MouseEvent('mousemove', { bubbles: true, clientX: 125 })
    )
    await window.happyDOM.waitUntilComplete()

    const tooltip = window.document.querySelector('[data-user-dock-tooltip]')
    assert.ok(tooltip?.hasAttribute('data-visible'))

    homeLink.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    })
    homeLink.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true })
    )

    assert.equal(tooltip?.hasAttribute('data-visible'), false)
    window.close()
  })

  test('refreshes the dock immediately after login without a page reload', async () => {
    const { window } = createPage(null)
    await window.happyDOM.waitUntilComplete()

    assert.equal(
      window.document.querySelectorAll('[data-user-dock-item]').length,
      0
    )

    window.document.dispatchEvent(
      new window.CustomEvent('krulu:auth-changed', {
        detail: { role: 1 },
      })
    )

    assert.deepEqual(
      [
        ...window.document.querySelectorAll(
          '.krulu-dock-item:not([data-user-dock-hidden]) a'
        ),
      ].map((link) => link.getAttribute('href')),
      [
        '/',
        '/pricing',
        '/dashboard/overview',
        '/keys',
        '/profile',
      ]
    )
    assert.ok(
      window.document
        .querySelector('.krulu-dock-outer')
        ?.hasAttribute('data-user-dock')
    )
    window.close()
  })

  test('centers the current destination when the user dock overflows', async () => {
    const { window } = createPage(10)
    await window.happyDOM.waitUntilComplete()

    const outer = window.document.querySelector('.krulu-dock-outer')
    assert.ok(outer)
    Object.defineProperties(outer, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 720 },
    })

    let scrollOptions: boolean | ScrollIntoViewOptions | undefined
    window.HTMLElement.prototype.scrollIntoView = function (options) {
      if (this.querySelector('a[href="/dashboard/overview"]')) {
        scrollOptions = options
      }
    }

    window.document.dispatchEvent(
      new window.CustomEvent('krulu:auth-changed', {
        detail: { role: 1 },
      })
    )
    await window.happyDOM.waitUntilComplete()

    assert.deepEqual(scrollOptions, {
      behavior: 'auto',
      block: 'nearest',
      inline: 'center',
    })
    window.close()
  })
})
