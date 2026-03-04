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
  readOnly: true,
  fields: [
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      description: 'Unique channel identifier (e.g. "web", "app")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'baseUrls',
      title: 'Base URLs',
      type: 'array',
      description: 'Environment-specific base URLs for this channel',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              title: 'Environment Name',
              type: 'string',
              description: 'e.g. "production", "staging", "development"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Base URL',
              type: 'string',
              description: 'e.g. "https://www.sanity.io" or "https://*.sanity.dev"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'isDefault',
              title: 'Is Default',
              type: 'boolean',
              description: 'Use this URL when no environment is specified',
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
              description: 'Document types this route applies to',
              of: [defineArrayMember({type: 'string'})],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: 'basePath',
              title: 'Base Path',
              type: 'string',
              description: 'URL path prefix (e.g. "/blog", "/docs")',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'pathExpression',
              title: 'Path Expression',
              type: 'text',
              description:
                'GROQ expression for the path segment. Defaults to "slug.current". Can be a complex expression like: coalesce(*[_type == "category" && references(^._id)][0].slug.current + "/", "") + slug.current',
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
  readOnly: true,
  fields: [
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      description: 'The channel this shard belongs to',
    }),
    defineField({
      name: 'documentType',
      title: 'Document Type',
      type: 'string',
      description: 'The document type this shard covers',
    }),
    defineField({
      name: 'basePath',
      title: 'Base Path',
      type: 'string',
      description: 'URL path prefix for entries in this shard',
    }),
    defineField({
      name: 'entries',
      title: 'Entries',
      type: 'array',
      description: 'Resolved document-to-path mappings',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'doc',
              title: 'Document',
              type: 'reference',
              weak: true,
              to: [{type: 'document' as const}],
            }),
            defineField({
              name: 'path',
              title: 'Path',
              type: 'string',
              description: 'Resolved path segment for this document',
            }),
          ],
          preview: {
            select: {
              path: 'path',
            },
            prepare({path}) {
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
    },
    prepare({channel, documentType}) {
      return {
        title: `Route Map: ${channel || '?'}/${documentType || '?'}`,
      }
    },
  },
})
