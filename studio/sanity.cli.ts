import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'bb8k7pej',
    dataset: 'production',
  },
  typegen: {
    path: [
      './**/*.{ts,tsx}',
      '../examples/nextjs/**/*.{ts,tsx}',
    ],
    schema: 'schema.json',
    generates: '../examples/nextjs/sanity.types.ts',
  },
})
