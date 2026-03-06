'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! 👋 Soy **KAME AI**, tu asistente de marketing. Puedo ayudarte con:\n\n🎯 Estrategia de marketing\n💡 Ideas de contenido\n✍️ Copywriting y captions\n📱 Tips por red social\n🚀 Usar la plataforma KAME\n\n¿En qué puedo ayudarte hoy?',
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  '¿Cómo empiezo?',
  '¿Qué es Brand Kit?',
  'Ideas de contenido',
  '¿Cómo funcionan los créditos?',
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No pude responder. Intenta de nuevo.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Error de conexión. Verifica tu internet e intenta de nuevo. 🔄',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
          boxShadow: '0 4px 30px rgba(139, 92, 246, 0.5)',
        }}
        aria-label="KAME AI Assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border/50"
          style={{
            background: 'hsl(222, 47%, 8%)',
            boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3 shrink-0"
            style={{
              background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
            }}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">KAME AI Assistant</h3>
              <p className="text-white/70 text-xs">Tu experto en marketing · Online</p>
            </div>
            <button
              onClick={() => {
                setMessages([WELCOME_MESSAGE]);
              }}
              className="text-white/60 hover:text-white transition text-xs px-2 py-1 rounded hover:bg-white/10"
              title="Nueva conversación"
            >
              🔄
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: '380px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white/5 text-gray-200 rounded-bl-md border border-white/5'
                  }`}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (only when few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/5 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta lo que quieras..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background:
                    input.trim() && !isLoading
                      ? 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)'
                      : 'rgba(255,255,255,0.05)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
