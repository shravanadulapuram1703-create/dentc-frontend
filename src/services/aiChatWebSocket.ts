import { ChatMessage } from '../components/ai-chat/AIChatPanel';

// Message types according to API contract
interface BaseMessage {
  type: string;
  message_id?: string;
  timestamp: string;
  session_id?: string;
}

interface ClientMessage extends BaseMessage {
  type: 'user_message' | 'ping' | 'clear_history' | 'get_context';
  content?: string;
  context?: {
    screen?: string;
    selected_data?: any;
    user_action?: string;
  };
}

interface ServerMessage extends BaseMessage {
  type: 'assistant_message' | 'pong' | 'error' | 'typing' | 'context_update' | 'connection_ack' | 'connection_error' | 'connection_closing' | 'history_cleared';
  content?: string;
  is_streaming?: boolean;
  is_complete?: boolean;
  status?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  metadata?: {
    tokens_used?: number;
    model?: string;
    response_time_ms?: number;
  };
  server_info?: {
    version?: string;
    features?: string[];
  };
}

type MessageHandler = (message: ServerMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

class AIChatWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isConnecting = false;
  private isConnected = false;
  private messageQueue: ClientMessage[] = [];

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    // Convert HTTP URL to WebSocket URL
    const wsProtocol = baseURL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseURL.replace(/^https?:\/\//, '');
    this.url = `${wsProtocol}://${wsHost}/api/v1/ai-chat/ws`;
  }

  connect(token: string): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return Promise.resolve();
    }

    this.token = token;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Connect with token in query string
        const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('AI Chat WebSocket connected');
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.notifyConnectionHandlers(true);
          this.startPingInterval();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.notifyErrorHandlers(new Error('Failed to parse server message'));
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.notifyErrorHandlers(new Error('WebSocket connection error'));
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.isConnected = false;
          this.sessionId = null;
          this.stopPingInterval();
          this.notifyConnectionHandlers(false);

          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'connection_ack':
        this.sessionId = message.session_id || null;
        console.log('Connection acknowledged, session:', this.sessionId);
        break;
      case 'connection_error':
        console.error('Connection error:', message.error);
        this.disconnect();
        break;
      case 'connection_closing':
        console.log('Server closing connection:', message);
        this.disconnect();
        break;
      case 'error':
        if (message.error?.code === 'TOKEN_EXPIRED') {
          console.error('Token expired, reconnection needed');
          // Token refresh should be handled by the component
        }
        break;
    }

    // Notify all message handlers
    this.messageHandlers.forEach(handler => handler(message));
  }

  sendMessage(content: string, context?: { screen?: string; selected_data?: any; user_action?: string }): string {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: ClientMessage = {
      type: 'user_message',
      message_id: messageId,
      content,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId || undefined,
      context,
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued');
    }

    return messageId;
  }

  clearHistory(): void {
    const message: ClientMessage = {
      type: 'clear_history',
      timestamp: new Date().toISOString(),
      session_id: this.sessionId || undefined,
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  getContext(): void {
    const message: ClientMessage = {
      type: 'get_context',
      timestamp: new Date().toISOString(),
      session_id: this.sessionId || undefined,
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage: ClientMessage = {
          type: 'ping',
          timestamp: new Date().toISOString(),
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 30000); // Every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 16000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.token).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.notifyConnectionHandlers(false);
  }

  // Event handler registration
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let wsInstance: AIChatWebSocket | null = null;

export function getAIChatWebSocket(): AIChatWebSocket {
  if (!wsInstance) {
    // Get base URL from api.ts configuration
    const apiBaseURL = 'http://127.0.0.1:8000'; // Match api.ts default
    wsInstance = new AIChatWebSocket(apiBaseURL);
  }
  return wsInstance;
}

export default AIChatWebSocket;
