/**
 * HyperClaw WebSocket Client
 * Handles terminal WebSocket connections
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalWebSocketOptions {
  onMessage: (data: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Event) => void;
}

export class TerminalWebSocket {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private options: TerminalWebSocketOptions;
  private instanceId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(instanceId: string, options: TerminalWebSocketOptions) {
    this.instanceId = instanceId;
    this.options = options;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/instances/${this.instanceId}/terminal`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.options.onMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.setStatus('error');
        this.options.onError?.(error);
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      this.setStatus('error');
      console.error('WebSocket connection failed:', error);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}