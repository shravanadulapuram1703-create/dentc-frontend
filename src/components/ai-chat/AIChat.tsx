import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAIChat } from '../../contexts/AIChatContext';
import { getAIChatWebSocket } from '../../services/aiChatWebSocket';
import AIChatButton from './AIChatButton';
import AIChatPanel, { ChatMessage } from './AIChatPanel';

interface AIChatProps {
  // Future: context-aware props
  // currentScreen?: string;
  // selectedData?: any;
  // userContext?: any;
}

export default function AIChat({}: AIChatProps) {
  const { isAuthenticated } = useAuth();
  const { isOpen, isMinimized, setIsOpen, setIsMinimized } = useAIChat();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const wsRef = useRef<ReturnType<typeof getAIChatWebSocket> | null>(null);
  const streamingMessageRef = useRef<string | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found for AI Chat WebSocket');
      setConnectionStatus('error');
      setErrorMessage('Authentication required');
      return;
    }

    const ws = getAIChatWebSocket();
    wsRef.current = ws;

    // Set up message handler
    const unsubscribeMessage = ws.onMessage((serverMessage) => {
      handleServerMessage(serverMessage);
    });

    // Set up connection status handler
    const unsubscribeConnection = ws.onConnectionChange((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      if (connected) {
        setErrorMessage(null);
      }
    });

    // Set up error handler
    const unsubscribeError = ws.onError((error) => {
      console.error('AI Chat WebSocket error:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
    });

    // Connect WebSocket
    setConnectionStatus('connecting');
    ws.connect(token).catch((error) => {
      console.error('Failed to connect AI Chat WebSocket:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to connect to AI service');
    });

    // Cleanup on unmount
    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      unsubscribeError();
      // Don't disconnect here - keep connection alive for app lifetime
    };
  }, [isAuthenticated]);

  // Handle server messages according to API contract
  const handleServerMessage = useCallback((serverMessage: any) => {
    switch (serverMessage.type) {
      case 'connection_ack':
        console.log('AI Chat connected, session:', serverMessage.session_id);
        setConnectionStatus('connected');
        setErrorMessage(null);
        // Optionally load chat history from server
        break;

      case 'connection_error':
        setConnectionStatus('error');
        setErrorMessage(serverMessage.error?.message || 'Connection error');
        break;

      case 'typing':
        // Show typing indicator (handled by isProcessing state)
        break;

      case 'assistant_message':
        handleAssistantMessage(serverMessage);
        break;

      case 'error':
        handleErrorMessage(serverMessage);
        break;

      case 'history_cleared':
        setMessages([]);
        localStorage.removeItem('ai_chat_history');
        break;

      case 'pong':
        // Keep-alive response, no action needed
        break;

      default:
        console.log('Unhandled message type:', serverMessage.type);
    }
  }, []);

  const handleAssistantMessage = useCallback((serverMessage: any) => {
    const { message_id, content, is_streaming, is_complete } = serverMessage;

    if (is_streaming) {
      // Streaming response - update existing message
      if (message_id === currentMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === message_id || msg.id === `assistant-${message_id}`) {
              return {
                ...msg,
                content: content || '',
                isLoading: false,
              };
            }
            return msg;
          })
        );
      } else {
        // New streaming message
        currentMessageIdRef.current = message_id;
        setMessages((prev) => {
          // Remove any existing loading message for this ID
          const filtered = prev.filter(
            (msg) => !(msg.id === `assistant-${message_id}` && msg.isLoading)
          );
          return [
            ...filtered,
            {
              id: `assistant-${message_id}`,
              role: 'assistant' as const,
              content: content || '',
              timestamp: new Date(serverMessage.timestamp || Date.now()),
              isLoading: false,
            },
          ];
        });
      }

      if (is_complete) {
        // Streaming complete
        currentMessageIdRef.current = null;
        setIsProcessing(false);
      }
    } else {
      // Non-streaming or final message
      setMessages((prev) => {
        // Remove loading message if exists
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: `assistant-${message_id || Date.now()}`,
            role: 'assistant' as const,
            content: content || '',
            timestamp: new Date(serverMessage.timestamp || Date.now()),
            isLoading: false,
          },
        ];
      });
      setIsProcessing(false);
    }
  }, []);

  const handleErrorMessage = useCallback((serverMessage: any) => {
    const errorCode = serverMessage.error?.code;
    const errorMsg = serverMessage.error?.message || 'An error occurred';

    if (errorCode === 'TOKEN_EXPIRED') {
      setErrorMessage('Session expired. Please refresh the page.');
      setConnectionStatus('error');
    } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
      setErrorMessage('Rate limit exceeded. Please wait a moment.');
    } else {
      // Update the assistant message with error
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.isLoading) {
            return {
              ...msg,
              content: `Sorry, I encountered an error: ${errorMsg}`,
              isLoading: false,
            };
          }
          return msg;
        })
      );
    }
    setIsProcessing(false);
  }, []);

  // Load conversation history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai_chat_history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(
          parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        );
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save conversation history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const handleToggleChat = useCallback(() => {
    if (isOpen) {
      setIsMinimized(!isMinimized);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized, setIsOpen, setIsMinimized]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, [setIsOpen, setIsMinimized]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, [setIsMinimized]);

  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
  }, [setIsMinimized]);

  const handleSendMessage = useCallback((content: string) => {
    if (!wsRef.current || !wsRef.current.getConnectionStatus()) {
      setErrorMessage('Not connected to AI service. Please wait...');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);

    // Add loading assistant message
    const loadingMessageId = `assistant-loading-${Date.now()}`;
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    setIsProcessing(true);
    setErrorMessage(null);

    // Get current context (screen/route)
    const currentScreen = location.pathname;
    const context = {
      screen: currentScreen,
      // Future: Add selected_data and user_action
    };

    // Send message via WebSocket
    const messageId = wsRef.current.sendMessage(content, context);
    currentMessageIdRef.current = messageId;
  }, [location.pathname]);

  const handleClearHistory = useCallback(() => {
    if (wsRef.current && wsRef.current.getConnectionStatus()) {
      wsRef.current.clearHistory();
    } else {
      // Clear locally if not connected
      setMessages([]);
      localStorage.removeItem('ai_chat_history');
    }
  }, []);

  // Calculate unread count (messages received while chat is closed)
  const unreadCount = isOpen ? 0 : 0; // TODO: Implement unread tracking

  // Only show chat when authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* <AIChatButton
        onClick={handleToggleChat}
        isOpen={isOpen}
        unreadCount={unreadCount}
      /> */}
      <AIChatPanel
        isOpen={isOpen}
        isMinimized={isMinimized}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        messages={messages}
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        onClearHistory={handleClearHistory}
      />
    </>
  );
}
