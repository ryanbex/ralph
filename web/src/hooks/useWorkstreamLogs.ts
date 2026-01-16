"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ConnectionStatus,
  LogLine,
  LogStream,
} from "@/lib/fly/logs"

export interface UseWorkstreamLogsOptions {
  maxLogs?: number
  autoConnect?: boolean
}

export interface UseWorkstreamLogsReturn {
  logs: LogLine[]
  status: ConnectionStatus
  connect: () => void
  disconnect: () => void
  clearLogs: () => void
}

const DEFAULT_MAX_LOGS = 1000

export function useWorkstreamLogs(
  projectSlug: string,
  workstreamSlug: string,
  options: UseWorkstreamLogsOptions = {}
): UseWorkstreamLogsReturn {
  const { maxLogs = DEFAULT_MAX_LOGS, autoConnect = true } = options

  const [logs, setLogs] = useState<LogLine[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const streamRef = useRef<LogStream | null>(null)

  const addLog = useCallback(
    (log: LogLine) => {
      setLogs((prev) => {
        const newLogs = [...prev, log]
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs)
        }
        return newLogs
      })
    },
    [maxLogs]
  )

  const connect = useCallback(() => {
    if (streamRef.current?.isConnected()) {
      return
    }

    // Disconnect existing stream
    streamRef.current?.disconnect()

    try {
      streamRef.current = new LogStream({
        projectSlug,
        workstreamSlug,
        onLog: addLog,
        onConnect: (data) => {
          console.log(
            `[Logs] Connected to workstream ${data.workstreamId}, machine ${data.machineId}`
          )
        },
        onError: (error) => {
          console.error("[Logs] Error:", error)
        },
        onEnd: () => {
          console.log("[Logs] Stream ended")
        },
        onStatusChange: setStatus,
      })

      streamRef.current.connect()
    } catch (error) {
      console.error("Failed to connect to log stream:", error)
      setStatus("error")
    }
  }, [projectSlug, workstreamSlug, addLog])

  const disconnect = useCallback(() => {
    streamRef.current?.disconnect()
    streamRef.current = null
    setStatus("disconnected")
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  useEffect(() => {
    if (autoConnect && projectSlug && workstreamSlug) {
      connect()
    }

    return () => {
      streamRef.current?.disconnect()
      streamRef.current = null
    }
  }, [projectSlug, workstreamSlug, autoConnect, connect])

  return {
    logs,
    status,
    connect,
    disconnect,
    clearLogs,
  }
}
