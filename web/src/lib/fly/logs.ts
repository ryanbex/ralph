/**
 * SSE log streaming helpers for Fly.io machines
 */

export interface LogLine {
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  workstreamId: string
}

export interface SSEMessage {
  type: "connected" | "log" | "error" | "end"
  timestamp: string
  message?: string
  level?: LogLine["level"]
  workstreamId?: string
  machineId?: string
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export interface LogStreamConfig {
  projectSlug: string
  workstreamSlug: string
  onLog?: (log: LogLine) => void
  onConnect?: (data: { workstreamId: string; machineId: string }) => void
  onError?: (error: string) => void
  onEnd?: () => void
  onStatusChange?: (status: ConnectionStatus) => void
}

export function getLogStreamUrl(projectSlug: string, workstreamSlug: string): string {
  return `/api/projects/${projectSlug}/workstreams/${workstreamSlug}/logs`
}

export function parseLogLevel(message: string): LogLine["level"] {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes("[error]") || lowerMessage.includes("error:")) {
    return "error"
  }
  if (lowerMessage.includes("[warn]") || lowerMessage.includes("warning:")) {
    return "warn"
  }
  if (lowerMessage.includes("[debug]")) {
    return "debug"
  }
  return "info"
}

export class LogStream {
  private eventSource: EventSource | null = null
  private config: LogStreamConfig
  private status: ConnectionStatus = "disconnected"

  constructor(config: LogStreamConfig) {
    this.config = config
  }

  connect(): void {
    if (this.eventSource) {
      return
    }

    this.setStatus("connecting")

    const url = getLogStreamUrl(
      this.config.projectSlug,
      this.config.workstreamSlug
    )

    try {
      this.eventSource = new EventSource(url)
      this.setupEventHandlers()
    } catch (error) {
      console.error("Failed to create EventSource:", error)
      this.setStatus("error")
    }
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return

    this.eventSource.onopen = () => {
      this.setStatus("connected")
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data)

        switch (data.type) {
          case "connected":
            this.config.onConnect?.({
              workstreamId: data.workstreamId || "",
              machineId: data.machineId || "",
            })
            break

          case "log":
            if (data.message) {
              this.config.onLog?.({
                timestamp: data.timestamp,
                level: data.level || "info",
                message: data.message,
                workstreamId: data.workstreamId || "",
              })
            }
            break

          case "error":
            this.config.onError?.(data.message || "Unknown error")
            this.setStatus("error")
            break

          case "end":
            this.config.onEnd?.()
            this.disconnect()
            break
        }
      } catch {
        // Handle raw text messages
        if (event.data) {
          this.config.onLog?.({
            timestamp: new Date().toISOString(),
            level: parseLogLevel(event.data),
            message: event.data,
            workstreamId: "",
          })
        }
      }
    }

    this.eventSource.onerror = () => {
      this.setStatus("error")
      this.config.onError?.("Connection error")
      this.disconnect()
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.config.onStatusChange?.(status)
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.setStatus("disconnected")
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  isConnected(): boolean {
    return this.status === "connected"
  }
}
