(() => {
  const marker = 'daily-gift-plan-type'
  let createGiftPlan = false

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
  `
  document.head.append(style)

  const observer = new MutationObserver(decorateCreateDialog)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  decorateCreateDialog()
})()
