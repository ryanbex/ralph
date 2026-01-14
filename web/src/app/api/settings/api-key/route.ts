import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Simple app-level encryption for API keys
// In production, consider using AWS KMS or similar
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || "default-dev-key"

function encrypt(text: string): string {
  // Simple XOR encryption for demo - use proper encryption in production
  const key = ENCRYPTION_KEY
  let result = ""
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    )
  }
  return Buffer.from(result).toString("base64")
}

function decrypt(encoded: string): string {
  const text = Buffer.from(encoded, "base64").toString()
  const key = ENCRYPTION_KEY
  let result = ""
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    )
  }
  return result
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 400 }
      )
    }

    const encryptedKey = encrypt(apiKey)

    // TODO: Store encrypted key in database when web-database workstream is complete
    // await db.insert(userApiKeys).values({
    //   userId: session.user.id,
    //   anthropicKeyEncrypted: encryptedKey,
    // }).onConflictDoUpdate({
    //   target: userApiKeys.userId,
    //   set: { anthropicKeyEncrypted: encryptedKey, createdAt: new Date() },
    // })

    console.log(`[API Key] User ${session.user.githubUsername} saved API key`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API Key] Error saving API key:", error)
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // TODO: Check if user has API key in database
  // const result = await db.select().from(userApiKeys)
  //   .where(eq(userApiKeys.userId, session.user.id))
  //   .limit(1)

  return NextResponse.json({ hasKey: false })
}

export async function DELETE() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // TODO: Delete API key from database
  // await db.delete(userApiKeys).where(eq(userApiKeys.userId, session.user.id))

  console.log(`[API Key] User ${session.user.githubUsername} deleted API key`)

  return NextResponse.json({ success: true })
}
