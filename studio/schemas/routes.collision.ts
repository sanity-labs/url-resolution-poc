import {defineType, defineField} from 'sanity'
import {WarningOutlineIcon} from '@sanity/icons'

export const collisionType = defineType({
  name: 'routes.collision',
  title: 'URL Collision',
  type: 'document',
  readOnly: true,
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'path',
      title: 'Colliding path',
      type: 'string',
      description:
        'Two or more documents resolve to this URL. Change one of their slugs to fix it.',
    }),
    defineField({
      name: 'documents',
      title: 'Conflicting documents',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'article'}, {type: 'blogPost'}], weak: true}],
      description:
        'These documents share the same URL. Open each one and change its slug so they no longer collide.',
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
          ? `Detected ${new Date(detectedAt).toLocaleDateString()} \u2014 change a slug to resolve`
          : '',
      }
    },
  },
})
