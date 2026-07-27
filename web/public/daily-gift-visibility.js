(() => {
  let configured = null

  const applyEmptyState = () => {
    if (configured !== false || location.pathname !== '/gift') return
    const page = document.querySelector('main main')
    if (!page || page.querySelector('#daily-gift-empty-state')) return
    page.innerHTML = `
      <section id="daily-gift-empty-state" class="daily-gift-empty-state" aria-labelledby="daily-gift-empty-title">
        <h2 id="daily-gift-empty-title">礼物</h2>
        <p>暂无礼物套餐</p>
      </section>
    `
  }

  const checkGiftConfiguration = async () => {
    try {
      const response = await fetch('/api/gift/daily')
      if (!response.ok) return
      const payload = await response.json()
      configured = payload?.data?.configured === true
      applyEmptyState()
    } catch {
      // Keep the entry visible when the status cannot be determined.
    }
  }

  const style = document.createElement('style')
  style.textContent = `
    .daily-gift-empty-state { display: grid; min-height: 360px; place-content: center; gap: 8px; text-align: center; }
    .daily-gift-empty-state h2 { margin: 0; font-size: 20px; letter-spacing: 0; }
    .daily-gift-empty-state p { margin: 0; color: var(--muted-foreground, #6b7280); font-size: 14px; }
  `
  document.head.append(style)

  new MutationObserver(applyEmptyState).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  checkGiftConfiguration()
})()
