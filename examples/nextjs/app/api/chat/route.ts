import { streamText, tool } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createMCPClient } from '@ai-sdk/mcp'
import { z } from 'zod'
import { createClient } from '@sanity/client'
import { createRouteResolver } from '@sanity/routes'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  apiVersion: '2026-03-01',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

const resolver = createRouteResolver(client, 'web', {
  environment: 'production',
})

const anthropic = createAnthropic({
  apiKey: process.env.CHATBOT_ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  const { messages } = await req.json()

  const mcpClient = await createMCPClient({
    transport: {
      type: 'sse',
      url: process.env.SANITY_CONTEXT_MCP_URL!,
      headers: {
        Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
      },
    },
  })

  const mcpTools = await mcpClient.tools()

  const resolveUrls = tool({
    description:
      'Resolve Sanity document IDs to their URLs. Call this whenever you need to link to a document in your response.',
    parameters: z.object({
      documentIds: z
        .array(z.string())
        .describe('Array of Sanity document IDs to resolve'),
    }),
    execute: async ({ documentIds }) => {
      const urls = await resolver.resolveUrlByIds(documentIds)
      return urls
    },
  })

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a helpful assistant for a URL Resolution demo site. You can search content using the Sanity Agent Context tools and resolve document URLs using the resolveUrls tool.

When answering questions about content:
1. Use the available query tools to find relevant documents
2. Use resolveUrls to get correct URLs for any documents you reference
3. Always include links in your responses using the resolved URLs
4. Never guess or construct URLs yourself — always use the resolveUrls tool

The content includes articles, blog posts, and documentation about URL resolution patterns.`,
    messages,
    tools: { ...mcpTools, resolveUrls },
    maxSteps: 5,
    onFinish: async () => {
      await mcpClient.close()
    },
  })

  return result.toDataStreamResponse()
}
