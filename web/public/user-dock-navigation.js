;(() => {
  const adminRole = 10
  const baseItemSize = 50
  const magnifiedItemSize = 70
  const magnificationDistance = 140
  const injectedItemSelector = '[data-user-dock-item]'
  const navigationSourceSelector =
    '[data-user-dock-source], [data-user-dock-fallback-source], [data-slot=sidebar-container]'
  const mobileNavigationItems = [
    {
      href: '/dashboard/overview',
      label: 'Overview',
      paths: ['M22 12h-4l-3 9L9 3l-3 9H2'],
    },
    {
      href: '/dashboard/models',
      label: 'Dashboard',
      paths: [
        'M3 3h7v9H3z',
        'M14 3h7v5h-7z',
        'M14 12h7v9h-7z',
        'M3 16h7v5H3z',
      ],
    },
    {
      href: '/keys',
      label: 'API Keys',
      paths: [
        'M21 2l-2 2',
        'm15 8-2 2',
        'm17 6-6.59 6.59a5 5 0 1 1-7.07-7.07A5 5 0 0 1 10.41 12.6Z',
      ],
    },
    {
      href: '/usage-logs/common',
      label: 'Usage Logs',
      paths: [
        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
        'M14 2v6h6',
        'M8 13h8',
        'M8 17h8',
      ],
    },
    {
      href: '/model-health',
      label: 'Model health',
      paths: [
        'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 12 5.3 5.5 5.5 0 0 0 2 8.5C2 14 12 21 12 21s2.05-1.44 4.28-3.43',
        'M3.22 12H9l1-3 2 6 2-3h6.78',
      ],
    },
    {
      href: '/usage-logs/task',
      label: 'Task Logs',
      paths: [
        'M11 6h9',
        'M11 12h9',
        'M11 18h9',
        'm3 6 1 1 2-2',
        'm3 12 1 1 2-2',
        'm3 18 1 1 2-2',
      ],
    },
    {
      href: '/gift',
      label: 'Gift',
      paths: [
        'M20 12v10H4V12',
        'M2 7h20v5H2z',
        'M12 22V7',
        'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z',
        'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
      ],
    },
    {
      href: '/wallet',
      label: 'Wallet',
      paths: [
        'M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7',
        'M16 14h4',
      ],
    },
    {
      href: '/profile',
      label: 'Profile',
      paths: ['M20 21a8 8 0 0 0-16 0', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
    },
  ]
  let isCommonUser = false
  let currentUserRole = null
  let scheduled = false
  let observer

  const hideDockTooltip = () => {
    document
      .querySelector('[data-user-dock-tooltip]')
      ?.removeAttribute('data-visible')
  }

  const observePage = () => {
    observer?.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'aria-hidden'],
      childList: true,
      subtree: true,
    })
  }

  const clearInjectedItems = () => {
    hideDockTooltip()
    document
      .querySelectorAll(injectedItemSelector)
      .forEach((item) => item.remove())
    document
      .querySelectorAll('[data-user-dock-hidden]')
      .forEach((item) => item.removeAttribute('data-user-dock-hidden'))
    document
      .querySelector('.krulu-dock-outer')
      ?.removeAttribute('data-user-dock')
    document
      .querySelector('.krulu-dock-outer')
      ?.removeAttribute('data-user-dock-guest')
  }

  const keepDockVisible = (dock) => {
    dock?.classList.remove(
      'krulu-dock-auto-collapsible',
      'krulu-dock-collapsed'
    )
    dock?.querySelector('.krulu-dock-panel')?.removeAttribute('aria-hidden')
    dock?.querySelector('.krulu-dock-handle')?.remove()
  }

  const createFallbackNavigationSource = () => {
    const source = document.createElement('div')
    source.dataset.userDockFallbackSource = ''
    source.hidden = true

    mobileNavigationItems.forEach(({ href, label, paths }) => {
      const link = document.createElement('a')
      link.href = href

      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('viewBox', '0 0 24 24')
      icon.setAttribute('fill', 'none')
      icon.setAttribute('stroke', 'currentColor')
      icon.setAttribute('stroke-width', '2')
      icon.setAttribute('stroke-linecap', 'round')
      icon.setAttribute('stroke-linejoin', 'round')
      paths.forEach((pathData) => {
        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )
        path.setAttribute('d', pathData)
        icon.append(path)
      })

      const text = document.createElement('span')
      text.textContent = label
      link.append(icon, text)
      source.append(link)
    })

    document.body.append(source)
    return source
  }

  const isActivePath = (href) => {
    const path = new URL(href, location.href).pathname
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    )
  }

  const createDockItem = (sidebarLink) => {
    const href = sidebarLink.getAttribute('href')
    const label = sidebarLink.textContent?.trim()
    const icon = sidebarLink.querySelector('svg')
    if (!href || !label || !icon) return null

    const item = document.createElement('div')
    item.className = 'krulu-dock-item krulu-user-dock-item'
    item.dataset.userDockItem = ''

    const link = document.createElement('a')
    link.className = 'krulu-dock-link'
    link.href = href
    link.setAttribute('aria-label', label)
    link.addEventListener('click', (event) => {
      const currentNavigationLink = [
        ...document.querySelectorAll(
          '[data-user-dock-source] a[href], [data-user-dock-fallback-source] a[href], [data-slot=sidebar-container] a[href]'
        ),
      ].find((candidate) => candidate.getAttribute('href') === href)
      if (!currentNavigationLink) return
      event.preventDefault()
      currentNavigationLink.click()
    })

    if (isActivePath(href)) {
      link.classList.add('krulu-dock-link-active', 'active')
      link.dataset.status = 'active'
      link.setAttribute('aria-current', 'page')
    }

    const iconWrapper = document.createElement('span')
    iconWrapper.className = 'krulu-dock-icon'
    iconWrapper.setAttribute('aria-hidden', 'true')
    iconWrapper.append(icon.cloneNode(true))
    link.append(iconWrapper)
    item.append(link)
    return item
  }

  const getTooltip = () => {
    let tooltip = document.querySelector('[data-user-dock-tooltip]')
    if (tooltip) return tooltip

    tooltip = document.createElement('div')
    tooltip.className = 'krulu-user-dock-tooltip'
    tooltip.dataset.userDockTooltip = ''
    tooltip.setAttribute('aria-hidden', 'true')
    document.body.append(tooltip)
    return tooltip
  }

  const installDockInteraction = (panel) => {
    if (panel.hasAttribute('data-user-dock-interaction')) return
    panel.setAttribute('data-user-dock-interaction', '')

    let pointerX = null
    let hoveredItem = null
    let resizeScheduled = false

    const updateItems = () => {
      resizeScheduled = false
      const tooltip = getTooltip()

      panel.querySelectorAll('.krulu-dock-item').forEach((item) => {
        const rect = item.getBoundingClientRect()
        const distance =
          pointerX === null
            ? magnificationDistance
            : Math.abs(pointerX - (rect.left + rect.width / 2))
        const influence = Math.max(0, 1 - distance / magnificationDistance)
        const size =
          baseItemSize + (magnifiedItemSize - baseItemSize) * influence
        item.style.setProperty('--user-dock-size', `${size}px`)
      })

      if (!hoveredItem || pointerX === null) {
        tooltip.removeAttribute('data-visible')
        return
      }

      const link = hoveredItem.querySelector('a[aria-label]')
      const label = link?.getAttribute('aria-label')
      if (!label) {
        tooltip.removeAttribute('data-visible')
        return
      }

      const rect = hoveredItem.getBoundingClientRect()
      tooltip.textContent = label
      tooltip.style.left = `${rect.left + rect.width / 2}px`
      tooltip.style.top = `${rect.top - 8}px`
      tooltip.setAttribute('data-visible', '')
    }

    const scheduleResize = () => {
      if (resizeScheduled) return
      resizeScheduled = true
      requestAnimationFrame(updateItems)
    }

    panel.addEventListener('mousemove', (event) => {
      if (!panel.parentElement?.hasAttribute('data-user-dock')) return
      pointerX = event.clientX
      hoveredItem = event.target.closest('.krulu-dock-item')
      scheduleResize()
    })
    panel.addEventListener('mouseleave', () => {
      pointerX = null
      hoveredItem = null
      scheduleResize()
    })
  }

  const syncDock = () => {
    scheduled = false
    observer?.disconnect()

    const panel = document.querySelector('.krulu-dock-panel')
    const dock = panel?.parentElement
    keepDockVisible(dock)

    if (!isCommonUser) {
      clearInjectedItems()
      if (currentUserRole === null && panel && dock) {
        panel.querySelectorAll('.krulu-dock-item').forEach((item) => {
          const link = item.querySelector('a[href]')
          if (!link) return
          const path = new URL(link.getAttribute('href'), location.href)
            .pathname
          if (path === '/dashboard') {
            item.setAttribute('data-user-dock-hidden', '')
          }
        })
        installDockInteraction(panel)
        dock.setAttribute('data-user-dock', '')
        dock.setAttribute('data-user-dock-guest', '')
      }
      observePage()
      return
    }

    const navigationSource =
      document.querySelector('[data-user-dock-source]') ||
      document.querySelector('[data-slot=sidebar-container]') ||
      document.querySelector('[data-user-dock-fallback-source]') ||
      createFallbackNavigationSource()
    if (!panel || !navigationSource) {
      observePage()
      return
    }

    clearInjectedItems()
    const itemsByPath = new Map()
    panel.querySelectorAll('.krulu-dock-item').forEach((item) => {
      const link = item.querySelector('a[href]')
      if (!link) return
      const path = new URL(link.getAttribute('href'), location.href).pathname
      itemsByPath.set(path, item)
    })

    const navigationItems = []
    const navigationPaths = new Set()
    navigationSource.querySelectorAll('a[href]').forEach((navigationLink) => {
      const href = navigationLink.getAttribute('href')
      if (!href) return
      const path = new URL(href, location.href).pathname
      if (path === '/dashboard') return
      navigationPaths.add(path)

      let item = itemsByPath.get(path)
      if (!item) {
        item = createDockItem(navigationLink)
        if (!item) return
        itemsByPath.set(path, item)
      }
      navigationItems.push(item)
    })

    panel.querySelectorAll('.krulu-dock-item').forEach((item) => {
      const link = item.querySelector('a[href]')
      if (!link) return
      const path = new URL(link.getAttribute('href'), location.href).pathname
      if (path === '/dashboard') {
        item.setAttribute('data-user-dock-hidden', '')
        return
      }
      if (!navigationPaths.has(path)) panel.append(item)
    })
    navigationItems.forEach((item) => panel.append(item))

    panel.querySelectorAll('a[title]').forEach((link) => {
      link.removeAttribute('title')
    })
    installDockInteraction(panel)

    dock?.setAttribute('data-user-dock', '')
    requestAnimationFrame(() => {
      if (!dock || dock.scrollWidth <= dock.clientWidth) return

      const activeLink = [...panel.querySelectorAll('a[href]')]
        .filter(
          (link) =>
            link.dataset.status === 'active' ||
            link.getAttribute('aria-current') === 'page'
        )
        .sort((left, right) => {
          const leftPath = new URL(left.getAttribute('href'), location.href)
            .pathname
          const rightPath = new URL(right.getAttribute('href'), location.href)
            .pathname
          return rightPath.length - leftPath.length
        })[0]

      activeLink?.closest('.krulu-dock-item')?.scrollIntoView?.({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      })
    })
    observePage()
  }

  const scheduleSync = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(syncDock)
  }

  const refreshUserRole = async () => {
    try {
      const response = await fetch('/api/user/self')
      const payload = await response.json()
      currentUserRole =
        response.ok &&
        payload?.success &&
        Number.isInteger(payload?.data?.role)
          ? payload.data.role
          : null
      isCommonUser =
        currentUserRole !== null && currentUserRole < adminRole
    } catch {
      currentUserRole = null
      isCommonUser = false
    }

    syncDock()
  }

  const start = async () => {
    observer = new MutationObserver((records) => {
      records.forEach((record) => {
        const target = record.target.nodeType === 1 ? record.target : null
        if (target?.matches('.krulu-dock-outer')) {
          keepDockVisible(target)
        } else if (target?.matches('.krulu-dock-panel')) {
          keepDockVisible(target.parentElement)
        }
      })

      const shouldSync = records.some((record) => {
        const target = record.target.nodeType === 1 ? record.target : null
        if (
          target?.matches(
            `.krulu-dock-outer, .krulu-dock-panel, ${navigationSourceSelector}`
          ) ||
          target?.closest(navigationSourceSelector)
        ) {
          return true
        }

        return [...record.addedNodes, ...record.removedNodes].some((node) => {
          if (node.nodeType !== 1) return false
          return (
            node.matches?.(
              `.krulu-dock-outer, .krulu-dock-panel, ${navigationSourceSelector}`
            ) ||
            node.querySelector?.(
              `.krulu-dock-outer, .krulu-dock-panel, ${navigationSourceSelector}`
            )
          )
        })
      })
      if (shouldSync) scheduleSync()
    })
    observePage()

    document.addEventListener('click', (event) => {
      if (!event.target.closest('a[href]')) return
      hideDockTooltip()
      scheduleSync()
    })
    document.addEventListener('krulu:auth-changed', (event) => {
      const role = event.detail?.role
      if (Number.isInteger(role)) {
        currentUserRole = role
        isCommonUser = role < adminRole
        syncDock()
        return
      }
      refreshUserRole()
    })

    await refreshUserRole()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
})()
