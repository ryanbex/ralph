"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionStatus,
  getWebSocketUrl,
  LogLine,
  RalphWebSocket,
} from "@/lib/aws/websocket";

export interface UseWorkstreamLogsOptions {
  maxLogs?: number;
  autoConnect?: boolean;
}

export interface UseWorkstreamLogsReturn {
  logs: LogLine[];
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  clearLogs: () => void;
}

const DEFAULT_MAX_LOGS = 1000;

export function useWorkstreamLogs(
  workstreamId: string,
  options: UseWorkstreamLogsOptions = {}
): UseWorkstreamLogsReturn {
  const { maxLogs = DEFAULT_MAX_LOGS, autoConnect = true } = options;

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<RalphWebSocket | null>(null);

  const addLog = useCallback(
    (log: LogLine) => {
      setLogs((prev) => {
        const newLogs = [...prev, log];
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    },
    [maxLogs]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.isConnected()) {
      return;
    }

    setStatus("connecting");

    try {
      const url = getWebSocketUrl();

      wsRef.current = new RalphWebSocket({
        url,
        workstreamId,
        onMessage: addLog,
        onOpen: () => setStatus("connected"),
        onClose: () => setStatus("disconnected"),
        onError: () => setStatus("error"),
      });

      wsRef.current.connect();
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      setStatus("error");
    }
  }, [workstreamId, addLog]);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (autoConnect && workstreamId) {
      connect();
    }

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [workstreamId, autoConnect, connect]);

  return {
    logs,
    status,
    connect,
    disconnect,
    clearLogs,
  };
}
