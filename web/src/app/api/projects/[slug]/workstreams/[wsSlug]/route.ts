import { auth } from "@/lib/auth"
import { db, projects, workstreams, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

type RouteParams = { params: Promise<{ slug: string; wsSlug: string }> }

// GET /api/projects/[slug]/workstreams/[wsSlug] - Get a single workstream
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug, wsSlug } = await params

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

    return NextResponse.json({ workstream })
  } catch (error) {
    console.error("[Workstreams] Error fetching workstream:", error)
    return NextResponse.json(
      { error: "Failed to fetch workstream" },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[slug]/workstreams/[wsSlug] - Update a workstream
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug, wsSlug } = await params
    const body = await request.json()
    const { name, maxIterations } = body

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

    // Build update object
    const updates: Partial<{
      name: string
      maxIterations: number
    }> = {}

    if (name && typeof name === "string") {
      updates.name = name
    }

    if (maxIterations && typeof maxIterations === "number") {
      updates.maxIterations = Math.min(Math.max(maxIterations, 1), 100)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Update the workstream
    const [updated] = await db
      .update(workstreams)
      .set(updates)
      .where(eq(workstreams.id, workstream.id))
      .returning()

    console.log(
      `[Workstreams] Updated workstream ${wsSlug} by ${session.user.githubUsername}`
    )

    return NextResponse.json({ workstream: updated })
  } catch (error) {
    console.error("[Workstreams] Error updating workstream:", error)
    return NextResponse.json(
      { error: "Failed to update workstream" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[slug]/workstreams/[wsSlug] - Delete a workstream
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug, wsSlug } = await params

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

    // Don't allow deletion of running workstreams
    if (["running", "provisioning", "stopping"].includes(workstream.status)) {
      return NextResponse.json(
        { error: "Cannot delete a running workstream. Stop it first." },
        { status: 400 }
      )
    }

    // Delete the workstream
    await db.delete(workstreams).where(eq(workstreams.id, workstream.id))

    console.log(
      `[Workstreams] Deleted workstream ${wsSlug} by ${session.user.githubUsername}`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Workstreams] Error deleting workstream:", error)
    return NextResponse.json(
      { error: "Failed to delete workstream" },
      { status: 500 }
    )
  }
}
