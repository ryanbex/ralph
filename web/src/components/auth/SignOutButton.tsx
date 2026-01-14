"use client"

import { signOut } from "next-auth/react"

interface SignOutButtonProps {
  callbackUrl?: string
  className?: string
}

export function SignOutButton({
  callbackUrl = "/",
  className = "",
}: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl })}
      className={`inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${className}`}
    >
      Sign out
    </button>
  )
}
