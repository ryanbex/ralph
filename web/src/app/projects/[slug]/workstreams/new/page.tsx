import { auth } from "@/lib/auth"
import { db, projects, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { NewWorkstreamForm } from "./NewWorkstreamForm"

interface NewWorkstreamPageProps {
  params: Promise<{ slug: string }>
}

export default async function NewWorkstreamPage({ params }: NewWorkstreamPageProps) {
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

  // Find project
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
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
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${slug}/workstreams`}
              className="font-pixel text-[10px] text-simpson-white/60 hover:text-simpson-yellow transition-colors"
            >
              &lt; BACK
            </Link>
            <h1 className="font-pixel text-simpson-yellow text-sm">
              NEW WORKSTREAM
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <NewWorkstreamForm projectSlug={slug} projectName={project.name} />
      </main>
    </div>
  )
}
