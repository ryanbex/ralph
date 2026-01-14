# Progress: Database Setup (Vercel Postgres)

## Status: COMPLETE

## Completed Tasks
- [x] Verify web-foundation is complete
- [x] Install drizzle-orm and @vercel/postgres
- [x] Create drizzle.config.ts
- [x] Create schema.ts with all table definitions
- [x] Create db/index.ts client
- [x] Generate initial migration
- [x] Create seed data for role_limits
- [x] Add db scripts to package.json
- [x] TypeScript type-check passes

## Files Created

### web/drizzle.config.ts
Drizzle Kit configuration pointing to schema and migrations directory.

### web/src/lib/db/schema.ts
Complete schema definitions for all tables:
- `users` - GitHub OAuth data with gamification placeholders (donuts, xp, level, streak_days)
- `user_api_keys` - Encrypted Anthropic API keys per user
- `projects` - Single-repo or multi-repo project definitions
- `project_repos` - GitHub repos associated with projects
- `workstreams` - Autonomous AI workstreams with Fargate/CloudWatch integration
- `role_limits` - Simpsons-themed rate limits per role

Includes:
- Full Drizzle relations for type-safe queries
- Type exports for all tables (User, NewUser, etc.)

### web/src/lib/db/index.ts
Database client using `@vercel/postgres` with schema export.

### web/db/migrations/0000_harsh_mattie_franklin.sql
Initial migration with all tables and foreign key constraints.

### web/db/seeds/role_limits.sql
Seed data for Simpsons-themed role limits:
- Ralph Wiggum (free): 5 iterations, 1 concurrent, 2/day
- Bart Simpson (dev): 20 iterations, 3 concurrent, 10/day
- Lisa Simpson (pro): 50 iterations, 5 concurrent, 25/day
- Marge Simpson (team): 100 iterations, 10 concurrent, 50/day
- Homer Simpson (enterprise): 200 iterations, 25 concurrent, 100/day
- Mr. Burns (admin): 999 iterations, 999 concurrent, 999/day

### web/package.json scripts
- `db:generate` - Generate new migrations from schema changes
- `db:migrate` - Run migrations against database
- `db:push` - Push schema directly (dev only)
- `db:studio` - Open Drizzle Studio for visual DB management

## Environment Variables
Already defined in root `.env.example`:
- `POSTGRES_URL` - Main connection string (used by drizzle.config.ts)
- `POSTGRES_PRISMA_URL` - Pooled connection for Prisma compatibility
- `POSTGRES_URL_NO_SSL` - Non-SSL connection
- `POSTGRES_URL_NON_POOLING` - Direct connection without pooling

## Usage

```bash
# Generate migrations after schema changes
pnpm -F web db:generate

# Apply migrations to database
pnpm -F web db:migrate

# Open visual database editor
pnpm -F web db:studio

# After migration, run seed
psql $POSTGRES_URL -f web/db/seeds/role_limits.sql
```

## Notes
- Schema uses UUID primary keys (not serial/auto-increment)
- All timestamps use TIMESTAMPTZ
- Column names use snake_case (PostgreSQL convention)
- Gamification columns (donuts, xp, level, streak_days) are placeholders for Phase 4
