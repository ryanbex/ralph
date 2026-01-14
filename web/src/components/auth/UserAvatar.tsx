"use client"

import { useSession } from "next-auth/react"
import Image from "next/image"

interface UserAvatarProps {
  size?: number
  className?: string
}

export function UserAvatar({ size = 40, className = "" }: UserAvatarProps) {
  const { data: session } = useSession()

  if (!session?.user) {
    return (
      <div
        className={`rounded-full bg-gray-200 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const { avatarUrl, name, githubUsername } = session.user
  const displayName = name || githubUsername || "User"

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
      />
    )
  }

  // Fallback to initials
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-500 text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}
