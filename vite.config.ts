/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_NAME } from './src/app/brand.ts'
import { licences } from './src/app/licences.ts'
import { iconPreset, manifest } from './src/app/pwa.ts'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

export default defineConfig({
  // Shown in Settings › About; every pull request that changes the app moves it.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    // Settings › Notices and credits links to it: the licences of the code and fonts the app ships,
    // the service worker's Workbox included (generateSW builds it from these).
    licences({
      title: `${APP_NAME} ${version}`,
      serviceWorker: ['workbox-core', 'workbox-precaching', 'workbox-routing'],
    }),
    // Installable and offline: the whole build is cached, game data, fonts and licences included,
    // and a new version takes over on its own (the saved state lives in localStorage, untouched).
    VitePWA({
      registerType: 'autoUpdate',
      manifest,
      pwaAssets: {
        image: 'public/icon.svg',
        preset: iconPreset,
        htmlPreset: '2023',
        // index.html carries the theme colour, which the app then follows.
        injectThemeColor: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,txt}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        // The combat engine and its data are pure: no DOM, no React. Running them under node keeps that honest.
        test: { name: 'core', environment: 'node', include: ['src/{combat,data}/**/*.test.ts'] },
      },
      {
        extends: true,
        // The Vercel functions run in Node, beside the app: no DOM either.
        test: { name: 'api', environment: 'node', include: ['api/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./test/setup.ts'],
          include: ['src/{app,features,ui,i18n}/**/*.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.test.{ts,tsx}'],
    },
  },
})
