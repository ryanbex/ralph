import { auth } from "@/lib/auth"
import { db, projects, workstreams, users, userApiKeys, projectRepos } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"
import { startMachine } from "@/lib/fly"

type RouteParams = { params: Promise<{ slug: string; wsSlug: string }> }

// POST /api/projects/[slug]/workstreams/[wsSlug]/start - Start a workstream
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { slug, wsSlug } = await params

    // Find the project with repos
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
      with: {
        repos: true,
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

    // Check if already running
    if (["running", "provisioning"].includes(workstream.status)) {
      return NextResponse.json(
        { error: "Workstream is already running" },
        { status: 400 }
      )
    }

    // Get user's Anthropic API key
    const apiKey = await db.query.userApiKeys.findFirst({
      where: eq(userApiKeys.userId, user.id),
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: "Please set your Anthropic API key in settings first" },
        { status: 400 }
      )
    }

    // Check if workstream has a prompt
    if (!workstream.promptBlobUrl) {
      return NextResponse.json(
        { error: "Workstream has no prompt. Please add a prompt first." },
        { status: 400 }
      )
    }

    // Get the first repo (single-repo for now)
    const repo = project.repos[0]
    if (!repo) {
      return NextResponse.json(
        { error: "Project has no repository configured" },
        { status: 400 }
      )
    }

    // Update status to provisioning
    await db
      .update(workstreams)
      .set({
        status: "provisioning",
        startedAt: new Date(),
      })
      .where(eq(workstreams.id, workstream.id))

    try {
      // Start the Fly machine
      const machine = await startMachine({
        workstreamId: workstream.id,
        promptBlobUrl: workstream.promptBlobUrl,
        progressBlobUrl: workstream.progressBlobUrl || undefined,
        maxIterations: workstream.maxIterations,
        anthropicKey: apiKey.anthropicKeyEncrypted, // TODO: Decrypt this
        githubRepoUrl: repo.githubRepoUrl,
        baseBranch: repo.defaultBranch,
      })

      // Update workstream with machine info
      const [updated] = await db
        .update(workstreams)
        .set({
          status: "running",
          flyMachineId: machine.id,
          flyAppName: process.env.FLY_APP_NAME,
        })
        .where(eq(workstreams.id, workstream.id))
        .returning()

      console.log(
        `[Workstreams] Started workstream ${wsSlug} (machine: ${machine.id}) by ${session.user.githubUsername}`
      )

      return NextResponse.json({
        workstream: updated,
        machine: {
          id: machine.id,
          state: machine.state,
        },
      })
    } catch (machineError) {
      // If machine start fails, reset status
      await db
        .update(workstreams)
        .set({
          status: "error",
          startedAt: null,
        })
        .where(eq(workstreams.id, workstream.id))

      throw machineError
    }
  } catch (error) {
    console.error("[Workstreams] Error starting workstream:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start workstream",
      },
      { status: 500 }
    )
  }
}
