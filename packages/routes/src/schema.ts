import {defineType, defineField, defineArrayMember} from 'sanity'
import {RouteEntryInput} from './components/RouteEntryInput.js'
import {DocumentTypePicker} from './components/DocumentTypePicker.js'
import {PathExpressionField} from './components/PathExpressionField.js'

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
      name: 'isDefault',
      title: 'Default Channel',
      type: 'boolean',
      description:
        'Use this channel when no channel is specified. Only one channel should be marked as default.',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          if (!value) return true
          const {document, getClient} = context
          const client = getClient({apiVersion: '2024-01-01'})
          const existing = await client.fetch(
            `count(*[_type == "routes.config" && isDefault == true && _id != $id && !(_id in path("drafts.**"))])`,
            {id: document?._id?.replace(/^drafts\./, '')},
          )
          return existing > 0
            ? 'Another channel is already marked as default. Only one channel can be the default.'
            : true
        }),
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
          components: {
            input: RouteEntryInput,
          },
          fields: [
            defineField({
              name: 'types',
              title: 'Document Types',
              type: 'array',
              description:
                'Which document types this route applies to. Documents of these types will have URLs generated using the base path and pattern below.',
              of: [
                defineArrayMember({
                  type: 'string',
                  components: {
                    input: DocumentTypePicker,
                  },
                }),
              ],
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
              name: 'baseUrls',
              title: 'Base URL Overrides',
              type: 'array',
              description:
                'Optional: override the channel-level base URLs for this route. When set, URLs for documents matching this route use these base URLs instead of the channel defaults.',
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
              name: 'locales',
              title: 'Supported Locales',
              type: 'array',
              description:
                'Locales supported by this route. When set, the pathExpression can use $locale to resolve locale-specific slugs. Leave empty for non-localized routes.',
              of: [defineArrayMember({type: 'string'})],
            }),
            // Mode selector
            defineField({
              name: 'mode',
              title: 'Path Pattern',
              type: 'string',
              description: 'How the URL path is built after the base path.',
              options: {
                list: [
                  {title: 'Slug only', value: 'simpleSlug'},
                  {title: 'Section + slug', value: 'parentSlug'},
                  {title: 'Custom GROQ expression', value: 'custom'},
                ],
                layout: 'radio',
              },
              initialValue: 'simpleSlug',
            }),
            // Slug field override (visible in simpleSlug and parentSlug modes)
            defineField({
              name: 'slugField',
              title: 'Slug Field',
              type: 'string',
              description:
                'The field on the document used as the URL slug. Defaults to `slug.current`.',
              placeholder: 'slug.current',
              hidden: ({parent}) => parent?.mode === 'custom',
            }),
            // Parent config (visible in parentSlug mode only)
            defineField({
              name: 'parentType',
              title: 'Parent Document Type',
              type: 'string',
              description:
                'The document type whose slug becomes the first path segment.',
              hidden: ({parent}) => parent?.mode !== 'parentSlug',
              components: {
                input: DocumentTypePicker,
              },
            }),
            defineField({
              name: 'parentSlugField',
              title: 'Parent Slug Field',
              type: 'string',
              description:
                'The field on the parent document used for its URL segment. Defaults to `slug.current`.',
              placeholder: 'slug.current',
              hidden: ({parent}) => parent?.mode !== 'parentSlug',
            }),
            defineField({
              name: 'parentRelationship',
              title: 'Reference Direction',
              type: 'string',
              description: 'How the parent and child documents are linked.',
              options: {
                list: [
                  {title: 'Parent references this document', value: 'parentReferencesChild'},
                  {title: 'This document references parent', value: 'childReferencesParent'},
                ],
                layout: 'radio',
              },
              initialValue: 'parentReferencesChild',
              hidden: ({parent}) => parent?.mode !== 'parentSlug',
            }),
            defineField({
              name: 'parentReferenceField',
              title: 'Reference Field',
              type: 'string',
              description:
                'The field name that holds the reference. E.g., `category` if your post has a `category` reference field.',
              hidden: ({parent}) =>
                parent?.mode !== 'parentSlug' ||
                parent?.parentRelationship !== 'childReferencesParent',
            }),
            defineField({
              name: 'pathExpression',
              title: 'Path Expression (GROQ)',
              type: 'text',
              description:
                "A GROQ expression that resolves to the URL path segment for each document. Auto-generated from the settings above, or write your own in 'Custom GROQ expression' mode.",
              components: {
                input: PathExpressionField,
              },
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
 * Creates the route map schema type with the correct reference targets.
 *
 * Each document is a pre-computed shard mapping document IDs to their
 * resolved URL paths for a specific channel + document type combination.
 *
 * @param routableTypes - The document type names that can appear in route maps.
 *   When provided, the `doc` field uses a proper weak reference with `to` set
 *   to these types. When empty, falls back to a plain object field to avoid
 *   Sanity's "reference type should define at least one accepted type" error.
 */
export function createRouteMapType(routableTypes?: string[]) {
  const types = routableTypes?.filter(Boolean) ?? []

  const docField =
    types.length > 0
      ? defineField({
          name: 'doc',
          title: 'Document',
          type: 'reference',
          weak: true,
          to: types.map((t) => ({type: t})),
          description: 'A weak reference to the source document.',
        })
      : defineField({
          name: 'doc',
          title: 'Document',
          type: 'object',
          description:
            'A weak reference to the source document. Configure routable types in routesPlugin() to enable full reference support.',
          fields: [
            defineField({
              name: 'refId',
              title: 'Document ID',
              type: 'string',
              description: 'The referenced document ID.',
            }),
          ],
        })

  return defineType({
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
              docField,
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
}

/**
 * @deprecated Use `createRouteMapType()` via `routesPlugin({ types: [...] })` instead.
 * This static export uses the object fallback (no proper reference types).
 */
export const routeMap = createRouteMapType()
