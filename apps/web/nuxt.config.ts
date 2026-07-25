// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only: Nest origin (no /api suffix). Override with NUXT_API_PROXY_TARGET.
    apiProxyTarget: 'http://127.0.0.1:4000',
    public: {
      // Same-origin path so cookies work on Safari / mobile (see server/routes/api).
      // Override with NUXT_PUBLIC_API_BASE only if you intentionally go cross-origin.
      apiBase: '/api'
    }
  },


  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
