import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// IMPORTANT: for a GitHub Pages PROJECT page the app is served from
// https://<user>.github.io/photo-album-sorter/ — so every built asset must be
// referenced under this base. We only apply it for `vite build`; dev stays at
// '/' so local tooling/preview can load the root. Change PROD_BASE to '/' for a
// user page or custom domain.
const PROD_BASE = '/photo-album-sorter/'

export default defineConfig(({ command }) => {
  const base = command === 'build' ? PROD_BASE : '/'
  return {
  base,
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  worker: {
    format: 'es',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Photo Album Sorter',
        short_name: 'AlbumSorter',
        description:
          'Sort photos into chapters and export a print-ready photobook order. Works offline; your photos stay on your device.',
        theme_color: '#111317',
        background_color: '#111317',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the APP SHELL (build output) — never user photos.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        // Keep the service worker OFF in dev to avoid stale-cache confusion.
        enabled: false,
      },
    }),
  ],
  }
})
