(() => {
  const homeTaglineSelector = '.krulu-home-tagline'
  const releaseTagline = () => {
    document.documentElement.removeAttribute('data-system-name-pending')
  }

  const applySystemName = (systemName) => {
    const tagline = document.querySelector(homeTaglineSelector)
    if (!tagline || !systemName) return false

    const accessibleName = tagline.querySelector('.sr-only')
    if (accessibleName) accessibleName.textContent = systemName

    const visualName = tagline.querySelector('.krulu-shuffle-text')
    if (visualName) {
      visualName.textContent = systemName
      visualName.setAttribute('aria-label', systemName)
      visualName.classList.add('krulu-shuffle-text-ready')
    }

    releaseTagline()
    return true
  }

  const updateHomeName = async () => {
    try {
      const response = await fetch('/api/status', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const payload = await response.json()
      const systemName = payload?.data?.system_name?.trim()
      if (!systemName) return

      const applyAfterIntro = () => {
        // The bundled hero finishes its initial character shuffle first.
        window.setTimeout(() => applySystemName(systemName), 1600)
      }

      if (document.querySelector(homeTaglineSelector)) {
        applyAfterIntro()
        return
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(homeTaglineSelector)) {
          observer.disconnect()
          applyAfterIntro()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      window.setTimeout(() => {
        observer.disconnect()
        releaseTagline()
      }, 5000)
    } catch {
      // Keep the embedded name when the public status endpoint is unavailable.
      releaseTagline()
    }
  }

  void updateHomeName()
})()
