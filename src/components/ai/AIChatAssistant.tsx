import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { sendAIChatMessage, type AIChatMessage } from '../../axios/api/aiChat';

interface AIChatAssistantProps {
  className?: string;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you answer questions about drivers, trips, orders, and more. Try asking: "Is driver [ID] assigned to any trip?" or "How many active trips are there?"',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send to API
      const response = await sendAIChatMessage({
        message: userMessage.content,
        conversationHistory: conversationHistory.slice(0, -1), // Exclude current message
      });

      if (response.success && response.data) {
        const assistantMessage: AIChatMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: AIChatMessage = {
          role: 'assistant',
          content: response.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: AIChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`fixed bottom-6 right-4 sm:right-6 z-50 ${className}`}>
      {/* Chat Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="mb-4 mr-4 p-4 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            color: '#ffffff',
            boxShadow: '0 0 24px rgba(59, 130, 246, 0.7), 0 0 48px rgba(29, 78, 216, 0.35)',
          }}
          title="Open AI Assistant"
        >
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(59, 130, 246, 0.4)' }}
          />
          <Bot className="w-6 h-6 relative z-10" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`flex flex-col transition-all duration-300 animate-chat-popup ${
            isMinimized
              ? 'w-[calc(100vw-2rem)] sm:w-80 h-14'
              : 'w-[calc(100vw-2rem)] sm:w-96 h-[75vh] sm:h-[600px] max-h-[600px]'
          }`}
          style={{
            marginBottom: '0',
            marginRight: '0',
            background: 'var(--bg-card)',
            borderRadius: '14px 14px 0 0',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 0 32px rgba(59, 130, 246, 0.2), 0 20px 60px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1D4ED8 60%, #2563EB 100%)',
              borderRadius: '14px 14px 0 0',
              boxShadow: '0 4px 20px rgba(29, 78, 216, 0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)',
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white" style={{ letterSpacing: '0.02em' }}>
                  AI Assistant
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#4ade80',
                      boxShadow: '0 0 6px #4ade80',
                    }}
                  />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Online · Ask me anything
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
                }}
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg transition-all duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.25)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
                }}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                style={{ background: 'var(--bg-main)' }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                        style={{
                          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                          boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
                        }}
                      >
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className="max-w-[80%] px-4 py-2.5"
                      style={
                        message.role === 'user'
                          ? {
                              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                              color: '#ffffff',
                              borderRadius: '18px 4px 18px 18px',
                              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
                            }
                          : {
                              background: 'var(--bg-card)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              color: 'var(--text-primary)',
                              borderRadius: '4px 18px 18px 18px',
                            }
                      }
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {message.timestamp && (
                        <p
                          className="text-xs mt-1"
                          style={{
                            color: message.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)',
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                        boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div
                      className="px-4 py-2.5"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '4px 18px 18px 18px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#3B82F6' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div
                className="flex-shrink-0 p-4"
                style={{
                  background: 'var(--bg-card)',
                  borderTop: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-2.5 rounded-xl resize-none text-sm transition-all duration-200"
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      maxHeight: '120px',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.25)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: '#ffffff',
                      boxShadow: inputMessage.trim() ? '0 0 14px rgba(59, 130, 246, 0.55)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (inputMessage.trim()) {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          '0 0 22px rgba(59, 130, 246, 0.8)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = inputMessage.trim()
                        ? '0 0 14px rgba(59, 130, 246, 0.55)'
                        : 'none';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="hidden sm:block text-xs mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                  Press{' '}
                  <kbd
                    className="px-1 py-0.5 rounded text-xs"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60A5FA',
                    }}
                  >
                    Enter
                  </kbd>{' '}
                  to send ·{' '}
                  <kbd
                    className="px-1 py-0.5 rounded text-xs"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60A5FA',
                    }}
                  >
                    Shift+Enter
                  </kbd>{' '}
                  for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIChatAssistant;

