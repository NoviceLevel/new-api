(() => {
  const root = document.documentElement
  const desktopQuery = window.matchMedia('(min-width: 768px)')
  let syncFrame = 0

  root.dataset.kruluShell = 'true'

  const getDrawer = () =>
    document.querySelector(
      '[data-slot="sidebar-container"][data-krulu-nav-drawer="true"]'
    )

  const setOpen = (open) => {
    root.dataset.kruluNavOpen = open ? 'true' : 'false'
    const trigger = document.querySelector('[data-krulu-nav-trigger="true"]')
    if (trigger) trigger.setAttribute('aria-expanded', String(open))
  }

  const markGlobalHeader = () => {
    document.querySelectorAll('header').forEach((header) => {
      const buttons = Array.from(header.querySelectorAll('button'))
      const hasGlobalControl = buttons.some((button) => {
        const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`
        return /language|notifications?|更改语言|通知|登录/i.test(label)
      })
      if (hasGlobalControl) header.dataset.kruluGlobalHeader = 'true'
    })
  }

  const prepareDrawer = () => {
    const container = document.querySelector('[data-slot="sidebar-container"]')
    if (!container) return

    container.dataset.kruluNavDrawer = 'true'
    container.setAttribute('role', 'dialog')
    container.setAttribute('aria-label', '导航菜单')
    const sidebarRoot = container.closest('[data-slot="sidebar"][data-state]')
    if (sidebarRoot) {
      sidebarRoot.dataset.state = 'expanded'
      sidebarRoot.dataset.collapsible = ''
    }

    const inner = container.querySelector('[data-slot="sidebar-inner"]')
    if (inner && !inner.querySelector('[data-krulu-nav-drawer-header]')) {
      const header = document.createElement('div')
      header.dataset.kruluNavDrawerHeader = 'true'
      header.innerHTML = `
        <strong>导航</strong>
        <button type="button" aria-label="关闭导航" title="关闭导航">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      `
      header.querySelector('button')?.addEventListener('click', () => setOpen(false))
      inner.prepend(header)
    }
  }

  const prepareDockTrigger = () => {
    const dock = document.querySelector('.krulu-dock-panel')
    if (!dock) return

    const consoleLink = Array.from(dock.querySelectorAll('.krulu-dock-link')).find(
      (link) => link.getAttribute('href') === '/dashboard'
    )
    if (!consoleLink) return

    consoleLink.dataset.kruluNavTrigger = 'true'
    consoleLink.setAttribute('aria-haspopup', 'dialog')
    consoleLink.setAttribute(
      'aria-expanded',
      String(root.dataset.kruluNavOpen === 'true')
    )
  }

  const sync = () => {
    syncFrame = 0
    markGlobalHeader()
    prepareDrawer()
    prepareDockTrigger()
  }

  const scheduleSync = () => {
    if (syncFrame) return
    syncFrame = window.requestAnimationFrame(sync)
  }

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null
      const trigger = target?.closest('[data-krulu-nav-trigger="true"]')
      const drawer = getDrawer()

      if (trigger) {
        if (desktopQuery.matches && drawer) {
          event.preventDefault()
          event.stopImmediatePropagation()
          setOpen(root.dataset.kruluNavOpen !== 'true')
          return
        }

        if (!desktopQuery.matches) {
          const nativeTrigger = document.querySelector('[data-sidebar="trigger"]')
          if (nativeTrigger instanceof HTMLElement) {
            event.preventDefault()
            event.stopImmediatePropagation()
            nativeTrigger.click()
            return
          }
        }
      }

      if (target?.closest('[data-krulu-nav-drawer="true"] a[href]')) {
        setOpen(false)
        return
      }

      if (target?.closest('[data-mobile="true"] a[href]')) {
        const nativeTrigger = document.querySelector('[data-sidebar="trigger"]')
        if (nativeTrigger instanceof HTMLElement) {
          window.setTimeout(() => nativeTrigger.click(), 0)
        }
        return
      }

      if (
        root.dataset.kruluNavOpen === 'true' &&
        !target?.closest('[data-krulu-nav-drawer="true"]') &&
        !target?.closest('.krulu-dock-outer')
      ) {
        setOpen(false)
      }
    },
    true
  )

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.kruluNavOpen === 'true') {
      setOpen(false)
    }
  })

  desktopQuery.addEventListener('change', () => {
    setOpen(false)
    scheduleSync()
  })

  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true,
    subtree: true,
  })
  scheduleSync()
})()
