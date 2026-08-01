import type { IncomingMessage } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
            proxyRes.headers['cache-control'] = 'no-store'
            const setCookie = proxyRes.headers['set-cookie']
            if (!setCookie) return
            proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
              cookie.replaceAll(/;\s*secure/gi, '')
            )
          },
        },
      }
  const proxy = Object.fromEntries(
    (['/api', '/mj'] as const).map((pathPrefix) => [
      pathPrefix,
      { target: serverUrl, changeOrigin: true, ...localCookieProxy },
    ])
  )

  return {
    plugins: [pluginReact(), pluginTailwindcss({ optimize: false })],
    splitChunks: {
      preset: 'default',
      cacheGroups: {
        'vendor-react': {
          test: /node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          enforce: true,
        },
        'vendor-ui-primitives': {
          test: /node_modules[\\/](@base-ui|@radix-ui)[\\/]/,
          name: 'vendor-ui-primitives',
          chunks: 'all',
          enforce: true,
        },
        'vendor-tanstack': {
          test: /node_modules[\\/]@tanstack[\\/]/,
          name: 'vendor-tanstack',
          chunks: 'all',
          enforce: true,
        },
        // three.js and the react-three stack are only reachable from the
        // lazily loaded check-in lanyard, so keep them out of the shared
        // vendor chunks.
        'vendor-three': {
          test: /node_modules[\\/](three|meshline|@react-three|@dimforge)[\\/]/,
          name: 'vendor-three',
          chunks: 'async',
          enforce: true,
        },
      },
    },
    source: {
      entry: {
        index: './src/main.tsx',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    html: {
      template: './index.html',
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
    tools: {
      rspack: {
        module: {
          rules: [{ test: /\.glb$/, type: 'asset/resource' }],
        },
        plugins: [
          tanstackRouter({
            target: 'react',
            autoCodeSplitting: isProduction,
          }),
        ],
      },
    },
  }
})
