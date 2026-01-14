import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist GitHub user data on first login
      if (account && profile) {
        token.githubId = profile.id?.toString()
        token.githubUsername = profile.login
        token.avatarUrl = profile.avatar_url
      }
      return token
    },
    async session({ session, token }) {
      // Add GitHub data to session
      if (session.user) {
        session.user.id = token.sub!
        session.user.githubId = token.githubId as string
        session.user.githubUsername = token.githubUsername as string
        session.user.avatarUrl = token.avatarUrl as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
})
