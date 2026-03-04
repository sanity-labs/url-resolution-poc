import {useMemo, useEffect} from 'react'
import {type ObjectInputProps, set} from 'sanity'

function generatePathExpression(entry: Record<string, any>): string {
  const slugField = entry?.slugField || 'slug.current'

  switch (entry?.mode) {
    case 'parentSlug': {
      const parentType = entry?.parentType || 'parentType'
      const parentSlug = entry?.parentSlugField || 'slug.current'
      const relationship = entry?.parentRelationship || 'parentReferencesChild'

      if (relationship === 'parentReferencesChild') {
        return `coalesce(*[_type == "${parentType}" && references(^._id)][0].${parentSlug} + "/", "") + ${slugField}`
      } else {
        const refField = entry?.parentReferenceField || 'parent'
        return `coalesce(${refField}->.${parentSlug} + "/", "") + ${slugField}`
      }
    }
    case 'custom':
      return entry?.pathExpression || slugField
    case 'simpleSlug':
    default:
      return slugField
  }
}

export function RouteEntryInput(props: ObjectInputProps) {
  const {value, onChange} = props
  const entry = value as Record<string, any> | undefined

  const derivedExpression = useMemo(
    () => generatePathExpression(entry || {}),
    [
      entry?.mode,
      entry?.slugField,
      entry?.parentType,
      entry?.parentSlugField,
      entry?.parentRelationship,
      entry?.parentReferenceField,
    ],
  )

  // Sync pathExpression when derived value changes (non-custom modes only)
  useEffect(() => {
    if (entry?.mode !== 'custom' && derivedExpression !== entry?.pathExpression) {
      onChange(set(derivedExpression, ['pathExpression']))
    }
  }, [derivedExpression, entry?.mode, entry?.pathExpression, onChange])

  return props.renderDefault(props)
}
