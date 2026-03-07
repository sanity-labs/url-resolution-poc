import {defineType, defineField} from 'sanity'
import {TransferIcon} from '@sanity/icons'

export const redirectType = defineType({
  name: 'routes.redirect',
  title: 'Redirect',
  type: 'document',
  icon: TransferIcon,
  fields: [
    defineField({
      name: 'from',
      title: 'From path',
      type: 'string',
      description: 'The old URL path, e.g. /blog/old-slug',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!value?.startsWith('/')) return 'Must start with /'
          return true
        }),
    }),
    defineField({
      name: 'to',
      title: 'To path',
      type: 'string',
      description: 'The new URL path, e.g. /blog/new-slug',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!value?.startsWith('/')) return 'Must start with /'
          return true
        }),
    }),
    defineField({
      name: 'statusCode',
      title: 'Status code',
      type: 'string',
      description: 'HTTP redirect status code',
      options: {
        list: [
          {title: '301 \u2014 Permanent', value: '301'},
          {title: '302 \u2014 Temporary', value: '302'},
          {title: '307 \u2014 Temporary (preserve method)', value: '307'},
          {title: '308 \u2014 Permanent (preserve method)', value: '308'},
        ],
      },
      initialValue: '301',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'How this redirect was created',
      options: {list: ['auto', 'manual']},
      initialValue: 'manual',
      hidden: true,
    }),
    defineField({
      name: 'document',
      title: 'Related document',
      type: 'reference',
      to: [{type: 'article'}, {type: 'blogPost'}],
      weak: true,
      description: 'The document whose slug change created this redirect',
    }),
  ],
  preview: {
    select: {from: 'from', to: 'to', statusCode: 'statusCode', source: 'source'},
    prepare({from, to, statusCode, source}) {
      return {
        title: `${from} \u2192 ${to}`,
        subtitle: `${statusCode || 301} \u00b7 ${source || 'manual'}`,
      }
    },
  },
})
