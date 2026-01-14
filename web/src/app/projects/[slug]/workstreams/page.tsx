import { auth } from "@/lib/auth"
import { db, projects, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { PixelButton } from "@/components/pixel/PixelButton"
import { WorkstreamCard } from "@/components/pixel/WorkstreamCard"
import type { WorkstreamStatus } from "@/components/pixel/WorkstreamCard"

interface WorkstreamsPageProps {
  params: Promise<{ slug: string }>
}

export default async function WorkstreamsPage({ params }: WorkstreamsPageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/dashboard")
  }

  const { slug } = await params

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.githubId, session.user.githubId),
  })

  if (!user) {
    redirect("/auth/signin?callbackUrl=/dashboard")
  }

  // Find project with workstreams
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      workstreams: {
        orderBy: (workstreams, { desc }) => [desc(workstreams.createdAt)],
      },
    },
  })

  if (!project) {
    notFound()
  }

  // Check ownership
  if (project.ownerId !== user.id) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-simpson-dark">
      {/* Header */}
      <header className="border-b-pixel border-simpson-brown bg-simpson-dark/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${slug}`}
                className="font-pixel text-[10px] text-simpson-white/60 hover:text-simpson-yellow transition-colors"
              >
                &lt; BACK
              </Link>
              <h1 className="font-pixel text-simpson-yellow text-sm">
                {project.name} / WORKSTREAMS
              </h1>
            </div>
            <Link href={`/projects/${slug}/workstreams/new`}>
              <PixelButton variant="primary" size="sm">
                + NEW WORKSTREAM
              </PixelButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {project.workstreams.length === 0 ? (
          <div className="border-pixel border-dashed border-simpson-brown rounded-pixel p-12 text-center">
            <p className="font-pixel text-simpson-yellow text-xs">
              NO WORKSTREAMS YET
            </p>
            <p className="font-pixel-body text-simpson-white/60 text-sm mt-2">
              Create your first workstream to start autonomous development.
            </p>
            <div className="mt-6">
              <Link href={`/projects/${slug}/workstreams/new`}>
                <PixelButton variant="success" size="md">
                  CREATE WORKSTREAM
                </PixelButton>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.workstreams.map((ws) => (
              <WorkstreamCard
                key={ws.id}
                name={ws.name}
                slug={ws.slug}
                projectSlug={slug}
                status={ws.status as WorkstreamStatus}
                currentIteration={ws.currentIteration}
                maxIterations={ws.maxIterations}
                pendingQuestion={ws.pendingQuestion}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
