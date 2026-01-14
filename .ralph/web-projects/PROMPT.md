# Ralph Workstream: web-projects

## Objective
Implement project CRUD functionality - users can create, list, and view projects.

## Dependencies
**IMPORTANT**: Before starting, check if `web/drizzle.config.ts` exists. If not, wait and check again in 30 seconds. The web-database-connect workstream must complete first.

## Context
- Database schema has `projects` and `project_repos` tables
- Auth is working (NextAuth with GitHub OAuth)
- Pixel art UI components exist in `web/src/components/pixel/`

## Scope
### Include
- `/dashboard` - Update to show project list
- `/projects/new` - Create project form (name, GitHub repo URL)
- `/projects/[slug]` - Project detail page
- API routes: `POST /api/projects`, `GET /api/projects`, `GET /api/projects/[slug]`
- GitHub repo URL validation (basic format check)
- Use existing pixel UI components

### Exclude
- Multi-repo projects (single-repo only for MVP)
- GitHub API integration for repo validation
- Workstream management (separate workstream)

## Instructions
1. Read PROGRESS.md to see what's already done
2. Check dependency: `web/drizzle.config.ts` must exist
3. Read existing dashboard page and pixel components
4. Create API routes for projects CRUD
5. Create /projects/new page with pixel-themed form
6. Create /projects/[slug] page
7. Update dashboard to list projects
8. Run type-check after each change
9. Update PROGRESS.md after each step
10. When complete, write "## Status: COMPLETE" in PROGRESS.md

## Technical Notes
- Use server actions or API routes for mutations
- Slugify project names for URLs
- Projects belong to the authenticated user (use session.user.id)
- Pixel components: PixelButton, PixelCard, PixelInput, PixelProgress

## Constraints
- Follow existing patterns in the codebase
- Use the pixel art theme consistently
- One logical change per iteration
- Always verify changes compile
