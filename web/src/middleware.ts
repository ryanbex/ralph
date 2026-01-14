import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Protected route patterns
const protectedPatterns = [
  /^\/dashboard(\/.*)?$/,
  /^\/projects(\/.*)?$/,
  /^\/settings(\/.*)?$/,
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Check if current path matches any protected pattern
  const isProtectedRoute = protectedPatterns.some((pattern) =>
    pattern.test(pathname)
  )

  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all paths except static files and api routes (except auth)
    "/((?!_next/static|_next/image|favicon.ico|api/(?!auth)).*)",
  ],
}
