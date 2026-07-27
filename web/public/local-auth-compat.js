(() => {
  const tokenKey = 'snowapi.local.access-token'
  const nativeFetch = window.fetch.bind(window)
  const nativeOpen = XMLHttpRequest.prototype.open
  const nativeSend = XMLHttpRequest.prototype.send
  const requests = new WeakMap()
  const removedRoute = /^(?:\/playground(?:\/|$)|\/chat2link(?:\/|$)|\/chat(?:\/|$)|\/system-settings\/content\/chat(?:\/|$))/

  if (removedRoute.test(location.pathname)) {
    location.replace('/dashboard')
    return
  }

  const hideChatModules = (payload) => {
    const status = payload?.data ?? payload
    if (!status || typeof status !== 'object') return payload

    let modules = {}
    try {
      modules = JSON.parse(status.SidebarModulesAdmin || '{}')
    } catch {
      modules = {}
    }
    modules.chat = { enabled: false, playground: false, chat: false }
    status.SidebarModulesAdmin = JSON.stringify(modules)
    status.chats = []
    return payload
  }

  const isStatus = (url) => new URL(url, location.href).pathname === '/api/status'
  const transformStatusText = (url, text) => {
    if (!isStatus(url) || typeof text !== 'string' || !text) return text
    try {
      return JSON.stringify(hideChatModules(JSON.parse(text)))
    } catch {
      return text
    }
  }

  try {
    const responseText = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      'responseText'
    )
    if (responseText?.get) {
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        configurable: true,
        get() {
          const request = requests.get(this) || { url: '' }
          return transformStatusText(request.url, responseText.get.call(this))
        },
      })
    }
  } catch {
    // Browsers that protect the native getter still receive the fetch path below.
  }

  localStorage.setItem('sidebar_state', 'false')

  const token = () => sessionStorage.getItem(tokenKey) || ''
  const remember = (payload) => {
    const accessToken = payload?.data?.access_token
    if (typeof accessToken === 'string' && accessToken) {
      sessionStorage.setItem(tokenKey, accessToken)
    }
  }
  const isApi = (url) => new URL(url, location.href).pathname.startsWith('/api/')
  const isAuthBootstrap = (url) => {
    const path = new URL(url, location.href).pathname
    return path === '/api/user/login' || path === '/api/user/auth/refresh'
  }

  const refresh = async () => {
    try {
      const response = await nativeFetch('/api/user/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (response.ok) remember(await response.json())
    } catch {
      sessionStorage.removeItem(tokenKey)
    }
  }

  let authReady = refresh()
  window.setInterval(() => {
    authReady = refresh()
  }, 12 * 60 * 1000)

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const requestUrl = String(url)
    requests.set(this, { method, url: requestUrl })
    if (String(method).toUpperCase() === 'GET' && isApi(requestUrl)) {
      const versionedUrl = new URL(requestUrl, location.href)
      versionedUrl.searchParams.set('__local_mirror_rev', '2')
      const target = versionedUrl.origin === location.origin
        ? `${versionedUrl.pathname}${versionedUrl.search}${versionedUrl.hash}`
        : versionedUrl.href
      return nativeOpen.call(this, method, target, ...rest)
    }
    return nativeOpen.call(this, method, url, ...rest)
  }

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this
    const request = requests.get(xhr) || { method: 'GET', url: '' }
    const send = () => {
      const accessToken = token()
      if (accessToken && isApi(request.url)) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
      }
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState !== XMLHttpRequest.DONE || xhr.status < 200 || xhr.status >= 300) return
        try {
          remember(JSON.parse(xhr.responseText))
        } catch {
          // Non-JSON API responses do not carry authentication state.
        }
      })
      nativeSend.call(xhr, body)
    }

    if (isApi(request.url) && !isAuthBootstrap(request.url)) {
      authReady.finally(send)
    } else {
      send()
    }
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    if (isApi(url) && !isAuthBootstrap(url)) await authReady
    const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers))
    const accessToken = token()
    if (accessToken && isApi(url)) headers.set('Authorization', `Bearer ${accessToken}`)
    const response = await nativeFetch(input, { ...init, headers })
    if (response.ok && isAuthBootstrap(url)) {
      try {
        remember(await response.clone().json())
      } catch {
        // Ignore non-JSON authentication responses.
      }
    }
    if (!response.ok || !isStatus(url)) return response
    try {
      const body = JSON.stringify(hideChatModules(await response.clone().json()))
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    } catch {
      return response
    }
  }
})()
