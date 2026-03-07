import {defineType, defineField} from 'sanity'

export const collisionType = defineType({
  name: 'routes.collision',
  title: 'URL Collision',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'path',
      title: 'Colliding path',
      type: 'string',
      description: 'The URL path where two or more documents resolve to the same URL',
    }),
    defineField({
      name: 'documents',
      title: 'Conflicting documents',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'article'}, {type: 'blogPost'}], weak: true}],
      description: 'Documents that resolve to the same URL',
    }),
    defineField({
      name: 'detectedAt',
      title: 'Detected at',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {path: 'path', detectedAt: 'detectedAt'},
    prepare({path, detectedAt}) {
      return {
        title: `⚠️ ${path}`,
        subtitle: detectedAt
          ? `Detected ${new Date(detectedAt).toLocaleDateString()}`
          : '',
      }
    },
  },
})
