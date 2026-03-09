import { defineLive } from 'next-sanity/live'
import { client } from './sanity'

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
})
