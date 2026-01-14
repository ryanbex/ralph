# Ralph Workstream: web-workstreams

## Objective
Implement workstream CRUD functionality - users can create, list, and view workstreams within projects.

## Dependencies
**IMPORTANT**: Before starting, check if `/projects/[slug]/page.tsx` exists. If not, wait and check again in 30 seconds. The web-projects workstream must complete first.

## Context
- Database schema has `workstreams` table
- Projects CRUD should be complete
- Pixel art UI components exist
- Workstreams have: name, slug, status, prompt content, max_iterations

## Scope
### Include
- `/projects/[slug]/workstreams` - List workstreams for a project
- `/projects/[slug]/workstreams/new` - Create workstream form (name, prompt textarea, max iterations)
- `/projects/[slug]/workstreams/[wsSlug]` - Workstream detail page with status
- API routes for workstream CRUD
- Status display with pixel progress bar
- WorkstreamCard component

### Exclude
- Starting/stopping workstreams (needs Fargate)
- Real-time log viewing (separate workstream)
- Blob storage for prompts (separate workstream)

## Instructions
1. Read PROGRESS.md to see what's already done
2. Check dependency: `web/src/app/projects/[slug]/page.tsx` must exist
3. Read existing project pages and pixel components
4. Create WorkstreamCard component
5. Create API routes for workstreams CRUD
6. Create workstream pages (list, new, detail)
7. Add workstream list to project detail page
8. Run type-check after each change
9. Update PROGRESS.md after each step
10. When complete, write "## Status: COMPLETE" in PROGRESS.md

## Technical Notes
- Workstream statuses: pending, provisioning, running, needs_input, stuck, stopping, stopped, complete, error, cancelled
- Use PixelProgress component for iteration progress
- Workstreams belong to a project and user
- Slug format: lowercase alphanumeric with hyphens

## Constraints
- Follow existing patterns in the codebase
- Use the pixel art theme consistently
- One logical change per iteration
- Always verify changes compile
