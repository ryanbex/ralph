import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db, projects, projectRepos } from "@/lib/db"
import { getOrCreateDbUser } from "@/lib/db/users"
import { slugify, isValidGithubRepoUrl, extractGithubRepoName } from "@/lib/utils"
import { eq } from "drizzle-orm"

export async function GET() {
  const session = await auth()

  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dbUser = await getOrCreateDbUser({
    githubId: session.user.githubId,
    githubUsername: session.user.githubUsername,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
  })

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, dbUser.id),
    with: {
      repos: true,
    },
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
  })

  return NextResponse.json({ projects: userProjects })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, githubRepoUrl, baseBranch = "main" } = body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    )
  }

  if (!githubRepoUrl || typeof githubRepoUrl !== "string") {
    return NextResponse.json(
      { error: "GitHub repository URL is required" },
      { status: 400 }
    )
  }

  if (!isValidGithubRepoUrl(githubRepoUrl)) {
    return NextResponse.json(
      { error: "Invalid GitHub repository URL format" },
      { status: 400 }
    )
  }

  const repoName = extractGithubRepoName(githubRepoUrl)
  if (!repoName) {
    return NextResponse.json(
      { error: "Could not extract repository name from URL" },
      { status: 400 }
    )
  }

  const dbUser = await getOrCreateDbUser({
    githubId: session.user.githubId,
    githubUsername: session.user.githubUsername,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
  })

  const slug = slugify(name.trim())

  const existingProject = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  })

  if (existingProject) {
    return NextResponse.json(
      { error: "A project with this name already exists" },
      { status: 409 }
    )
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: dbUser.id,
      name: name.trim(),
      slug,
      type: "single-repo",
      baseBranch,
    })
    .returning()

  await db.insert(projectRepos).values({
    projectId: project.id,
    githubRepoUrl,
    githubRepoName: repoName,
    defaultBranch: baseBranch,
  })

  const projectWithRepos = await db.query.projects.findFirst({
    where: eq(projects.id, project.id),
    with: {
      repos: true,
    },
  })

  return NextResponse.json({ project: projectWithRepos }, { status: 201 })
}
