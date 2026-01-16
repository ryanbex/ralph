# Ralph Development Handoff - January 2026

## Executive Summary

This document provides a complete handoff for the Ralph project. Two major initiatives were completed/in-progress:

1. **CLI UX Enhancements** ✅ COMPLETE - Event streaming, workflow orchestration, notes
2. **Ralph Web Platform** 🔄 IN PROGRESS - Fly.io integration for cloud workstreams

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

### What's Left (MVP)

| Task | Priority | Notes |
|------|----------|-------|
| Test Fly.io deployment end-to-end | HIGH | Deploy worker, verify it starts |
| Verify log streaming works | HIGH | Test useWorkstreamLogs hook |
| Test start/stop flow | HIGH | Verify machine lifecycle |
| Error handling polish | MEDIUM | Better error messages in UI |
| Environment variables setup | HIGH | FLY_API_TOKEN, etc. |
| PROMPT.md upload to Blob | MEDIUM | Currently may be incomplete |

### Environment Variables Needed

```bash
# Vercel (.env.local)
GITHUB_ID=xxx
GITHUB_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
POSTGRES_URL=xxx
BLOB_READ_WRITE_TOKEN=xxx
FLY_API_TOKEN=xxx
FLY_APP_NAME=ralph-worker

# Fly.io (set via fly secrets)
ANTHROPIC_API_KEY=xxx  # Per-workstream from user
GITHUB_TOKEN=xxx       # Per-workstream from user
```

### Key Files

**Web Frontend:**
- `web/src/app/projects/[slug]/workstreams/[wsSlug]/page.tsx` - Workstream detail page
- `web/src/components/WorkstreamControls.tsx` - Start/Stop buttons
- `web/src/components/LogViewer.tsx` - Real-time log display
- `web/src/hooks/useWorkstreamLogs.ts` - Log streaming hook
- `web/src/lib/fly/machines.ts` - Fly.io machine management
- `web/src/lib/fly/logs.ts` - Fly.io log streaming
- `web/src/lib/db/schema.ts` - Database schema

**Worker:**
- `worker/Dockerfile` - Container image
- `worker/fly.toml` - Fly.io config
- `worker/entrypoint.sh` - Startup script
- `worker/ralph-loop-cloud.sh` - Iteration engine

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

### Testing Fly.io Integration

1. **Set up Fly.io:**
   ```bash
   cd worker
   fly auth login
   fly apps create ralph-worker
   fly deploy
   ```

2. **Set environment variables in Vercel:**
   - Add `FLY_API_TOKEN` and `FLY_APP_NAME`

3. **Test the flow:**
   - Create a project in the web UI
   - Create a workstream
   - Click "Start"
   - Verify machine starts in Fly.io
   - Verify logs stream to UI
   - Click "Stop"
   - Verify machine stops

### Local Development

```bash
# Web frontend
cd web
npm install
npm run dev

# Database (if needed)
docker-compose up -d  # Starts local PostgreSQL
npm run db:push       # Push schema to DB
```

### CLI Testing

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
