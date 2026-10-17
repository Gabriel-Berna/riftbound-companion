/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// No GitHub Pages o app fica em /riftbound-companion/; localmente, na raiz.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Artes das cartas vêm da CDN da Riot; ficam guardadas no aparelho depois da primeira vez.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cmsassets\.rgpub\.io\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-art',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Riftbound Companion',
        short_name: 'Riftbound',
        description: 'Placar e guia de turno para partidas de Riftbound',
        lang: 'pt-BR',
        theme_color: '#061014',
        background_color: '#061014',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    // A biblioteca de cartas (src/data/library.json) é um bloco grande, mas carregado só sob demanda.
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
