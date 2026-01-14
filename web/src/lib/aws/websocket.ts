/**
 * WebSocket client helper for real-time log streaming from AWS API Gateway
 */

export interface LogLine {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  workstreamId: string;
}

export interface WebSocketConfig {
  url: string;
  workstreamId: string;
  onMessage?: (log: LogLine) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY = 3000;

declare const process: { env: Record<string, string | undefined> };

export function getWebSocketUrl(): string {
  const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_WEBSOCKET_URL environment variable is not set"
    );
  }
  return url;
}

export function parseLogLevel(message: string): LogLine["level"] {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("[error]") || lowerMessage.includes("error:")) {
    return "error";
  }
  if (lowerMessage.includes("[warn]") || lowerMessage.includes("warning:")) {
    return "warn";
  }
  if (lowerMessage.includes("[debug]")) {
    return "debug";
  }
  return "info";
}

export function createLogLine(
  data: { message: string; timestamp?: string; workstreamId?: string },
  defaultWorkstreamId: string
): LogLine {
  return {
    timestamp: data.timestamp || new Date().toISOString(),
    level: parseLogLevel(data.message),
    message: data.message,
    workstreamId: data.workstreamId || defaultWorkstreamId,
  };
}

export class RalphWebSocket {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectCount = 0;
  private isIntentionallyClosed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      ...config,
      onMessage: config.onMessage || (() => {}),
      onOpen: config.onOpen || (() => {}),
      onClose: config.onClose || (() => {}),
      onError: config.onError || (() => {}),
      reconnectAttempts: config.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS,
      reconnectDelay: config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    const urlWithParams = `${this.config.url}?workstreamId=${encodeURIComponent(this.config.workstreamId)}`;

    try {
      this.ws = new WebSocket(urlWithParams);
      this.setupEventHandlers();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectCount = 0;
      this.config.onOpen();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const log = createLogLine(data, this.config.workstreamId);
        this.config.onMessage(log);
      } catch {
        const log = createLogLine(
          { message: event.data },
          this.config.workstreamId
        );
        this.config.onMessage(log);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.config.onClose(event);
      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error: Event) => {
      this.config.onError(error);
    };
  }

  private scheduleReconnect(): void {
    if (
      this.isIntentionallyClosed ||
      this.reconnectCount >= this.config.reconnectAttempts
    ) {
      return;
    }

    this.reconnectCount++;
    const delay = this.config.reconnectDelay * this.reconnectCount;

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
