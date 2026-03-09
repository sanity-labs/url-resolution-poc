import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'bb8k7pej',
    dataset: 'production',
  },
  typegen: {
    path: './src/**/*.{ts,svelte}',
    schema: '../../studio/schema.json',
    generates: './src/lib/sanity.types.ts',
  },
})
