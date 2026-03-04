import {useMemo} from 'react'
import {type StringInputProps, set, unset, useSchema} from 'sanity'
import {Autocomplete} from '@sanity/ui'

const EXCLUDED_PREFIXES = ['sanity.', 'routes.', 'system.', 'assist.']

export function DocumentTypePicker(props: StringInputProps) {
  const schema = useSchema()

  const documentTypes = useMemo(() => {
    return schema
      .getTypeNames()
      .filter((name) => {
        const type = schema.get(name)
        return (
          type?.type?.name === 'document' &&
          !EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))
        )
      })
      .sort()
  }, [schema])

  const options = useMemo(
    () => documentTypes.map((t) => ({value: t})),
    [documentTypes],
  )

  return (
    <Autocomplete
      id={props.id}
      options={options}
      value={props.value}
      onChange={(value: string) => {
        props.onChange(value ? set(value) : unset())
      }}
      placeholder="Select document type..."
      openButton
    />
  )
}
