(() => {
  const copy = new Map([
    ['Gift Card', '\u4eca\u65e5\u793c\u7269'],
    ['Do whatever you want.', '\u6bcf\u65e5\u4e00\u4efd\u968f\u673a\u60ca\u559c'],
    ['Gently scratch to reveal code', '\u6ed1\u52a8\u522e\u5f00\u6d82\u5c42\u67e5\u770b\u793c\u7269'],
    ['Subscription', '\u8ba2\u9605\u5957\u9910'],
    ['Redeem Now', '\u7acb\u5373\u6fc0\u6d3b'],
    ['Activated', '\u5df2\u6fc0\u6d3b'],
    ['Activating\u2026', '\u6b63\u5728\u6fc0\u6d3b\u2026'],
  ])
  let systemName = ''

  const replaceText = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const value = node.nodeValue?.trim()
      if (value && copy.has(value)) node.nodeValue = copy.get(value)
    }
  }

  const decorateCard = () => {
    if (location.pathname !== '/gift') return
    const card = document.querySelector('.apple-scratch-card')
    if (!card) return
    const header = card.querySelector('.apple-scratch-card__header')
    if (header && !header.querySelector('.gift-brand-wordmark')) {
      const brand = document.createElement('span')
      brand.className = 'gift-brand-wordmark'
      brand.textContent = systemName || document.title || 'Krulu'
      header.prepend(brand)
    }
    const brand = header?.querySelector('.gift-brand-wordmark')
    if (brand && systemName && brand.textContent !== systemName) {
      brand.textContent = systemName
    }
    replaceText(card)
    const legal = card.querySelector('.apple-scratch-card__legal')
    if (legal) {
      const notice = `${systemName || 'Krulu'} \u4fdd\u7559\u6d3b\u52a8\u6700\u7ec8\u89e3\u91ca\u6743\u3002\u793c\u7269\u6fc0\u6d3b\u540e\u7acb\u5373\u751f\u6548\uff0c\u6709\u6548\u671f\u4ece\u6fc0\u6d3b\u65f6\u5f00\u59cb\u8ba1\u7b97\u3002`
      if (legal.textContent !== notice) legal.textContent = notice
    }
  }

  fetch('/api/status', { cache: 'no-store' })
    .then((response) => response.json())
    .then((payload) => {
      systemName = payload?.data?.system_name || ''
      decorateCard()
    })
    .catch(() => decorateCard())

  new MutationObserver(decorateCard).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  decorateCard()
})()
