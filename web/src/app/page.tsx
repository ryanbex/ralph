import { auth } from "@/lib/auth"
import { SignInButton, SignOutButton, UserAvatar } from "@/components/auth"
import Link from "next/link"
import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  RalphSprite,
} from "@/components/pixel"

export default async function Home() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-simpson-dark p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <RalphSprite state={session ? "success" : "idle"} size="lg" />
          <h1 className="font-pixel text-2xl text-simpson-yellow">RALPH WEB</h1>
          <p className="font-pixel-body text-xl text-simpson-white">
            Cloud-native platform for autonomous AI development workstreams
          </p>
        </div>

        {/* Auth Card */}
        <PixelCard variant="elevated">
          <PixelCardHeader>
            <PixelCardTitle>
              {session ? "Welcome Back!" : "Get Started"}
            </PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            {session ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar size={48} />
                  <div>
                    <p className="font-pixel text-sm text-simpson-yellow">
                      {session.user.name}
                    </p>
                    <p className="font-pixel-body text-simpson-white">
                      @{session.user.githubUsername}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link href="/dashboard">
                    <PixelButton variant="primary">DASHBOARD</PixelButton>
                  </Link>
                  <Link href="/settings">
                    <PixelButton variant="secondary">SETTINGS</PixelButton>
                  </Link>
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="font-pixel-body text-simpson-white text-center">
                  Sign in with GitHub to start managing your AI workstreams
                </p>
                <SignInButton />
              </div>
            )}
          </PixelCardContent>
        </PixelCard>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Autonomous AI</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              <p className="font-pixel-body text-simpson-white">
                AI workstreams that code autonomously on your behalf
              </p>
            </PixelCardContent>
          </PixelCard>

          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Real-time Logs</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              <p className="font-pixel-body text-simpson-white">
                Watch progress live as Claude iterates on your code
              </p>
            </PixelCardContent>
          </PixelCard>

          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Git Native</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              <p className="font-pixel-body text-simpson-white">
                All work happens on branches - you control the merge
              </p>
            </PixelCardContent>
          </PixelCard>
        </div>
      </div>
    </main>
  )
}
