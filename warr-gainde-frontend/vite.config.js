// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     open: true   // Ouvre le navigateur automatiquement au démarrage
//     // open: 'edge'  // Si tu veux forcer Microsoft Edge spécifiquement
//   }
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Utilise le manifest.webmanifest existant dans /public
      manifest: false,

      // Stratégie : injectManifest pour contrôle total, ou generateSW pour simplicité
      strategies: 'generateSW',

      // Paramètres du Service Worker généré
      workbox: {
        // Précache les assets statiques du build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

        // Routes navigables → renvoyer index.html (SPA)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],

        // Cache runtime : API calls
        runtimeCaching: [
          {
            // Images uploadées / profils (Cloudinary, local storage…)
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'warr-gainde-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
              },
            },
          },
          {
            // Tuiles OpenStreetMap (carte Leaflet)
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 jours
              },
            },
          },
          {
            // API calls → Network First (données fraîches avec fallback cache)
            urlPattern: /^http:\/\/localhost:8000\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'warr-gainde-api',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },

      // Options du mode dev (désactiver le SW en développement pour éviter les conflits)
      devOptions: {
        enabled: false,
      },

      // Injection automatique du registerSW dans le HTML
      injectRegister: 'auto',

      // Rechargement automatique quand un nouveau SW est disponible
      registerType: 'autoUpdate',

      // Ne pas inclure le manifest ici (il est dans /public/manifest.webmanifest)
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
    }),
  ],

  server: {
    open: true,
  },
})
