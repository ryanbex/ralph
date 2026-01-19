# Ralph Development Handoff - January 2026

## Executive Summary

This document provides a complete handoff for the Ralph project. Two major initiatives were completed/in-progress:

1. **CLI UX Enhancements** ✅ COMPLETE - Event streaming, workflow orchestration, notes
2. **Ralph Web Platform** 🔄 IN PROGRESS - Vercel deployed, GitHub OAuth working, Fly.io blocked on billing

**Current Production URL:** https://ralph-12lb2gjti-100x646576-teams.vercel.app

---

## Latest Session Update (2026-01-19)

### Completed This Session

| Task | Status | Notes |
|------|--------|-------|
| GitHub OAuth App created | ✅ Done | Client ID: `Ov23lijuRYQ6nKJ8QIIF` |
| GITHUB_CLIENT_SECRET added to Vercel | ✅ Done | OAuth fully configured |
| Vercel production deployment | ✅ Done | Build successful, all env vars set |
| GitHub OAuth functional | ✅ Done | Sign-in should work now |

### Previous Session (2026-01-18)

| Task | Status | Notes |
|------|--------|-------|
| Fly.io machines client | ✅ Done | `web/src/lib/fly/machines.ts` |
| Start/Stop API routes | ✅ Done | `web/src/app/api/projects/[slug]/workstreams/[wsSlug]/start|stop/route.ts` |
| SSE log streaming endpoint | ✅ Done | `web/src/app/api/projects/[slug]/workstreams/[wsSlug]/logs/route.ts` |
| useWorkstreamLogs hook (SSE) | ✅ Done | Replaced WebSocket with EventSource |
| WorkstreamControls component | ✅ Done | Start/Stop/Logs UI in one component |
| Worker scripts updated | ✅ Done | `worker/entrypoint.sh`, `worker/ralph-loop-cloud.sh` |
| fly.toml created | ✅ Done | `worker/fly.toml` |
| Neon DB schema pushed | ✅ Done | Production database ready |
| Vercel project created | ✅ Done | Named "ralph" (not "web") |
| Flyctl authenticated | ✅ Done | Logged in as ryan@pray.com |

### Blocked Items

| Task | Blocker | Action Required |
|------|---------|-----------------|
| Fly.io app creation | No billing | Add payment at https://fly.io/dashboard/ryan-beck/billing |
| Worker deployment | No Fly.io app | After billing, run `fly apps create ralph-workers && fly deploy` |

### Key Links

- **Production URL:** https://ralph-12lb2gjti-100x646576-teams.vercel.app
- **Vercel Dashboard:** https://vercel.com/100x646576-teams/ralph
- **Vercel Env Vars:** https://vercel.com/100x646576-teams/ralph/settings/environment-variables
- **Fly.io Billing:** https://fly.io/dashboard/ryan-beck/billing
- **Local Dev:** http://localhost:3000
- **Plan File:** `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`

---

## Part 1: CLI UX Enhancements (COMPLETE)

### What Was Built

Three major features were added to the local Ralph CLI:

#### 1.1 Status + Diagnostics + Notes ✅

**Problem:** Couldn't tell which workstreams need attention or why they're stuck.

**Solution:**
- `ralph` (no args) shows quick status table with diagnostics
- `ralph -p <proj> note <ws> "text"` adds contextual notes
- `ralph notes` shows all workstream notes
- Diagnostics identify stuck/error states with actionable guidance

**Commands:**
| Command | Behavior |
|---------|----------|
| `ralph` | Quick status + diagnostics + notes |
| `ralph status` | Alias for above |
| `ralph dashboard` | Interactive menu (original behavior) |
| `ralph -p <proj> note <ws> "text"` | Add note to workstream |
| `ralph notes` | Show all notes |

**Files Modified:**
- `bin/ralph`: Added `cmd_note()`, `cmd_status_global()`, `detect_workstream_issues()`, `get_last_progress()`
- State stored in: `~/.ralph/state/<project>/<workstream>/note`

#### 1.2 Live Progress Streaming ✅

**Problem:** Parent Claude session can't see what child workstreams are doing without attaching to tmux.

**Solution:** JSONL event stream that parent processes can monitor.

**Architecture:**
```
                    ┌──────────────┐
                    │ Parent Shell │ ← `ralph watch`
                    │  (Claude)    │
                    └──────┬───────┘
                           │ reads
                           ▼
              ┌────────────────────────┐
              │ ~/.ralph/events/stream │  ← append-only JSONL
              └────────────────────────┘
                           ▲ writes
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────┴───────┐ ┌────┴────┐ ┌───────┴───────┐
    │ Workstream 1  │ │ WS 2    │ │ Workstream 3  │
    └───────────────┘ └─────────┘ └───────────────┘
```

**Event Format (JSONL):**
```json
{"ts":"2026-01-14T10:30:00Z","project":"ralph","ws":"feature","event":"iteration_start","iter":12,"max":20}
{"ts":"2026-01-14T10:30:01Z","project":"ralph","ws":"feature","event":"iteration_end","iter":12,"exit_code":0,"cost":0.45,"tokens_in":50000,"tokens_out":10000}
{"ts":"2026-01-14T10:30:02Z","project":"myapp","ws":"api","event":"needs_input","question":"Should I use REST or GraphQL?"}
{"ts":"2026-01-14T10:30:03Z","project":"myapp","ws":"api","event":"status","status":"COMPLETE"}
```

**Commands:**
| Command | Behavior |
|---------|----------|
| `ralph watch` | Live TUI showing all workstream progress |
| `ralph watch <project>` | Filter to one project |
| `ralph watch --json` | Raw JSONL stream (for piping) |
| `ralph watch -n` | One-shot mode (no follow) |

**Files Modified:**
- `bin/ralph-loop.sh`: Added `emit_event()` function, emits events at iteration start/end, status changes
- `bin/ralph`: Added `cmd_watch()`, `format_event()`
- Events stored in: `~/.ralph/events/stream` (auto-rotates at 1MB)

#### 1.3 Workflow Orchestration ✅

**Problem:** Want to spawn multiple related workstreams with dependencies.

**Solution:** YAML workflow definitions with DAG-based execution.

**Workflow Schema:**
```yaml
# ~/.ralph/workflows/my-feature.yaml
name: my-feature
workstreams:
  - name: auth
    prompt: "Implement user authentication"
    iterations: 15

  - name: database
    prompt: "Set up database models"
    iterations: 10

  - name: api
    prompt: "Create API endpoints"
    iterations: 20
    depends_on: [auth, database]  # waits for both

  - name: dashboard
    prompt: "Build dashboard UI"
    iterations: 25
    depends_on: [api]
```

**Execution Model:**
```
    ┌───────┐   ┌──────────┐
    │ auth  │   │ database │    ← Start in parallel (no deps)
    └───┬───┘   └────┬─────┘
        │            │
        └─────┬──────┘
              │ both complete
              ▼
          ┌───────┐
          │  api  │             ← Starts when deps finish
          └───┬───┘
              │ complete
              ▼
        ┌───────────┐
        │ dashboard │           ← Starts when api finishes
        └───────────┘
```

**Commands:**
| Command | Behavior |
|---------|----------|
| `ralph run <workflow.yaml>` | Execute workflow with dependency resolution |
| `ralph run <workflow.yaml> --dry-run` | Show execution plan |
| `ralph workflows` | List defined workflows |

**Files Modified:**
- `bin/ralph`: Added `parse_workflow()`, `detect_cycles()`, `has_cycle()`, `get_ready_workstreams()`, `cmd_run_workflow()`, `cmd_workflows()`
- Workflows stored in: `~/.ralph/workflows/`

### Technical Notes

**Bash 3.2 Compatibility:**
- macOS ships with bash 3.2 which doesn't support associative arrays (`declare -A`)
- `cmd_watch()` was rewritten to use stream-based approach without state tracking
- jq commands use null-safe patterns: `.depends_on // []`, `|| fallback`

**Key Bug Fixes During Implementation:**
1. `declare -A` not supported → Rewrote to stream-based approach
2. jq exit code 5 when `depends_on` is null → Added `// []` and `|| fallback`
3. Workflow file path resolution broken → Rewrote with sequential checks
4. Loop iteration over newline-separated output → Added `tr '\n' ' ' | xargs`
5. Note command argument routing → Changed `${@:4}` to `${@:3}`

---

## Part 2: Ralph Web Platform (IN PROGRESS)

### Current State

The web platform is partially built with the goal of running Ralph workstreams in the cloud via Fly.io.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           RALPH WEB                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  VERCEL (Frontend)                                                   │
│  ├── Next.js App (Simpsons-themed pixel UI)                         │
│  ├── GitHub OAuth (NextAuth)                                         │
│  ├── PostgreSQL (Vercel Postgres)                                    │
│  └── Vercel Blob (PROMPT.md, PROGRESS.md storage)                   │
│                                                                      │
│  FLY.IO (Compute)                                                    │
│  ├── Ephemeral Machines (one per workstream)                        │
│  ├── Claude Code + Git installed                                     │
│  ├── ralph-loop-cloud.sh (iteration engine)                         │
│  └── Log streaming via Fly.io API                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What's Built

#### Frontend (web/)

| Component | Status | Description |
|-----------|--------|-------------|
| GitHub OAuth | ✅ Done | NextAuth with GitHub provider |
| User Settings | ✅ Done | Anthropic API key storage (encrypted) |
| Project CRUD | ✅ Done | Create, view, delete projects |
| Workstream CRUD | ✅ Done | Create, view workstreams |
| Pixel UI Components | ✅ Done | 8-bit themed buttons, cards, inputs |
| Dashboard | ✅ Done | List of user's projects |
| Workstream Detail Page | ✅ Done | Shows logs, status, controls |
| Start/Stop API Routes | ✅ Done | `/api/projects/[slug]/workstreams/[wsSlug]/start|stop` |
| Log Streaming API | ✅ Done | `/api/projects/[slug]/workstreams/[wsSlug]/logs` |
| WorkstreamControls | ✅ Done | Start/Stop buttons component |
| Fly.io Client Library | ✅ Done | `web/src/lib/fly/` |

#### Worker (worker/)

| Component | Status | Description |
|-----------|--------|-------------|
| Dockerfile | ✅ Done | Ubuntu + Claude Code + Git |
| fly.toml | ✅ Done | Fly.io machine config |
| entrypoint.sh | ✅ Done | Clones repo, starts ralph-loop |
| ralph-loop-cloud.sh | ✅ Done | Cloud-adapted iteration engine |

#### Database Schema

```sql
-- Key tables (Vercel Postgres)
users (
  id, github_id, email, name, image,
  encrypted_api_key,  -- Anthropic key
  role,               -- marge/homer/bart/lisa/maggie
  created_at, updated_at
)

projects (
  id, user_id, name, slug,
  github_repo, github_branch,
  created_at, updated_at
)

workstreams (
  id, project_id, name, slug,
  prompt_blob_url,     -- Vercel Blob URL
  progress_blob_url,   -- Vercel Blob URL
  status,              -- pending/running/needs_input/complete/error
  fly_machine_id,      -- Fly.io machine ID
  fly_machine_state,   -- created/started/stopped/destroyed
  current_iteration, max_iterations,
  created_at, updated_at
)
```

### Deployment Status (Updated 2026-01-19)

| Environment | URL | Status |
|-------------|-----|--------|
| **Local Dev** | http://localhost:3000 | ✅ Working |
| **Vercel Production** | https://ralph-12lb2gjti-100x646576-teams.vercel.app | ✅ Deployed |
| **Database** | Neon (Vercel Postgres) | ✅ Schema pushed |
| **GitHub OAuth** | NextAuth | ✅ Configured |
| **Fly.io** | ralph-workers | ⏳ Needs billing setup |

**Vercel Project:** `100x646576-teams/ralph`
- Dashboard: https://vercel.com/100x646576-teams/ralph
- Env Vars: https://vercel.com/100x646576-teams/ralph/settings/environment-variables

### What's Left (MVP)

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Add billing to Fly.io | HIGH | ⏳ Blocked | https://fly.io/dashboard/ryan-beck/billing |
| Create Fly.io app | HIGH | ⏳ Blocked on billing | `fly apps create ralph-workers` |
| Deploy worker image to Fly.io | HIGH | ⏳ Blocked on app | `cd worker && fly deploy` |
| Test Fly.io deployment end-to-end | HIGH | ⏳ | Deploy worker, verify it starts |
| Verify log streaming works | HIGH | ⏳ | Test useWorkstreamLogs hook |
| Test start/stop flow | HIGH | ⏳ | Verify machine lifecycle |
| Create internal API routes | MEDIUM | ⏳ | Worker callbacks need `/api/internal/workstreams/[id]` |
| PROMPT.md upload to Blob | MEDIUM | ⏳ | May need UI for uploading prompts |

### Environment Variables

**Vercel (Current Status - All Set):**
```bash
# ✅ All Required Vars Set
DATABASE_URL=postgresql://neondb_owner:***@ep-lively-dawn-af6mwo7u-pooler...
GITHUB_CLIENT_ID=Ov23lijuRYQ6nKJ8QIIF
GITHUB_CLIENT_SECRET=a950e9065ab1f593175f6e8c6b19c9c768a02e97
AUTH_SECRET=<encrypted>
# + All POSTGRES_* vars from Neon

# ⏳ Add after Fly.io setup
FLY_API_TOKEN=<from `fly tokens create deploy -x 999999h`>
FLY_APP_NAME=ralph-workers
```

**Local (.env.local):**
```bash
DATABASE_URL=postgres://ralph:ralph_dev_password@localhost:5434/ralph_web
GITHUB_CLIENT_ID=Ov23lir69tzvNCajURx2
GITHUB_CLIENT_SECRET=<your secret>
AUTH_SECRET=<your secret>
```

**Fly.io Worker (set via Machines API at runtime):**
```bash
WORKSTREAM_ID=<uuid>
GITHUB_REPO_URL=<repo url>
PROMPT_BLOB_URL=<vercel blob url>
ANTHROPIC_API_KEY=<from user's settings>
BASE_BRANCH=main
MAX_ITERATIONS=20
RALPH_API_URL=https://ralph-*.vercel.app
```

### Key Files

**Web Frontend:**
- `web/src/app/projects/[slug]/workstreams/[wsSlug]/page.tsx` - Workstream detail page
- `web/src/app/api/projects/[slug]/workstreams/[wsSlug]/start/route.ts` - Start workstream API
- `web/src/app/api/projects/[slug]/workstreams/[wsSlug]/stop/route.ts` - Stop workstream API
- `web/src/app/api/projects/[slug]/workstreams/[wsSlug]/logs/route.ts` - SSE log streaming
- `web/src/components/WorkstreamControls.tsx` - Start/Stop/Logs UI component
- `web/src/components/LogViewer.tsx` - Real-time log display (pixel-themed)
- `web/src/hooks/useWorkstreamLogs.ts` - SSE-based log streaming hook
- `web/src/lib/fly/machines.ts` - Fly.io Machines API client
- `web/src/lib/fly/logs.ts` - SSE log streaming helpers (LogStream class)
- `web/src/lib/db/schema.ts` - Drizzle ORM schema
- `web/vercel.json` - Vercel build config

**Worker:**
- `worker/Dockerfile` - Ubuntu + Node.js 20 + Claude Code CLI
- `worker/fly.toml` - Fly.io machine config (ralph-workers app)
- `worker/entrypoint.sh` - Clones repo, downloads PROMPT.md, starts loop
- `worker/ralph-loop-cloud.sh` - Cloud iteration engine with API callbacks

**Config:**
- `web/drizzle.config.ts` - Drizzle configuration (loads .env.local)
- `docker-compose.yml` - Local PostgreSQL on port 5434

---

## Part 3: Future Phases

From 2026-01-ROADMAP.md:

### Phase 2: Core Features
- Multi-repo project support
- Interactive prompt refinement
- Answer questions via UI
- Auto-merge on completion
- Full role system (Marge/Homer/Bart/Lisa/Maggie)
- Iteration limits per role
- Push notifications

### Phase 3: Collaboration
- MCP server for terminal control
- Team/organization model
- GitHub App integration
- Webhook triggers

### Phase 4: Gamification
- Donut economy
- XP and level system
- Achievements
- Leaderboards
- Ralph worker visual evolution

### Phase 5: Enterprise
- SSO (SAML/OIDC)
- Fine-grained RBAC
- Usage-based billing

---

## File Structure Reference

```
ralph/
├── bin/
│   ├── ralph              # Main CLI (~2500 lines)
│   └── ralph-loop.sh      # Local iteration engine (~850 lines)
├── docs/
│   ├── ARCHITECTURE.md    # Technical architecture
│   ├── PHILOSOPHY.md      # Design philosophy
│   └── roadmaps/
│       ├── 2026-01-ROADMAP.md    # Web platform roadmap
│       └── 2026-01-HANDOFF.md    # This file
├── web/                   # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities (db, fly, auth)
│   └── package.json
├── worker/                # Fly.io worker
│   ├── Dockerfile
│   ├── fly.toml
│   ├── entrypoint.sh
│   └── ralph-loop-cloud.sh
├── server/                # REST API (legacy, local)
│   └── server.js
├── skills/                # Claude Code skills
├── CLAUDE.md              # Project configuration
└── package.json
```

---

## How to Continue

### Immediate Next Steps

1. **Test GitHub OAuth:**
   - Go to: https://ralph-12lb2gjti-100x646576-teams.vercel.app
   - Sign in with GitHub
   - Verify you land on the dashboard

2. **Set up Fly.io billing:**
   - Go to: https://fly.io/dashboard/ryan-beck/billing
   - Add a payment method

3. **Create and deploy Fly.io app:**
   ```bash
   cd worker
   fly apps create ralph-workers
   fly deploy --build-only  # Build and push image to registry
   ```

4. **Get Fly.io API token and add to Vercel:**
   ```bash
   fly tokens create deploy -x 999999h
   # Copy the token and add to Vercel:
   vercel env add FLY_API_TOKEN production
   vercel env add FLY_APP_NAME production  # value: ralph-workers
   vercel --prod  # Redeploy
   ```

5. **Test the full flow:**
   - Sign in at https://ralph-12lb2gjti-100x646576-teams.vercel.app
   - Create a project
   - Create a workstream with a PROMPT.md
   - Click "Start" - verify Fly machine starts
   - Watch logs stream in real-time
   - Click "Stop" - verify machine stops

### Missing API Routes (TODO)

The worker scripts call these internal API routes that may need to be created:
- `PATCH /api/internal/workstreams/[id]` - Update status, iteration, etc.
- `PUT /api/internal/workstreams/[id]/progress` - Upload PROGRESS.md
- `GET /api/internal/workstreams/[id]` - Get workstream (for answer polling)

### Local Development

```bash
# Start local PostgreSQL
docker-compose up -d

# Install dependencies and start dev server
cd web
pnpm install
pnpm run dev

# Push schema to local DB
pnpm run db:push

# Open Drizzle Studio to inspect DB
pnpm run db:studio
```

### Vercel Deployment

```bash
cd web
vercel           # Preview deployment
vercel --prod    # Production deployment
```

### CLI Testing (Local Ralph)

```bash
# Test new commands
ralph                           # Quick status
ralph watch                     # Event streaming
ralph workflows                 # List workflows
ralph run test-feature.yaml --dry-run  # Test workflow
```

---

## Contact

Project Owner: Ryan Beck
Repository: /Users/ryanbeck/bin/git/personal/ralph
