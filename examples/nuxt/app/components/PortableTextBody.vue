<script setup lang="ts">
import { getPath } from '@sanity/routes'
import { PortableText } from '@portabletext/vue'
import { h } from 'vue'

const props = defineProps<{
  value: any
  urlMap: Record<string, string>
}>()

const components = {
  marks: {
    internalLink: ({ value: mark }: any, { slots }: any) => {
      const url = mark?.reference ? props.urlMap[mark.reference._ref] : undefined
      const href = url ? (getPath(url) ?? url) : '#'
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
