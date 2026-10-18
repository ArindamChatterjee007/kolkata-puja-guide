import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'

export const pwaOptions = {
  registerType: 'autoUpdate',
  injectRegister: 'script-defer',
  scope: './',
  includeAssets: ['icons/*.png', 'office/board.json'],
  manifest: {
    id: './',
    name: 'PujaPath',
    short_name: 'PujaPath',
    description: 'A source-backed Kolkata Puja planning guide with local-only planning state.',
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#bc2f32',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{html,js,css,json,webmanifest,woff,woff2,ttf,otf,png,jpg,jpeg,webp,avif,gif,svg,ico,md}'],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/\/office\.html(?:\?.*)?$/, /\/photos\.html(?:\?.*)?$/],
    cleanupOutdatedCaches: true,
    skipWaiting: false,
    clientsClaim: false,
    runtimeCaching: [],
    offlineGoogleAnalytics: false,
  },
} satisfies Partial<VitePWAOptions>

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA(pwaOptions)],
  server: {
    host: '127.0.0.1',
    fs: { strict: true, allow: [fileURLToPath(new URL('.', import.meta.url))] },
  },
  preview: { host: '127.0.0.1' },
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        office: fileURLToPath(new URL('./office.html', import.meta.url)),
        photos: fileURLToPath(new URL('./photos.html', import.meta.url)),
      },
    },
  },
})
