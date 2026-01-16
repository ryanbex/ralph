"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PixelButton } from "@/components/pixel/PixelButton"
import { LogViewer } from "@/components/LogViewer"
import { useWorkstreamLogs } from "@/hooks/useWorkstreamLogs"
import type { WorkstreamStatus } from "@/components/pixel/WorkstreamCard"

interface WorkstreamControlsProps {
  projectSlug: string
  workstreamSlug: string
  status: WorkstreamStatus
  hasPrompt: boolean
}

export function WorkstreamControls({
  projectSlug,
  workstreamSlug,
  status,
  hasPrompt,
}: WorkstreamControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canStart = ["pending", "stopped", "error"].includes(status) && hasPrompt
  const canStop = ["running", "provisioning", "needs_input", "stuck"].includes(status)
  const showLogs = ["running", "provisioning", "needs_input", "stuck"].includes(status)

  const {
    logs,
    status: connectionStatus,
    connect,
    disconnect,
    clearLogs,
  } = useWorkstreamLogs(projectSlug, workstreamSlug, {
    autoConnect: showLogs,
  })

  const handleStart = async () => {
    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectSlug}/workstreams/${workstreamSlug}/start`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to start workstream")
        }

        router.refresh()
        connect()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start workstream")
      }
    })
  }

  const handleStop = async (force = false) => {
    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectSlug}/workstreams/${workstreamSlug}/stop`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ force }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to stop workstream")
        }

        router.refresh()
        disconnect()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to stop workstream")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {canStart && (
          <PixelButton
            variant="success"
            size="sm"
            onClick={handleStart}
            disabled={isPending}
          >
            {isPending ? "STARTING..." : "START"}
          </PixelButton>
        )}
        {canStop && (
          <>
            <PixelButton
              variant="secondary"
              size="sm"
              onClick={() => handleStop(false)}
              disabled={isPending}
            >
              {isPending ? "STOPPING..." : "STOP"}
            </PixelButton>
            <PixelButton
              variant="danger"
              size="sm"
              onClick={() => handleStop(true)}
              disabled={isPending}
            >
              FORCE STOP
            </PixelButton>
          </>
        )}
        {showLogs && connectionStatus === "disconnected" && (
          <PixelButton variant="secondary" size="sm" onClick={connect}>
            RECONNECT LOGS
          </PixelButton>
        )}
        {logs.length > 0 && (
          <PixelButton variant="secondary" size="sm" onClick={clearLogs}>
            CLEAR LOGS
          </PixelButton>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="font-pixel text-[10px] text-simpson-red bg-simpson-red/10 border-pixel border-simpson-red px-3 py-2 rounded-pixel">
          {error}
        </div>
      )}

      {/* Missing Prompt Warning */}
      {!hasPrompt && status === "pending" && (
        <div className="font-pixel text-[10px] text-simpson-yellow bg-simpson-yellow/10 border-pixel border-simpson-yellow px-3 py-2 rounded-pixel">
          Add a PROMPT.md to this workstream before starting.
        </div>
      )}

      {/* Log Viewer */}
      {showLogs && (
        <LogViewer
          logs={logs}
          status={connectionStatus}
          maxHeight="500px"
          autoScroll={true}
        />
      )}
    </div>
  )
}
