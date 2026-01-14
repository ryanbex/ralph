# Ralph Workstream: web-database-connect

## Objective
Connect the existing Drizzle ORM schema to Vercel Postgres and create a working database connection.

## Context
- Schema already exists at `web/src/lib/db/schema.ts`
- Drizzle config needs to be created
- Need to set up migrations
- For LOCAL DEVELOPMENT: Use a local PostgreSQL database (user can set up Vercel Postgres later)

## Scope
### Include
- Create `web/drizzle.config.ts` for Drizzle Kit
- Update `web/src/lib/db/index.ts` to export a working db client
- Create initial migration from existing schema
- Add database scripts to `web/package.json` (db:generate, db:migrate, db:push, db:studio)
- Update `.env.local.example` with DATABASE_URL template
- Test the connection works

### Exclude
- Deploying to Vercel Postgres (local dev only)
- Seeding data
- Creating new tables beyond what's in schema.ts

## Instructions
1. Read PROGRESS.md to see what's already done
2. Read the existing schema at `web/src/lib/db/schema.ts`
3. Read the existing db index at `web/src/lib/db/index.ts`
4. Install drizzle-kit if not present
5. Create drizzle.config.ts pointing to the schema
6. Update db/index.ts to use postgres-js driver with Drizzle
7. Add npm scripts for migrations
8. Generate the initial migration
9. Update PROGRESS.md after each step
10. When complete, write "## Status: COMPLETE" in PROGRESS.md

## Technical Notes
- Use `postgres` package (postgres-js) as the driver - it works well with Vercel Postgres
- DATABASE_URL format: `postgres://user:pass@host:5432/dbname`
- For local dev, user can run `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15`

## Constraints
- Do not modify the existing schema.ts unless fixing bugs
- Follow existing code patterns in the web/ directory
- One logical change per iteration
- Always verify changes compile with `pnpm -F web type-check`
