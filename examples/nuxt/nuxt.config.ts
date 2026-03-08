export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  runtimeConfig: {
    // Private — server only (set via NUXT_SANITY_READ_TOKEN env var)
    sanityReadToken: '',
    sanityRoutesEnv: 'production',
  },

  typescript: {
    strict: true,
  },
})
