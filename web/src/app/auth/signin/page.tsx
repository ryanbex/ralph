import { SignInButton } from "@/components/auth"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth()

  // If already logged in, redirect to callback URL or dashboard
  if (session) {
    const params = await searchParams
    redirect(params.callbackUrl || "/dashboard")
  }

  const params = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Welcome to Ralph Web</h1>
        <p className="mt-4 text-lg text-gray-600">
          Sign in with GitHub to get started
        </p>
        <div className="mt-8">
          <SignInButton callbackUrl={params.callbackUrl || "/dashboard"} />
        </div>
      </div>
    </main>
  )
}
