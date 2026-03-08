'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import { Streamdown } from 'streamdown'

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const [input, setInput] = useState('')
  const isStreaming = status === 'streaming'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <header className="p-4 border-b">
        <nav className="flex items-center gap-4">
          <a href="/" className="text-blue-600 hover:underline">
            ← Home
          </a>
          <h1 className="text-lg font-semibold">Chat with Content</h1>
        </nav>
        <p className="text-sm text-gray-500 mt-1">
          Ask about articles and blog posts. The AI resolves correct URLs using
          @sanity/routes.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Try asking:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>&ldquo;What content types are available?&rdquo;</li>
              <li>&ldquo;Show me all blog posts&rdquo;</li>
              <li>
                &ldquo;Link me to the articles about URL resolution&rdquo;
              </li>
            </ul>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message)
          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' ? (
                  <Streamdown
                    isAnimating={
                      isStreaming &&
                      message.id === messages[messages.length - 1]?.id
                    }
                    animated
                  >
                    {text}
                  </Streamdown>
                ) : (
                  <p>{text}</p>
                )}
              </div>
            </div>
          )
        })}

        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about content..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
