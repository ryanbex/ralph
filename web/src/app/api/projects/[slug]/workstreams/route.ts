import { auth } from "@/lib/auth"
import { db, projects, workstreams, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

// GET /api/projects/[slug]/workstreams - List all workstreams for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug } = await params

    // Find the project
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
      with: {
        workstreams: true,
      },
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

    return NextResponse.json({ workstreams: project.workstreams })
  } catch (error) {
    console.error("[Workstreams] Error fetching workstreams:", error)
    return NextResponse.json(
      { error: "Failed to fetch workstreams" },
      { status: 500 }
    )
  }
}

// POST /api/projects/[slug]/workstreams - Create a new workstream
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug } = await params
    const body = await request.json()
    const { name, maxIterations = 20, prompt } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Generate slug from name
    const wsSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (!wsSlug) {
      return NextResponse.json(
        { error: "Invalid name format" },
        { status: 400 }
      )
    }

    // Find the project
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Find/create user
    const user = await db.query.users.findFirst({
      where: eq(users.githubId, session.user.githubId),
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user owns this project
    if (project.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if workstream with this slug already exists
    const existing = await db.query.workstreams.findFirst({
      where: and(
        eq(workstreams.projectId, project.id),
        eq(workstreams.slug, wsSlug)
      ),
    })

    if (existing) {
      return NextResponse.json(
        { error: "A workstream with this name already exists" },
        { status: 409 }
      )
    }

    // Create the workstream
    const [newWorkstream] = await db
      .insert(workstreams)
      .values({
        projectId: project.id,
        userId: user.id,
        name,
        slug: wsSlug,
        maxIterations: Math.min(Math.max(maxIterations, 1), 100),
        status: "pending",
      })
      .returning()

    console.log(
      `[Workstreams] Created workstream ${wsSlug} for project ${slug} by ${session.user.githubUsername}`
    )

    return NextResponse.json({ workstream: newWorkstream }, { status: 201 })
  } catch (error) {
    console.error("[Workstreams] Error creating workstream:", error)
    return NextResponse.json(
      { error: "Failed to create workstream" },
      { status: 500 }
    )
  }
}
