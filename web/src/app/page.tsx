import { auth } from "@/lib/auth"
import { SignInButton, SignOutButton, UserAvatar } from "@/components/auth"
import Link from "next/link"

export default async function Home() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Ralph Web</h1>
      <p className="mt-4 text-lg text-gray-600">
        Cloud-native platform for autonomous AI development workstreams
      </p>

      <div className="mt-8">
        {session ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar size={48} />
              <div>
                <p className="font-medium">{session.user.name}</p>
                <p className="text-sm text-gray-500">
                  @{session.user.githubUsername}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/settings"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Settings
              </Link>
              <SignOutButton />
            </div>
          </div>
        ) : (
          <SignInButton />
        )}
      </div>
    </main>
  )
}
