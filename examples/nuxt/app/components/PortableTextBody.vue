<script setup lang="ts">
import { PortableText } from '@portabletext/vue'
import { h } from 'vue'

const props = defineProps<{
  value: any
  urlMap: Record<string, string>
}>()

function getPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

const components = {
  marks: {
    internalLink: ({ value: mark }: any, { slots }: any) => {
      const url = mark?.reference ? props.urlMap[mark.reference._ref] : undefined
      const href = url ? getPath(url) : '#'
      return url
        ? h('a', { href }, slots.default?.())
        : h('span', {}, slots.default?.())
    },
  },
}
</script>

<template>
  <PortableText :value="value" :components="components" />
</template>
