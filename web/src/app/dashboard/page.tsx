import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton, UserAvatar } from "@/components/auth"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard")
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            Ralph Web
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <UserAvatar size={32} />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {session.user.name || session.user.githubUsername}!
        </p>

        {/* Placeholder for projects */}
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-medium text-gray-900">No projects yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Projects and workstreams will appear here once you create them.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            (Coming in future workstream)
          </p>
        </div>
      </main>
    </div>
  )
}
