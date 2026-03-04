import {useState} from 'react'
import {type StringInputProps, useFormValue} from 'sanity'
import {Stack, Button, Card, Code} from '@sanity/ui'
import {ChevronDownIcon, ChevronRightIcon} from '@sanity/icons'

export function PathExpressionField(props: StringInputProps) {
  const [showGroq, setShowGroq] = useState(false)

  // Read mode from sibling field
  // props.path is like ['routes', {_key: 'xxx'}, 'pathExpression']
  // We need to go up one level to read 'mode'
  const parentPath = props.path.slice(0, -1)
  const mode = useFormValue([...parentPath, 'mode']) as string | undefined

  if (mode === 'custom' || !mode) {
    // Custom mode or no mode set: render the default editable text input
    return props.renderDefault(props)
  }

  // Preset modes: show collapsible read-only GROQ
  return (
    <Stack space={2}>
      <Button
        mode="ghost"
        tone="default"
        fontSize={1}
        padding={2}
        onClick={() => setShowGroq(!showGroq)}
        icon={showGroq ? ChevronDownIcon : ChevronRightIcon}
        text={showGroq ? 'Hide generated GROQ' : 'Show generated GROQ'}
      />
      {showGroq && (
        <Card padding={3} radius={2} tone="transparent" border>
          <Code language="groq" size={1}>
            {props.value || 'slug.current'}
          </Code>
        </Card>
      )}
    </Stack>
  )
}
