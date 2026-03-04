import { defineType, defineField } from 'sanity'

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        {
          type: 'block',
          marks: {
            annotations: [{
              name: 'internalLink',
              type: 'object',
              fields: [{
                name: 'reference',
                type: 'reference',
                to: [{ type: 'article' }, { type: 'blogPost' }],
              }],
            }],
          },
        },
        {
          type: 'code',
        },
      ],
    }),
  ],
})
