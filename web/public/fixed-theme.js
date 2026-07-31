(() => {
  const themeCookieNames = [
    'vite-ui-theme',
    'theme_preset',
    'theme_font',
    'theme_radius',
    'theme_scale',
    'theme_content_layout',
  ]
  const themeButtonLabels = new Set([
    'toggle theme',
    'open theme settings',
    '切换主题',
    '打开主题设置',
    '切換主題',
    '開啟主題設定',
    'テーマを切り替える',
    'テーマ設定を開く',
    'переключить тему',
    'открыть настройки темы',
    'changer de thème',
    'ouvrir les paramètres du thème',
    'chuyển đổi chủ đề',
    'mở cài đặt chủ đề',
  ])
  const languageButtonLabels = new Set([
    'change language',
    '更改语言',
    '更改語言',
    '言語を変更',
    'изменить язык',
    'changer de langue',
    'đổi ngôn ngữ',
  ])
  const languageSectionTitles = new Set([
    'language preferences',
    '语言偏好',
    '語言偏好',
    '言語設定',
    'языковые настройки',
    'préférences de langue',
    'tùy chọn ngôn ngữ',
  ])
  let updateQueued = false

  const setAttribute = (element, name, value) => {
    if (element?.getAttribute(name) !== value) {
      element?.setAttribute(name, value)
    }
  }

  const lockTheme = () => {
    const root = document.documentElement
    if (root.classList.contains('dark')) root.classList.remove('dark')
    if (!root.classList.contains('light')) root.classList.add('light')

    const body = document.body
    if (body) {
      setAttribute(body, 'data-theme-preset', 'monochrome')
      setAttribute(body, 'data-theme-font', 'sans')
      setAttribute(body, 'data-theme-content-layout', 'full')
      body.removeAttribute('data-theme-radius')
      body.removeAttribute('data-theme-scale')
    }

    const themeColor = document.querySelector("meta[name='theme-color']")
    setAttribute(themeColor, 'content', '#fff')
  }

  const hideThemeControls = () => {
    document
      .querySelectorAll("button[aria-describedby='config-drawer-description']")
      .forEach((button) => {
        if (!button.hasAttribute('data-fixed-theme-hidden')) {
          button.setAttribute('data-fixed-theme-hidden', '')
        }
      })

    document.querySelectorAll('button').forEach((button) => {
      const label = (button.getAttribute('aria-label') || button.textContent || '')
        .trim()
        .toLowerCase()
      if (
        (themeButtonLabels.has(label) || languageButtonLabels.has(label)) &&
        !button.hasAttribute('data-fixed-theme-hidden')
      ) {
        button.setAttribute('data-fixed-theme-hidden', '')
      }
    })

    document.querySelectorAll('[cmdk-group-heading]').forEach((heading) => {
      if (heading.textContent?.trim().toLowerCase() !== 'theme') return
      const group = heading.closest('[cmdk-group]')
      if (group && !group.hasAttribute('data-fixed-theme-hidden')) {
        group.setAttribute('data-fixed-theme-hidden', '')
      }
    })

    document.querySelectorAll('h2, h3, h4').forEach((heading) => {
      const title = heading.textContent?.trim().toLowerCase() || ''
      if (!languageSectionTitles.has(title)) return
      const card = heading.closest("[data-slot='card']")
      if (card && !card.hasAttribute('data-fixed-theme-hidden')) {
        card.setAttribute('data-fixed-theme-hidden', '')
      }
    })
  }

  const applyFixedTheme = () => {
    updateQueued = false
    lockTheme()
    hideThemeControls()
  }

  const queueUpdate = () => {
    if (updateQueued) return
    updateQueued = true
    queueMicrotask(applyFixedTheme)
  }

  const style = document.createElement('style')
  style.textContent = `
    [data-fixed-theme-hidden],
    button[aria-describedby='config-drawer-description'] {
      display: none !important;
    }
  `
  document.head.append(style)

  for (const name of themeCookieNames) {
    document.cookie = `${name}=; path=/; max-age=0`
  }

  const detectedLanguage = (() => {
    const languages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
    for (const language of languages) {
      const locale = language.trim().replaceAll('_', '-').toLowerCase()
      if (locale.startsWith('zh')) {
        return /(?:^|-)hant(?:-|$)|(?:^|-)(?:tw|hk|mo)(?:-|$)/.test(locale)
          ? 'zhTW'
          : 'zhCN'
      }
      const supportedLanguage = ['en', 'fr', 'ru', 'ja', 'vi'].find(
        (code) => locale === code || locale.startsWith(`${code}-`)
      )
      if (supportedLanguage) return supportedLanguage
    }
    return 'en'
  })()
  localStorage.setItem('i18nextLng', detectedLanguage)

  new MutationObserver(queueUpdate).observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  })
  window.addEventListener('pageshow', queueUpdate)
  queueUpdate()
})()
