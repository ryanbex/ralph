import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton, UserAvatar } from "@/components/auth"
import { db, projects } from "@/lib/db"
import { getOrCreateDbUser } from "@/lib/db/users"
import { eq } from "drizzle-orm"
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PixelButton,
  RalphSprite,
} from "@/components/pixel"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.githubId) {
    redirect("/auth/signin?callbackUrl=/dashboard")
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
      workstreams: {
        orderBy: (workstreams, { desc }) => [desc(workstreams.createdAt)],
        limit: 3,
      },
    },
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
  })

  return (
    <div className="min-h-screen bg-simpson-dark">
      <header className="border-b-pixel border-simpson-brown bg-simpson-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-pixel text-lg text-simpson-yellow">
            RALPH WEB
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <PixelButton variant="secondary" size="sm">
                SETTINGS
              </PixelButton>
            </Link>
            <UserAvatar size={32} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <RalphSprite state="idle" size="md" />
            <div>
              <h1 className="font-pixel text-xl text-simpson-yellow">
                DASHBOARD
              </h1>
              <p className="font-pixel-body text-lg text-simpson-white">
                Welcome back, {session.user.name || session.user.githubUsername}!
              </p>
            </div>
          </div>
          <Link href="/projects/new">
            <PixelButton variant="success">+ NEW PROJECT</PixelButton>
          </Link>
        </div>

        {userProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <PixelCard className="h-full hover:border-simpson-yellow transition-colors cursor-pointer">
                  <PixelCardHeader>
                    <PixelCardTitle>{project.name.toUpperCase()}</PixelCardTitle>
                  </PixelCardHeader>
                  <PixelCardContent>
                    <div className="space-y-3">
                      {project.repos[0] && (
                        <p className="font-pixel-body text-simpson-white/70 text-base truncate">
                          {project.repos[0].githubRepoName}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-[8px] text-simpson-white/50">
                          {project.workstreams.length} workstream
                          {project.workstreams.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {project.workstreams.length > 0 && (
                        <div className="pt-2 border-t border-simpson-brown/50">
                          <p className="font-pixel text-[8px] text-simpson-white/50 mb-1">
                            Recent:
                          </p>
                          {project.workstreams.slice(0, 2).map((ws) => (
                            <div
                              key={ws.id}
                              className="flex items-center justify-between text-[8px] py-0.5"
                            >
                              <span className="font-pixel text-simpson-white truncate max-w-[60%]">
                                {ws.name}
                              </span>
                              <span
                                className={`font-pixel px-1 rounded ${
                                  ws.status === "running"
                                    ? "bg-simpson-green text-simpson-dark"
                                    : ws.status === "completed"
                                    ? "bg-simpson-blue text-simpson-dark"
                                    : "bg-simpson-white/20 text-simpson-white"
                                }`}
                              >
                                {ws.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PixelCardContent>
                </PixelCard>
              </Link>
            ))}
          </div>
        ) : (
          <PixelCard variant="outlined" className="text-center py-12">
            <PixelCardContent>
              <RalphSprite state="waiting" size="lg" className="mx-auto mb-4" />
              <h2 className="font-pixel text-sm text-simpson-yellow mb-2">
                NO PROJECTS YET
              </h2>
              <p className="font-pixel-body text-simpson-white/70 mb-4">
                Create your first project to start running workstreams
              </p>
              <Link href="/projects/new">
                <PixelButton variant="primary">CREATE PROJECT</PixelButton>
              </Link>
            </PixelCardContent>
          </PixelCard>
        )}
      </main>
    </div>
  )
}
