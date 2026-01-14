import { auth } from "@/lib/auth"
import { db, projects, workstreams, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
} from "@/components/pixel/PixelCard"
import { PixelProgress } from "@/components/pixel/PixelProgress"
import { PixelButton } from "@/components/pixel/PixelButton"
import type { WorkstreamStatus } from "@/components/pixel/WorkstreamCard"

interface WorkstreamDetailPageProps {
  params: Promise<{ slug: string; wsSlug: string }>
}

const statusConfig: Record<
  WorkstreamStatus,
  { label: string; color: string; variant: "default" | "success" | "warning" | "danger"; description: string }
> = {
  pending: { label: "PENDING", color: "text-simpson-white/60", variant: "default", description: "Workstream is created but not yet started." },
  provisioning: { label: "PROVISIONING", color: "text-simpson-blue", variant: "default", description: "Setting up infrastructure..." },
  running: { label: "RUNNING", color: "text-simpson-green", variant: "success", description: "Claude is actively working on this workstream." },
  needs_input: { label: "NEEDS INPUT", color: "text-simpson-yellow", variant: "warning", description: "Claude is waiting for your response." },
  stuck: { label: "STUCK", color: "text-simpson-red", variant: "danger", description: "Workstream encountered an issue and needs attention." },
  stopping: { label: "STOPPING", color: "text-simpson-yellow", variant: "warning", description: "Gracefully stopping the workstream..." },
  stopped: { label: "STOPPED", color: "text-simpson-white/60", variant: "default", description: "Workstream was stopped manually." },
  complete: { label: "COMPLETE", color: "text-simpson-green", variant: "success", description: "All iterations finished successfully!" },
  error: { label: "ERROR", color: "text-simpson-red", variant: "danger", description: "Workstream failed due to an error." },
  cancelled: { label: "CANCELLED", color: "text-simpson-white/60", variant: "default", description: "Workstream was cancelled." },
}

export default async function WorkstreamDetailPage({ params }: WorkstreamDetailPageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/dashboard")
  }

  const { slug, wsSlug } = await params

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

  if (!project || project.ownerId !== user.id) {
    notFound()
  }

  // Find workstream
  const workstream = await db.query.workstreams.findFirst({
    where: and(
      eq(workstreams.projectId, project.id),
      eq(workstreams.slug, wsSlug)
    ),
  })

  if (!workstream) {
    notFound()
  }

  const status = workstream.status as WorkstreamStatus
  const config = statusConfig[status]
  const isActive = ["running", "provisioning", "needs_input"].includes(status)
  const canStart = status === "pending" || status === "stopped"
  const canStop = ["running", "needs_input", "stuck"].includes(status)

  return (
    <div className="min-h-screen bg-simpson-dark">
      {/* Header */}
      <header className="border-b-pixel border-simpson-brown bg-simpson-dark/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${slug}/workstreams`}
                className="font-pixel text-[10px] text-simpson-white/60 hover:text-simpson-yellow transition-colors"
              >
                &lt; WORKSTREAMS
              </Link>
              <h1 className="font-pixel text-simpson-yellow text-sm">
                {workstream.name}
              </h1>
              <span className={`font-pixel text-[8px] ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Status Card */}
        <PixelCard variant={isActive ? "elevated" : "default"}>
          <PixelCardHeader>
            <div className="flex items-center justify-between">
              <PixelCardTitle>STATUS</PixelCardTitle>
              <div className="flex items-center gap-2">
                {canStart && (
                  <PixelButton variant="success" size="sm" disabled>
                    START (COMING SOON)
                  </PixelButton>
                )}
                {canStop && (
                  <PixelButton variant="danger" size="sm" disabled>
                    STOP (COMING SOON)
                  </PixelButton>
                )}
              </div>
            </div>
          </PixelCardHeader>
          <PixelCardContent>
            <p className="font-pixel-body text-simpson-white/80 text-sm">
              {config.description}
            </p>

            {/* Progress */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[8px] text-simpson-white/60">
                  ITERATION PROGRESS
                </span>
                <span className="font-pixel text-[10px] text-simpson-white">
                  {workstream.currentIteration} / {workstream.maxIterations}
                </span>
              </div>
              <PixelProgress
                value={workstream.currentIteration}
                max={workstream.maxIterations}
                variant={config.variant}
                size="md"
              />
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Pending Question Card */}
        {status === "needs_input" && workstream.pendingQuestion && (
          <PixelCard variant="elevated">
            <PixelCardHeader>
              <PixelCardTitle className="text-simpson-yellow">
                CLAUDE NEEDS YOUR INPUT
              </PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              <p className="font-pixel-body text-simpson-white text-sm whitespace-pre-wrap">
                {workstream.pendingQuestion}
              </p>
              <div className="mt-4">
                <PixelButton variant="primary" size="md" disabled>
                  ANSWER (COMING SOON)
                </PixelButton>
              </div>
            </PixelCardContent>
          </PixelCard>
        )}

        {/* Details Card */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>DETAILS</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">BRANCH</p>
                <p className="font-pixel-body text-simpson-blue mt-1">
                  ralph/{workstream.slug}
                </p>
              </div>
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">MAX ITERATIONS</p>
                <p className="font-pixel-body text-simpson-white mt-1">
                  {workstream.maxIterations}
                </p>
              </div>
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">TOKENS IN</p>
                <p className="font-pixel-body text-simpson-white mt-1">
                  {workstream.tokensIn.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">TOKENS OUT</p>
                <p className="font-pixel-body text-simpson-white mt-1">
                  {workstream.tokensOut.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">TOTAL COST</p>
                <p className="font-pixel-body text-simpson-green mt-1">
                  ${parseFloat(workstream.totalCost).toFixed(4)}
                </p>
              </div>
              <div>
                <p className="font-pixel text-[8px] text-simpson-white/60">CREATED</p>
                <p className="font-pixel-body text-simpson-white mt-1">
                  {new Date(workstream.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Danger Zone */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle className="text-simpson-red">DANGER ZONE</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-pixel text-[10px] text-simpson-white">
                  DELETE WORKSTREAM
                </p>
                <p className="font-pixel-body text-simpson-white/60 text-sm mt-1">
                  This action cannot be undone.
                </p>
              </div>
              <PixelButton variant="danger" size="sm" disabled={isActive}>
                DELETE
              </PixelButton>
            </div>
          </PixelCardContent>
        </PixelCard>
      </main>
    </div>
  )
}
