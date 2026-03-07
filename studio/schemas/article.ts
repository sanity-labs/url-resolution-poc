import { defineType, defineField } from 'sanity'
import { SlugWithUrlPreview, uniqueSlug } from '@sanity/routes/studio'

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      components: { input: SlugWithUrlPreview },
      validation: (rule) => rule.required().custom(uniqueSlug()),
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
