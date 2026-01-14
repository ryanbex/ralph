import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      githubId: string
      githubUsername: string
      avatarUrl: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string
    githubUsername?: string
    avatarUrl?: string
  }
}
