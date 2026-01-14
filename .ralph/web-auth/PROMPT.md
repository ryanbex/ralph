# Ralph Workstream: Authentication (NextAuth.js)

## Objective
Implement GitHub OAuth authentication using NextAuth.js v5 for Ralph Web.

## Context
Ralph Web uses GitHub OAuth for authentication. Users log in with GitHub and can store their Anthropic API key. The technical specification is at `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`.

## Prerequisites
- web-foundation workstream must be complete
- web-database workstream should be complete (for user storage)

## Scope

### Include
- Install and configure NextAuth.js v5 (Auth.js)
- GitHub OAuth provider setup
- Create auth configuration in `web/src/lib/auth.ts`
- Create API route at `web/src/app/api/auth/[...nextauth]/route.ts`
- Create middleware for protected routes
- Create sign-in/sign-out UI components
- Create settings page for Anthropic API key storage
- User creation callback on first login

### Exclude
- Do NOT implement role-based access control yet (Phase 2)
- Do NOT implement team features yet (Phase 3)

## Deliverables

1. **web/src/lib/auth.ts** - NextAuth configuration:
   ```typescript
   import NextAuth from "next-auth"
   import GitHub from "next-auth/providers/github"

   export const { handlers, signIn, signOut, auth } = NextAuth({
     providers: [GitHub],
     callbacks: {
       // Create user on first login
     }
   })
   ```

2. **web/src/app/api/auth/[...nextauth]/route.ts** - Auth API route

3. **web/src/middleware.ts** - Protect dashboard routes

4. **web/src/components/auth/** - Auth UI components:
   - SignInButton.tsx
   - SignOutButton.tsx
   - UserAvatar.tsx

5. **web/src/app/settings/page.tsx** - Settings page with:
   - User profile display
   - Anthropic API key input (encrypted storage)

6. **Auth session provider** in layout

## Instructions

1. Check if web-foundation is complete
2. If not, write "NEEDS_INPUT: Waiting for web-foundation"
3. Read PROGRESS.md
4. Pick next task
5. Implement and test auth flow
6. Update PROGRESS.md
7. If all done, write "## Status: COMPLETE"

## Technical Notes

- Use NextAuth.js v5 (also known as Auth.js)
- Store user data in Vercel Postgres
- Encrypt Anthropic API keys before storage (use app-level encryption)
- Session strategy: JWT (default)
- Protected paths: /dashboard/*, /projects/*, /settings/*
