# Ralph Workstream: Web Foundation

## Objective
Initialize the monorepo structure for Ralph Web Platform with Next.js 14, pnpm workspaces, and Turborepo.

## Context
We are building Ralph Web - a cloud-native platform to manage autonomous AI development workstreams. The technical specification is at `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`.

## Scope

### Include
- Create pnpm workspace configuration at repo root
- Set up Turborepo for build orchestration
- Initialize Next.js 14 app in `web/` directory with App Router
- Create directory structure: `web/`, `worker/`, `infra/`, `db/`, `shared/`
- Configure TypeScript, ESLint, Prettier
- Create `.env.example` with all required environment variables
- Set up shared types package in `shared/types/`

### Exclude
- Do NOT implement authentication yet (separate workstream)
- Do NOT set up database yet (separate workstream)
- Do NOT create UI components yet (separate workstream)
- Do NOT set up AWS infrastructure yet (separate workstream)

## Deliverables

1. **Root package.json** with pnpm workspaces:
   ```json
   {
     "name": "ralph-web",
     "private": true,
     "workspaces": ["web", "worker", "infra", "db", "shared/*"]
   }
   ```

2. **turbo.json** with build/dev/lint pipelines

3. **web/package.json** with Next.js 14 dependencies:
   - next@14
   - react@18, react-dom@18
   - typescript
   - tailwindcss, postcss, autoprefixer
   - @types/node, @types/react

4. **web/src/app/layout.tsx** - Basic root layout

5. **web/src/app/page.tsx** - Placeholder landing page

6. **shared/types/package.json** - Shared TypeScript types package

7. **.env.example** with:
   - Vercel vars (POSTGRES_URL, BLOB_READ_WRITE_TOKEN)
   - NextAuth vars (NEXTAUTH_URL, NEXTAUTH_SECRET)
   - GitHub OAuth vars
   - AWS vars

## Instructions

1. Read PROGRESS.md to see what's been done
2. Pick next uncompleted task
3. Implement with minimal changes
4. Run `pnpm install` and verify it works
5. Run `pnpm -F web dev` to verify Next.js starts
6. Update PROGRESS.md with what was completed
7. If all tasks done, write "## Status: COMPLETE"

## Technical Notes

- Use pnpm (not npm or yarn)
- Next.js 14 with App Router (not Pages Router)
- TypeScript strict mode enabled
- The existing `bin/`, `server/`, `docs/` directories should remain untouched
