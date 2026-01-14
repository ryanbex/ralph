"use client";

import { forwardRef, useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ConnectionStatus, LogLine } from "@/lib/aws/websocket";

export interface LogViewerProps extends HTMLAttributes<HTMLDivElement> {
  logs: LogLine[];
  status: ConnectionStatus;
  autoScroll?: boolean;
  maxHeight?: string;
}

const statusColors: Record<ConnectionStatus, string> = {
  connected: "bg-simpson-green",
  connecting: "bg-simpson-yellow animate-pixel-blink",
  disconnected: "bg-simpson-brown",
  error: "bg-simpson-red animate-pixel-shake",
};

const statusLabels: Record<ConnectionStatus, string> = {
  connected: "CONNECTED",
  connecting: "CONNECTING...",
  disconnected: "DISCONNECTED",
  error: "ERROR",
};

const levelColors: Record<LogLine["level"], string> = {
  info: "text-simpson-green",
  warn: "text-simpson-yellow",
  error: "text-simpson-red",
  debug: "text-simpson-blue",
};

const levelLabels: Record<LogLine["level"], string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR!",
  debug: "DBUG",
};

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

export const LogViewer = forwardRef<HTMLDivElement, LogViewerProps>(
  (
    { className, logs, status, autoScroll = true, maxHeight = "400px", ...props },
    ref
  ) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (autoScroll && logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [logs, autoScroll]);

    return (
      <div
        ref={ref}
        className={cn(
          "border-pixel border-simpson-brown rounded-pixel overflow-hidden",
          "bg-simpson-dark shadow-pixel",
          className
        )}
        {...props}
      >
        {/* Terminal header */}
        <div className="flex items-center justify-between px-3 py-2 bg-simpson-brown/30 border-b-pixel border-simpson-brown">
          <div className="flex items-center gap-2">
            {/* Fake terminal buttons */}
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-simpson-red border border-simpson-brown" />
              <div className="w-3 h-3 rounded-full bg-simpson-yellow border border-simpson-brown" />
              <div className="w-3 h-3 rounded-full bg-simpson-green border border-simpson-brown" />
            </div>
            <span className="font-pixel text-[8px] text-simpson-white ml-2">
              RALPH LOGS
            </span>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn("w-2 h-2 rounded-full", statusColors[status])}
              aria-hidden="true"
            />
            <span className="font-pixel text-[8px] text-simpson-white">
              {statusLabels[status]}
            </span>
          </div>
        </div>

        {/* Log content area */}
        <div
          className="overflow-y-auto p-3 font-pixel-body"
          style={{ maxHeight }}
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-pixel text-[10px] text-simpson-brown">
                {status === "connected"
                  ? "Waiting for logs..."
                  : "Connect to view logs"}
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log, index) => (
                <LogEntry key={`${log.timestamp}-${index}`} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-simpson-brown/20 border-t-pixel border-simpson-brown">
          <span className="font-pixel text-[8px] text-simpson-brown">
            {logs.length} LINES
          </span>
          <span className="font-pixel text-[8px] text-simpson-brown">
            {status === "connected" && "● LIVE"}
          </span>
        </div>
      </div>
    );
  }
);

LogViewer.displayName = "LogViewer";

interface LogEntryProps {
  log: LogLine;
}

function LogEntry({ log }: LogEntryProps) {
  return (
    <div className="flex gap-2 text-sm leading-tight hover:bg-simpson-brown/10 px-1 rounded-sm">
      {/* Timestamp */}
      <span className="text-simpson-brown shrink-0 font-mono text-xs">
        {formatTimestamp(log.timestamp)}
      </span>

      {/* Level badge */}
      <span
        className={cn(
          "font-pixel text-[8px] shrink-0 w-10",
          levelColors[log.level]
        )}
      >
        [{levelLabels[log.level]}]
      </span>

      {/* Message */}
      <span className="text-simpson-white break-all whitespace-pre-wrap">
        {log.message}
      </span>
    </div>
  );
}
