import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import { SettingsForm } from "./SettingsForm"

export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin?callbackUrl=/settings")
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* User Profile Section */}
        <section className="mt-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            {session.user.avatarUrl && (
              <Image
                src={session.user.avatarUrl}
                alt={session.user.name || "User"}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-gray-500">
                @{session.user.githubUsername}
              </p>
              <p className="text-sm text-gray-500">{session.user.email}</p>
            </div>
          </div>
        </section>

        {/* API Key Section */}
        <section className="mt-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">Anthropic API Key</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your API key is encrypted and stored securely. It is used to run
            workstreams with Claude.
          </p>
          <SettingsForm userId={session.user.id} />
        </section>
      </div>
    </main>
  )
}
