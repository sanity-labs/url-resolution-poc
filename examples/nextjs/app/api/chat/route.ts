import {
  streamText,
  convertToModelMessages,
  UIMessage,
  tool,
  stepCountIs,
} from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createMCPClient } from '@ai-sdk/mcp'
import { z } from 'zod'
import { createClient } from '@sanity/client'
import { createRouteResolver } from '@sanity/routes'
import { projectId, dataset, apiVersion } from '@/lib/sanity'

export const maxDuration = 120

const authenticatedClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

const resolver = createRouteResolver(authenticatedClient, 'web', {
  environment: 'production',
})

const anthropic = createAnthropic({
  apiKey: process.env.CHATBOT_ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: process.env.SANITY_CONTEXT_MCP_URL!,
        headers: {
          Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
        },
      },
    })

    const mcpTools = await mcpClient.tools()

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are a helpful assistant for a URL Resolution demo site. You can search content using the Sanity Agent Context tools and resolve document paths using the resolveUrls tool.

When answering questions about content:
1. Use the available query tools to find relevant documents
2. Use resolveUrls to get correct paths for any documents you reference
3. Always include links in your responses using the resolved paths (e.g. [Title](/blog/my-post))
4. Never guess or construct URLs yourself — always use the resolveUrls tool
5. The paths are relative to this site — use them directly as markdown links

The content includes articles, blog posts, and documentation about URL resolution patterns.`,
      messages: await convertToModelMessages(messages),
      tools: {
        ...mcpTools,
        resolveUrls: tool({
          description:
            'Resolve Sanity document IDs to their paths on this site. Call this whenever you need to link to a document in your response. Returns paths like /blog/my-post — use these directly as links.',
          inputSchema: z.object({
            documentIds: z
              .array(z.string())
              .describe('Array of Sanity document IDs to resolve'),
          }),
          execute: async ({ documentIds }) => {
            return await resolver.resolvePathByIds(documentIds)
          },
        }),
      },
      stopWhen: stepCountIs(5),
      onFinish: async () => {
        await mcpClient.close()
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
