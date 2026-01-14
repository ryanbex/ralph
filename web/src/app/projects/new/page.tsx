import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { NewProjectForm } from "./NewProjectForm"
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PixelButton,
  RalphSprite,
} from "@/components/pixel"

export default async function NewProjectPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin?callbackUrl=/projects/new")
  }

  return (
    <main className="min-h-screen bg-simpson-dark p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <PixelButton variant="secondary" size="sm">
              &larr; BACK
            </PixelButton>
          </Link>
        </div>

        <div className="text-center space-y-4">
          <RalphSprite state="thinking" size="lg" />
          <h1 className="font-pixel text-xl text-simpson-yellow">
            CREATE NEW PROJECT
          </h1>
          <p className="font-pixel-body text-lg text-simpson-white">
            Connect a GitHub repository to start running workstreams
          </p>
        </div>

        <PixelCard variant="elevated">
          <PixelCardHeader>
            <PixelCardTitle>Project Details</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <NewProjectForm />
          </PixelCardContent>
        </PixelCard>
      </div>
    </main>
  )
}
