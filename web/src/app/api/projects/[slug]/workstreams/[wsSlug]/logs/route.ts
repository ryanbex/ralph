import { auth } from "@/lib/auth"
import { db, projects, workstreams, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"

type RouteParams = { params: Promise<{ slug: string; wsSlug: string }> }

// GET /api/projects/[slug]/workstreams/[wsSlug]/logs - Stream logs via SSE
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { slug, wsSlug } = await params

    // Find the project
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    })

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if user owns this project
    const user = await db.query.users.findFirst({
      where: eq(users.githubId, session.user.githubId),
    })

    if (!user || project.ownerId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Find the workstream
    const workstream = await db.query.workstreams.findFirst({
      where: and(
        eq(workstreams.projectId, project.id),
        eq(workstreams.slug, wsSlug)
      ),
    })

    if (!workstream) {
      return new Response(JSON.stringify({ error: "Workstream not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if workstream has an active machine
    if (!workstream.flyMachineId) {
      return new Response(
        JSON.stringify({ error: "No active machine for this workstream" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const flyAppName = workstream.flyAppName || process.env.FLY_APP_NAME
    const flyToken = process.env.FLY_API_TOKEN

    if (!flyAppName || !flyToken) {
      return new Response(
        JSON.stringify({ error: "Fly.io configuration missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const connectMsg = JSON.stringify({
          type: "connected",
          workstreamId: workstream.id,
          machineId: workstream.flyMachineId,
          timestamp: new Date().toISOString(),
        })
        controller.enqueue(encoder.encode(`data: ${connectMsg}\n\n`))

        try {
          // Fetch logs from Fly.io NATS streaming endpoint
          // Note: Fly.io uses NATS for log streaming, but we can also poll the logs endpoint
          const logsUrl = `https://api.machines.dev/v1/apps/${flyAppName}/machines/${workstream.flyMachineId}/logs?nats=true`

          const response = await fetch(logsUrl, {
            headers: {
              Authorization: `Bearer ${flyToken}`,
              Accept: "text/event-stream",
            },
          })

          if (!response.ok) {
            const errorMsg = JSON.stringify({
              type: "error",
              message: `Failed to connect to Fly.io logs: ${response.status}`,
              timestamp: new Date().toISOString(),
            })
            controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`))
            controller.close()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            const errorMsg = JSON.stringify({
              type: "error",
              message: "No response body from Fly.io logs",
              timestamp: new Date().toISOString(),
            })
            controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`))
            controller.close()
            return
          }

          // Stream logs from Fly.io to client
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              const endMsg = JSON.stringify({
                type: "end",
                message: "Log stream ended",
                timestamp: new Date().toISOString(),
              })
              controller.enqueue(encoder.encode(`data: ${endMsg}\n\n`))
              break
            }

            // Parse Fly.io log lines and forward to client
            const text = decoder.decode(value, { stream: true })
            const lines = text.split("\n").filter((line) => line.trim())

            for (const line of lines) {
              try {
                // Try to parse as JSON (Fly.io returns JSON logs)
                const logData = JSON.parse(line)
                const logLine = JSON.stringify({
                  type: "log",
                  timestamp: logData.timestamp || new Date().toISOString(),
                  level: parseLogLevel(logData.message || line),
                  message: logData.message || line,
                  workstreamId: workstream.id,
                })
                controller.enqueue(encoder.encode(`data: ${logLine}\n\n`))
              } catch {
                // Forward raw line if not JSON
                if (line.trim()) {
                  const logLine = JSON.stringify({
                    type: "log",
                    timestamp: new Date().toISOString(),
                    level: parseLogLevel(line),
                    message: line,
                    workstreamId: workstream.id,
                  })
                  controller.enqueue(encoder.encode(`data: ${logLine}\n\n`))
                }
              }
            }
          }
        } catch (error) {
          const errorMsg = JSON.stringify({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to stream logs",
            timestamp: new Date().toISOString(),
          })
          controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[Workstreams] Error streaming logs:", error)
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to stream logs",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

function parseLogLevel(message: string): "info" | "warn" | "error" | "debug" {
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
