import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Send, 
  Bot, 
  User,
  Sparkles,
  Loader2
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface AIChatPanelProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing?: boolean;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string | null;
  onClearHistory?: () => void;
}

export default function AIChatPanel({
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onMaximize,
  messages,
  onSendMessage,
  isProcessing = false,
  connectionStatus = 'disconnected',
  errorMessage = null,
  onClearHistory,
}: AIChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed right-0 top-0 h-full z-[9999]
        bg-white shadow-2xl
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-80' : 'w-[480px]'}
        border-l border-[#E2E8F0]
      `}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between border-b-2 border-[#162942]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" strokeWidth={2.5} />
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
            {!isMinimized && (
              <div className="flex items-center gap-2 text-xs">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-400'
                      : connectionStatus === 'connecting'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-white/80">
                  {connectionStatus === 'connected'
                    ? 'Connected'
                    : connectionStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isMinimized ? onMaximize : onMinimize}
            className="p-1.5 hover:bg-[#162942] rounded transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#162942] rounded transition-colors"
            aria-label="Close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {!isMinimized && errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 mx-4 mt-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto bg-[#F7F9FC] p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="bg-gradient-to-br from-[#3A6EA5] to-[#1F3A5F] rounded-full p-4 mb-4">
                <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                Welcome to AI Assistant
              </h3>
              <p className="text-sm text-[#64748B] max-w-sm">
                Ask me anything about your dental practice management system. 
                I can help with appointments, patients, reports, and more.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#3A6EA5] to-[#1F3A5F] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-[#3A6EA5] text-white'
                        : 'bg-white text-[#1E293B] border border-[#E2E8F0]'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" />
                        <span className="text-sm text-[#64748B]">Thinking...</span>
                      </div>
                    ) : (
                      // <p className="text-sm whitespace-pre-wrap break-words text-white">
                      <p
                        className={`text-sm whitespace-pre-wrap break-words ${
                          message.role === 'user' ? 'text-white' : 'text-[#1E293B]'
                        }`}
                      >
                        {message.content}
                      </p>

                    )}
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#64748B]" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div className="flex-1 overflow-y-auto bg-[#F7F9FC] p-3">
          <div className="text-xs text-[#64748B] text-center">
            {messages.length > 0 ? (
              <p className="truncate">
                {messages[messages.length - 1].role === 'user' ? 'You' : 'AI'}:{' '}
                {messages[messages.length - 1].content.substring(0, 50)}
                {messages[messages.length - 1].content.length > 50 ? '...' : ''}
              </p>
            ) : (
              <p>Click to expand and start chatting</p>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isMinimized && (
        <div className="border-t border-[#E2E8F0] bg-white p-6">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="
                flex-1 resize-none
                px-6 py-5
                border border-[#E2E8F0] rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent
                text-sm text-[#1E293B]
                placeholder:text-[#94A3B8]
                max-h-[200px]
              "
              rows={1}
              disabled={isProcessing}
            />
            {/* (Press Enter to send, Shift+Enter for new line) */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isProcessing}
              className="
                p-2.5 rounded-lg
                bg-[#3A6EA5] text-white
                hover:bg-[#2d5080]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                flex-shrink-0
              "
              aria-label="Send message"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[#64748B] text-center flex-1">
              AI can make mistakes. Verify important information.
            </p>
            {onClearHistory && messages.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-[#64748B] hover:text-[#3A6EA5] underline ml-2"
                title="Clear conversation history"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
