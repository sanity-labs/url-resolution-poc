import type {SlugValue, ValidationContext} from 'sanity'

/**
 * Create a slug uniqueness validation rule that checks for duplicate slugs
 * within the same document type.
 *
 * Use this in your schema's slug field validation to give editors immediate
 * feedback before publishing.
 *
 * @param options - Optional configuration
 * @param options.apiVersion - Sanity API version (default: `'2024-01-01'`)
 * @returns A custom validation function for use with `rule.custom()`
 *
 * @example
 * ```ts
 * import { defineField } from 'sanity'
 * import { uniqueSlug } from '@sanity/routes/studio'
 *
 * defineField({
 *   name: 'slug',
 *   type: 'slug',
 *   validation: (rule) => rule.required().custom(uniqueSlug()),
 * })
 * ```
 *
 * @example
 * ```ts
 * // With custom slug field name
 * defineField({
 *   name: 'permalink',
 *   type: 'slug',
 *   validation: (rule) => rule.required().custom(uniqueSlug({ field: 'permalink' })),
 * })
 * ```
 */
export function uniqueSlug(options?: {
  apiVersion?: string
  field?: string
}): (slug: SlugValue | undefined, context: ValidationContext) => Promise<string | true> {
  const apiVersion = options?.apiVersion || '2024-01-01'
  const field = options?.field || 'slug'

  return async (slug, context) => {
    if (!slug?.current) return 'Slug is required'

    const {document, getClient} = context
    const client = getClient({apiVersion})
    const id = document?._id || ''
    const publishedId = id.replace(/^drafts\./, '')

    const count = await client.fetch(
      `count(*[
        _type == $type
        && ${field}.current == $slug
        && !(_id in [$draftId, $publishedId])
      ])`,
      {
        type: document?._type,
        slug: slug.current,
        draftId: `drafts.${publishedId}`,
        publishedId,
      },
    )

    return count > 0 ? `Another ${document?._type} already uses slug "${slug.current}"` : true
  }
}
