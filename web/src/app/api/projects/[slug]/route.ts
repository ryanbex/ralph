import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db, projects } from "@/lib/db"
import { getOrCreateDbUser } from "@/lib/db/users"
import { eq, and } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()

  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params

  const dbUser = await getOrCreateDbUser({
    githubId: session.user.githubId,
    githubUsername: session.user.githubUsername,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
  })

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.slug, slug), eq(projects.ownerId, dbUser.id)),
    with: {
      repos: true,
      workstreams: {
        orderBy: (workstreams, { desc }) => [desc(workstreams.createdAt)],
        limit: 10,
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project })
}
