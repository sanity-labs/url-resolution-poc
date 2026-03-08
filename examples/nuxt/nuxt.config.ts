export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@nuxtjs/sanity'],

  sanity: {
    projectId: 'bb8k7pej',
    dataset: 'production',
    apiVersion: '2026-03-01',
    useCdn: true,
  },

  runtimeConfig: {
    sanity: {
      token: '', // Set via NUXT_SANITY_TOKEN env var
    },
    sanityRoutesEnv: 'production',
  },

  typescript: {
    strict: true,
  },
})
