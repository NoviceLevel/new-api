import type { IncomingMessage } from 'node:http'

import { defineConfig, loadEnv } from '@rsbuild/core'

export default defineConfig(({ envMode }) => {
  const env = loadEnv({ mode: envMode, prefixes: ['VITE_'] })
  const serverUrl =
    process.env.VITE_REACT_APP_SERVER_URL ||
    env.rawPublicVars.VITE_REACT_APP_SERVER_URL ||
    'http://127.0.0.1:3000'
  const isProduction = envMode === 'production'
  const localCookieProxy = isProduction
    ? {}
    : {
        on: {
          proxyRes(proxyRes: IncomingMessage) {
            const setCookie = proxyRes.headers['set-cookie']
            if (!setCookie) return
            proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
              cookie.replace(/;\s*secure/gi, '')
            )
          },
        },
      }
  const proxy = Object.fromEntries(
    (['/api', '/mj', '/pg'] as const).map((pathPrefix) => [
      pathPrefix,
      { target: serverUrl, changeOrigin: true, ...localCookieProxy },
    ])
  )

  return {
    source: {
      entry: {
        index: './src/mirror-entry.ts',
      },
    },
    html: {
      template: './public/index.html',
      inject: false,
    },
    server: {
      host: '0.0.0.0',
      historyApiFallback: true,
      strictPort: false,
      proxy,
    },
    output: {
      minify: isProduction,
      target: 'web',
      distPath: {
        root: 'dist',
      },
    },
    performance: {
      buildCache: false,
      removeConsole: false,
    },
  }
})
