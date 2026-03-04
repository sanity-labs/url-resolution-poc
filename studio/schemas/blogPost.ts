import { defineType, defineField } from 'sanity'
import { SlugWithUrlPreview } from '@sanity/routes'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      components: { input: SlugWithUrlPreview },
    }),
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
