# Ralph Workstream: Database Setup (Vercel Postgres)

## Objective
Set up Vercel Postgres database with Drizzle ORM and create initial schema migrations for Ralph Web.

## Context
Ralph Web uses Vercel Postgres for data storage. We need tables for users, projects, workstreams, and role limits. The technical specification is at `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`.

## Prerequisites
- web-foundation workstream must be complete

## Scope

### Include
- Install Drizzle ORM and @vercel/postgres
- Create database schema definitions in `web/src/lib/db/schema.ts`
- Create migration files in `db/migrations/`
- Set up Drizzle config and migration scripts
- Create database client in `web/src/lib/db.ts`
- Tables to create:
  - users (GitHub OAuth data, gamification placeholders)
  - user_api_keys (encrypted Anthropic keys)
  - projects
  - project_repos
  - workstreams
  - role_limits (Simpsons-themed)

### Exclude
- Do NOT create gamification tables yet (Phase 4)
- Do NOT implement complex queries yet

## Deliverables

1. **web/src/lib/db/schema.ts** - Drizzle schema:
   ```typescript
   import { pgTable, uuid, text, timestamp, integer, decimal, jsonb } from 'drizzle-orm/pg-core'

   export const users = pgTable('users', {
     id: uuid('id').primaryKey().defaultRandom(),
     githubId: text('github_id').unique().notNull(),
     // ...
   })
   ```

2. **web/src/lib/db/index.ts** - Database client

3. **db/migrations/001_initial.sql** - Initial schema migration

4. **drizzle.config.ts** - Drizzle configuration

5. **package.json scripts**:
   - `db:generate` - Generate migrations
   - `db:migrate` - Run migrations
   - `db:studio` - Open Drizzle Studio

6. **db/seeds/role_limits.sql** - Seed data for role limits

## Schema Details

### users table
- id (UUID, PK)
- github_id (TEXT, UNIQUE)
- github_username (TEXT)
- email (TEXT, nullable)
- avatar_url (TEXT, nullable)
- role (TEXT, default 'dev')
- donuts, xp, level, streak_days (INTEGER, for future gamification)
- created_at, updated_at (TIMESTAMPTZ)

### user_api_keys table
- id (UUID, PK)
- user_id (UUID, FK -> users)
- anthropic_key_encrypted (TEXT)
- created_at (TIMESTAMPTZ)

### projects table
- id (UUID, PK)
- owner_id (UUID, FK -> users)
- name, slug (TEXT)
- type (TEXT: 'single-repo' | 'multi-repo')
- base_branch (TEXT, default 'main')
- settings (JSONB)
- created_at (TIMESTAMPTZ)

### project_repos table
- id (UUID, PK)
- project_id (UUID, FK -> projects)
- github_repo_url, github_repo_name (TEXT)
- path (TEXT, nullable)
- default_branch (TEXT)

### workstreams table
- id (UUID, PK)
- project_id, user_id (UUID, FK)
- name, slug (TEXT)
- status (TEXT enum)
- current_iteration, max_iterations (INTEGER)
- fargate_task_arn, fargate_cluster (TEXT)
- cloudwatch_log_group, cloudwatch_log_stream (TEXT)
- prompt_blob_url, progress_blob_url (TEXT)
- tokens_in, tokens_out (BIGINT)
- total_cost (DECIMAL)
- pending_question (TEXT)
- started_at, completed_at, created_at (TIMESTAMPTZ)

### role_limits table
- role (TEXT, PK)
- character_name (TEXT)
- max_iterations_per_workstream (INTEGER)
- max_concurrent_workstreams (INTEGER)
- max_workstreams_per_day (INTEGER)

## Instructions

1. Check if web-foundation is complete
2. Read PROGRESS.md
3. Pick next task
4. Implement schema and migrations
5. Test with `pnpm db:generate` and `pnpm db:migrate`
6. Update PROGRESS.md
7. If all done, write "## Status: COMPLETE"

## Technical Notes

- Use Drizzle ORM (not Prisma) - better for Vercel Postgres
- UUID primary keys (not serial/auto-increment)
- TIMESTAMPTZ for all timestamps
- Snake_case for column names (PostgreSQL convention)
