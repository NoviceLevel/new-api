(() => {
  const marker = 'daily-gift-plan-type'
  let createGiftPlan = false
  let giftPlanTitles = null
  let adminPlans = null
  let giftPlanRequest = null

  const decorateCreateDialog = () => {
    if (location.pathname !== '/subscriptions') return
    document.querySelectorAll('[role="dialog"] form').forEach((form) => {
      if (form.querySelector(`[data-${marker}]`)) return
      const dialog = form.closest('[role="dialog"]')
      if (!/创建|新建/.test(dialog?.querySelector('h2')?.textContent || '')) return
      const titleInput = form.querySelector('input[placeholder*="基础套餐"]')
      if (!titleInput) return
      const panel = document.createElement('fieldset')
      panel.setAttribute(`data-${marker}`, 'true')
      panel.className = 'daily-gift-plan-type'
      panel.innerHTML = `
        <legend>创建类型</legend>
        <label><input type="radio" name="daily-gift-plan-kind" value="plan" checked>普通套餐</label>
        <label><input type="radio" name="daily-gift-plan-kind" value="gift">礼物套餐</label>
      `
      titleInput.closest('div')?.before(panel)
      form.addEventListener(
        'submit',
        () => {
          createGiftPlan = panel.querySelector('input[value="gift"]').checked
        },
        true
      )
    })
  }

  const updatePayload = (body) => {
    if (!createGiftPlan || typeof body !== 'string') return body
    try {
      const payload = JSON.parse(body)
      if (!payload?.plan || typeof payload.plan !== 'object') return body
      payload.plan.is_daily_gift = true
      createGiftPlan = false
      return JSON.stringify(payload)
    } catch {
      return body
    }
  }

  const decorateGiftRows = () => {
    if (location.pathname !== '/subscriptions') return
    if (giftPlanTitles === null) {
      if (giftPlanRequest) return
      giftPlanRequest = fetch('/api/subscription/admin/plans')
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          adminPlans = payload?.data || []
          giftPlanTitles = new Set(
            adminPlans
              .filter((item) => item?.plan?.is_daily_gift)
              .map((item) => item.plan.title)
          )
          decorateGiftRows()
          decorateDeleteButtons()
        })
        .catch(() => {
          giftPlanTitles = new Set()
        })
      return
    }
    document.querySelectorAll('table tr').forEach((row) => {
      const title = [...giftPlanTitles].find((name) => row.textContent.includes(name))
      const planCell = row.querySelector('td:nth-child(2)')
      if (!title || !planCell || planCell.querySelector('[data-daily-gift-badge]')) return
      const badge = document.createElement('span')
      badge.dataset.dailyGiftBadge = 'true'
      badge.className = 'daily-gift-plan-badge'
      badge.textContent = '礼物套餐'
      planCell.append(badge)
    })
  }

  const decorateDeleteButtons = () => {
    if (location.pathname !== '/subscriptions' || adminPlans === null) return
    document.querySelectorAll('table tr').forEach((row) => {
      const id = Number(row.querySelector('td:first-child')?.textContent.trim())
      const plan = adminPlans.find((item) => item?.plan?.id === id)?.plan
      const actions = row.querySelector('td:last-child')
      if (!plan || !actions || actions.querySelector('[data-daily-plan-delete]')) return
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.dailyPlanDelete = String(plan.id)
      button.className = 'daily-plan-delete'
      button.textContent = '删除'
      button.addEventListener('click', async () => {
        if (!window.confirm(`确认删除套餐“${plan.title}”？`)) return
        button.disabled = true
        try {
          const response = await fetch(`/api/subscription/admin/plans/${plan.id}`, { method: 'DELETE' })
          if (!response.ok) {
            const payload = await response.json().catch(() => null)
            throw new Error(payload?.message || '删除套餐失败')
          }
          location.reload()
        } catch (error) {
          window.alert(error.message || '删除套餐失败')
          button.disabled = false
        }
      })
      actions.append(button)
    })
  }

  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    const path = new URL(url, location.href).pathname
    if (path === '/api/subscription/admin/plans' && (init.method || 'GET').toUpperCase() === 'POST') {
      return originalFetch(input, { ...init, body: updatePayload(init.body) })
    }
    return originalFetch(input, init)
  }

  const originalSend = XMLHttpRequest.prototype.send
  const originalOpen = XMLHttpRequest.prototype.open
  const requests = new WeakMap()
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    requests.set(this, { method: String(method).toUpperCase(), url: String(url) })
    return originalOpen.call(this, method, url, ...rest)
  }
  XMLHttpRequest.prototype.send = function (body) {
    const request = requests.get(this)
    const path = request ? new URL(request.url, location.href).pathname : ''
    if (request?.method === 'POST' && path === '/api/subscription/admin/plans') {
      return originalSend.call(this, updatePayload(body))
    }
    return originalSend.call(this, body)
  }

  const style = document.createElement('style')
  style.textContent = `
    .daily-gift-plan-type { display: flex; gap: 18px; margin: 0 0 16px; padding: 12px; border: 1px solid var(--border, #d5d5d5); border-radius: 6px; }
    .daily-gift-plan-type legend { padding: 0 4px; font-size: 13px; font-weight: 600; }
    .daily-gift-plan-type label { display: flex; align-items: center; gap: 6px; font-size: 14px; }
    .daily-gift-plan-badge { display: inline-flex; margin-top: 4px; border: 1px solid #60a5fa; border-radius: 4px; color: #2563eb; padding: 1px 5px; font-size: 11px; font-weight: 600; }
    .daily-plan-delete { border: 0; background: transparent; color: #dc2626; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; }
    .daily-plan-delete:disabled { cursor: default; opacity: .55; }
  `
  document.head.append(style)

  const decorate = () => {
    decorateCreateDialog()
    decorateGiftRows()
    decorateDeleteButtons()
  }
  const observer = new MutationObserver(decorate)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  decorate()
})()
