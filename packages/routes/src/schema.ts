import {defineType, defineField, defineArrayMember} from 'sanity'

/**
 * Schema type definition for route configuration documents.
 *
 * Each document represents a "channel" (e.g. "web", "app") and contains:
 * - baseUrls: environment-specific base URLs
 * - routes: mapping from document types to URL patterns
 */
export const routeConfig = defineType({
  name: 'routes.config',
  title: 'Route Configuration',
  type: 'document',
  description:
    'Defines how document types map to URL paths on your site. Each route connects a document type to a base path and a pattern for generating slugs.',
  fields: [
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      description:
        "A label to group routes by output target, such as 'web', 'mobile-app', or 'docs-site'. Documents can have different URLs per channel.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'baseUrls',
      title: 'Base URLs',
      type: 'array',
      description:
        'The root URLs for each environment where this site is deployed. Add one entry per environment (production, staging, preview).',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              title: 'Environment Name',
              type: 'string',
              description:
                "A label for this environment, e.g., 'production', 'staging', or 'preview'.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Base URL',
              type: 'string',
              description:
                'The root URL for this environment, including the protocol. For example, `https://www.example.com`.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'isDefault',
              title: 'Default Environment',
              type: 'boolean',
              description:
                "When enabled, this environment's URL is used to build links in the Studio and previews. Only one environment should be marked as default.",
              initialValue: false,
            }),
          ],
          preview: {
            select: {
              title: 'name',
              subtitle: 'url',
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'routes',
      title: 'Routes',
      type: 'array',
      description: 'Route definitions mapping document types to URL patterns',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'types',
              title: 'Document Types',
              type: 'array',
              description:
                'Which document types this route applies to. Documents of these types will have URLs generated using the base path and pattern below.',
              of: [defineArrayMember({type: 'string'})],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: 'basePath',
              title: 'Base Path',
              type: 'string',
              description:
                'The URL prefix prepended to every document\'s slug. A base path of `/blog` produces URLs like `/blog/my-post`.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'pathExpression',
              title: 'Path Expression (GROQ)',
              type: 'text',
              description:
                "A GROQ expression that resolves to the URL path segment for each document. Auto-generated from the settings above, or editable in 'Custom GROQ expression' mode.",
            }),
          ],
          preview: {
            select: {
              types: 'types',
              basePath: 'basePath',
            },
            prepare({types, basePath}) {
              return {
                title: basePath || '/',
                subtitle: Array.isArray(types) ? types.join(', ') : '',
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      channel: 'channel',
    },
    prepare({channel}) {
      return {
        title: `Route Config: ${channel || 'untitled'}`,
      }
    },
  },
})

/**
 * Schema type definition for route map shard documents.
 *
 * Each document is a pre-computed shard mapping document IDs to their
 * resolved URL paths for a specific channel + document type combination.
 */
export const routeMap = defineType({
  name: 'routes.map',
  title: 'Route Map',
  type: 'document',
  description:
    'System-generated lookup table that maps documents to resolved URL paths. Built automatically \u2014 do not edit manually.',
  readOnly: true,
  fields: [
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      description: 'The channel this route map was generated for.',
    }),
    defineField({
      name: 'documentType',
      title: 'Document Type',
      type: 'string',
      description: 'The Sanity document type these route entries apply to.',
    }),
    defineField({
      name: 'basePath',
      title: 'Base Path',
      type: 'string',
      description: 'The URL prefix for all entries in this map.',
    }),
    defineField({
      name: 'entries',
      title: 'Route Entries',
      type: 'array',
      description: 'Each entry maps one document to its resolved URL path.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'doc',
              title: 'Document',
              type: 'reference',
              weak: true,
              to: [] as any,
              description: 'A weak reference to the source document.',
            }),
            defineField({
              name: 'path',
              title: 'Resolved Path',
              type: 'string',
              description:
                'The URL path for this document, e.g., `getting-started/installation`.',
            }),
          ],
          preview: {
            select: {
              path: 'path',
              docTitle: 'doc.title', // won't resolve without to types, but that's ok
            },
            prepare({path}: {path?: string}) {
              return {
                title: path || '(no path)',
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      channel: 'channel',
      documentType: 'documentType',
      entries: 'entries',
    },
    prepare({channel, documentType, entries}) {
      const count = Array.isArray(entries) ? entries.length : 0
      return {
        title: `Route Map: ${channel || '?'}/${documentType || '?'}`,
        subtitle: `${count} entries`,
      }
    },
  },
})
