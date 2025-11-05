'use client';

import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? 'bg-orange-500' : 'bg-zinc-800'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-orange-500" />
        )}
      </div>

      {/* Mensaje */}
      <div
        className={`flex-1 rounded-lg p-2.5 text-sm ${
          isUser
            ? 'bg-orange-500 text-white'
            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
        }`}
      >
        <div
          className={`prose prose-sm max-w-none ${
            isUser ? 'prose-invert' : ''
          }`}
        >
          <ReactMarkdown
            components={{
              // Estilos personalizados para elementos markdown
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 last:mb-0 pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 last:mb-0 pl-4">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
              code: ({ children }) => (
                <code className={`rounded px-1 py-0.5 text-xs ${
                  isUser ? 'bg-orange-600' : 'bg-zinc-900 text-orange-400'
                }`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={`rounded p-2 overflow-x-auto text-xs ${
                  isUser ? 'bg-orange-600' : 'bg-zinc-900 text-zinc-300'
                }`}>
                  {children}
                </pre>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
