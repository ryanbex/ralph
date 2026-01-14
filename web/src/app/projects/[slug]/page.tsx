import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { db, projects } from "@/lib/db"
import { getOrCreateDbUser } from "@/lib/db/users"
import { eq, and } from "drizzle-orm"
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PixelButton,
  RalphSprite,
} from "@/components/pixel"

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await auth()

  if (!session?.user?.githubId) {
    redirect("/auth/signin?callbackUrl=/dashboard")
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
    notFound()
  }

  const repo = project.repos[0]

  return (
    <main className="min-h-screen bg-simpson-dark p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <PixelButton variant="secondary" size="sm">
              &larr; BACK
            </PixelButton>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <RalphSprite state="idle" size="lg" />
          <div>
            <h1 className="font-pixel text-xl text-simpson-yellow">
              {project.name.toUpperCase()}
            </h1>
            <p className="font-pixel-body text-lg text-simpson-white/70">
              /{project.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Repository</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              {repo ? (
                <div className="space-y-2">
                  <p className="font-pixel-body text-simpson-white">
                    {repo.githubRepoName}
                  </p>
                  <a
                    href={repo.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-pixel-body text-simpson-blue hover:underline break-all text-base"
                  >
                    {repo.githubRepoUrl}
                  </a>
                  <p className="font-pixel text-[10px] text-simpson-white/50">
                    Base branch: {repo.defaultBranch}
                  </p>
                </div>
              ) : (
                <p className="font-pixel-body text-simpson-white/50">
                  No repository connected
                </p>
              )}
            </PixelCardContent>
          </PixelCard>

          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Project Info</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              <div className="space-y-2">
                <p className="font-pixel text-[10px] text-simpson-white/50">
                  Type: {project.type}
                </p>
                <p className="font-pixel text-[10px] text-simpson-white/50">
                  Created:{" "}
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </PixelCardContent>
          </PixelCard>
        </div>

        <PixelCard variant="elevated">
          <PixelCardHeader>
            <PixelCardTitle>Workstreams</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            {project.workstreams.length > 0 ? (
              <div className="space-y-3">
                {project.workstreams.map((ws) => (
                  <div
                    key={ws.id}
                    className="p-3 border-pixel border-simpson-brown rounded-pixel flex items-center justify-between"
                  >
                    <div>
                      <p className="font-pixel text-[10px] text-simpson-yellow">
                        {ws.name}
                      </p>
                      <p className="font-pixel text-[8px] text-simpson-white/50">
                        Iteration {ws.currentIteration}/{ws.maxIterations}
                      </p>
                    </div>
                    <span
                      className={`font-pixel text-[8px] px-2 py-1 rounded-pixel ${
                        ws.status === "running"
                          ? "bg-simpson-green text-simpson-dark"
                          : ws.status === "completed"
                          ? "bg-simpson-blue text-simpson-dark"
                          : ws.status === "failed"
                          ? "bg-simpson-red text-simpson-white"
                          : "bg-simpson-white/20 text-simpson-white"
                      }`}
                    >
                      {ws.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="font-pixel-body text-simpson-white/50">
                  No workstreams yet
                </p>
                <p className="font-pixel text-[10px] text-simpson-white/30 mt-2">
                  Workstream management coming soon
                </p>
              </div>
            )}
          </PixelCardContent>
        </PixelCard>
      </div>
    </main>
  )
}
