import { defineType, defineField } from 'sanity'

export const docsNavSection = defineType({
  name: 'docsNavSection',
  title: 'Docs Nav Section',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({
      name: 'articles',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'article' }] }],
    }),
  ],
})
