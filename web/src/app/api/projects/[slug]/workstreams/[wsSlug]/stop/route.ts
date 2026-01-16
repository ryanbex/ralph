import { auth } from "@/lib/auth"
import { db, projects, workstreams, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"
import { stopMachine, destroyMachine } from "@/lib/fly"

type RouteParams = { params: Promise<{ slug: string; wsSlug: string }> }

// POST /api/projects/[slug]/workstreams/[wsSlug]/stop - Stop a workstream
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug, wsSlug } = await params
    const body = await request.json().catch(() => ({}))
    const { force } = body

    // Find the project
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if user owns this project
    const user = await db.query.users.findFirst({
      where: eq(users.githubId, session.user.githubId),
    })

    if (!user || project.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find the workstream
    const workstream = await db.query.workstreams.findFirst({
      where: and(
        eq(workstreams.projectId, project.id),
        eq(workstreams.slug, wsSlug)
      ),
    })

    if (!workstream) {
      return NextResponse.json(
        { error: "Workstream not found" },
        { status: 404 }
      )
    }

    // Check if not running
    if (!["running", "provisioning", "needs_input", "stuck"].includes(workstream.status)) {
      return NextResponse.json(
        { error: "Workstream is not running" },
        { status: 400 }
      )
    }

    // Update status to stopping
    await db
      .update(workstreams)
      .set({ status: "stopping" })
      .where(eq(workstreams.id, workstream.id))

    try {
      // Stop or destroy the Fly machine
      if (workstream.flyMachineId) {
        if (force) {
          await destroyMachine(workstream.flyMachineId)
        } else {
          await stopMachine(workstream.flyMachineId)
        }
      }

      // Update workstream
      const [updated] = await db
        .update(workstreams)
        .set({
          status: "stopped",
          completedAt: new Date(),
          flyMachineId: null, // Clear the machine reference
        })
        .where(eq(workstreams.id, workstream.id))
        .returning()

      console.log(
        `[Workstreams] Stopped workstream ${wsSlug} by ${session.user.githubUsername}`
      )

      return NextResponse.json({ workstream: updated })
    } catch (machineError) {
      // If machine stop fails, try to force destroy
      console.error(
        `[Workstreams] Error stopping machine, attempting destroy:`,
        machineError
      )

      if (workstream.flyMachineId) {
        try {
          await destroyMachine(workstream.flyMachineId)
        } catch {
          // Ignore destroy errors - machine might already be gone
        }
      }

      // Update status anyway
      const [updated] = await db
        .update(workstreams)
        .set({
          status: "stopped",
          completedAt: new Date(),
          flyMachineId: null,
        })
        .where(eq(workstreams.id, workstream.id))
        .returning()

      return NextResponse.json({ workstream: updated })
    }
  } catch (error) {
    console.error("[Workstreams] Error stopping workstream:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop workstream",
      },
      { status: 500 }
    )
  }
}
