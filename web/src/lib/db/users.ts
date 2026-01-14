import { db } from "./index"
import { users, type User } from "./schema"
import { eq } from "drizzle-orm"

export async function getOrCreateDbUser(session: {
  githubId: string
  githubUsername: string
  email?: string | null
  avatarUrl?: string
}): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: eq(users.githubId, session.githubId),
  })

  if (existing) {
    return existing
  }

  const [newUser] = await db
    .insert(users)
    .values({
      githubId: session.githubId,
      githubUsername: session.githubUsername,
      email: session.email ?? undefined,
      avatarUrl: session.avatarUrl,
    })
    .returning()

  return newUser
}

export async function getDbUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  })
}

export async function getDbUserByGithubId(
  githubId: string
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.githubId, githubId),
  })
}
