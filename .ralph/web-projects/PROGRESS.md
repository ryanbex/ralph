# Progress: web-projects

## Status: COMPLETE

## Dependencies
- [x] web-database-connect must complete first (check for web/drizzle.config.ts)

## Completed
- [x] Added drizzle-orm, @vercel/postgres, drizzle-kit to package.json
- [x] Created database user helper (src/lib/db/users.ts) - getOrCreateDbUser, getDbUserById, getDbUserByGithubId
- [x] Added slugify, isValidGithubRepoUrl, extractGithubRepoName utilities to src/lib/utils.ts
- [x] Created API route POST /api/projects (src/app/api/projects/route.ts)
- [x] Created API route GET /api/projects (src/app/api/projects/route.ts)
- [x] Created API route GET /api/projects/[slug] (src/app/api/projects/[slug]/route.ts)
- [x] Created /projects/new page with pixel-themed form (src/app/projects/new/page.tsx, NewProjectForm.tsx)
- [x] Created /projects/[slug] detail page (src/app/projects/[slug]/page.tsx)
- [x] Updated dashboard to list projects with pixel UI (src/app/dashboard/page.tsx)
- [x] Type-check passes

## Files Created/Modified
- web/src/lib/db/users.ts (NEW)
- web/src/lib/utils.ts (MODIFIED - added slugify, isValidGithubRepoUrl, extractGithubRepoName)
- web/src/app/api/projects/route.ts (NEW - GET/POST endpoints)
- web/src/app/api/projects/[slug]/route.ts (NEW - GET by slug endpoint)
- web/src/app/projects/new/page.tsx (NEW)
- web/src/app/projects/new/NewProjectForm.tsx (NEW)
- web/src/app/projects/[slug]/page.tsx (NEW)
- web/src/app/dashboard/page.tsx (MODIFIED - now lists projects with pixel theme)
- web/package.json (MODIFIED - added drizzle dependencies)

## Technical Notes
- Projects are linked to database users via getOrCreateDbUser (creates user on first auth)
- Session user.githubId is used to find/create the database user
- Project slugs are unique across all users (could be scoped to user in future)
- Single repo per project (MVP scope as specified)
- Workstreams displayed in project detail page (read-only for now)
