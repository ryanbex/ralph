# Ralph CLI UX Enhancement Plan (COMPLETED)

> This plan was fully implemented in January 2026. See 2026-01-HANDOFF.md for details.

## Overview

Three major enhancements:
1. **Status + Diagnostics + Notes** ✅ - Better visibility into what needs attention
2. **Live Progress Streaming** ✅ - Real-time updates from child workstreams to parent
3. **Workstream Dependencies** ✅ - DAG-based orchestration with automatic parallelism

---

## Part 1: Status + Diagnostics + Notes ✅

### Problem
Can't tell which workstreams need attention, WHY they're hanging, or add context notes.

### Solution
New `ralph` (no args) shows:
- Status table with all workstreams
- "Needs Attention" section with diagnostics (why stuck, what action to take)
- Per-workstream notes
- No screen clearing

### Commands
| Command | Behavior |
|---------|----------|
| `ralph` | Quick status + diagnostics + notes |
| `ralph status` | Alias for above |
| `ralph dashboard` | Interactive menu (current behavior) |
| `ralph -p <proj> note <ws> "text"` | Add note to workstream |

### Implementation ✅
1. Add `detect_workstream_issues()` - identify stuck/error/complete states
2. Add `get_last_progress()` - extract context from logs
3. Add `cmd_note()` - store notes in `~/.ralph/state/<project>/<workstream>/note`
4. Add `cmd_status_global()` - non-interactive status display
5. Update command routing

---

## Part 2: Live Progress Streaming ✅

### Problem
When Ralph spawns workstreams, the parent (your Claude session) can't see what's happening without manually attaching to tmux.

### Solution
Real-time progress events streamed to parent:

```
┌─ ralph/web-dashboard ─────────────────────────────────────────────────────────
│ Iteration 12/20 | $3.45 | 1.2M tokens | 45m elapsed
│ Current: Adding authentication middleware
│ Last: Created login component
│ Progress: ████████░░░░░░░░ 60%
└───────────────────────────────────────────────────────────────────────────────

┌─ ralph/api-refactor ──────────────────────────────────────────────────────────
│ Iteration 8/15 | $1.23 | 543K tokens | 22m elapsed
│ NEEDS_INPUT: Should I use REST or GraphQL for the new endpoints?
│ Progress: ████████░░░░░░░░ 53%
└───────────────────────────────────────────────────────────────────────────────
```

### Architecture

```
                    ┌──────────────┐
                    │ Parent Shell │ ← `ralph watch` or `/ralph` skill
                    │  (Claude)    │
                    └──────┬───────┘
                           │ reads
                           ▼
              ┌────────────────────────┐
              │ ~/.ralph/events/stream │  ← append-only event log
              └────────────────────────┘
                           ▲ writes
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────┴───────┐ ┌────┴────┐ ┌───────┴───────┐
    │ Workstream 1  │ │ WS 2    │ │ Workstream 3  │
    │ (tmux/claude) │ │         │ │               │
    └───────────────┘ └─────────┘ └───────────────┘
```

### Event Format (JSONL)
```json
{"ts":"2026-01-14T10:30:00Z","project":"ralph","ws":"web-dashboard","event":"iteration","iter":12,"max":20,"cost":3.45,"tokens_in":1000000,"tokens_out":200000}
{"ts":"2026-01-14T10:30:01Z","project":"ralph","ws":"web-dashboard","event":"progress","msg":"Adding authentication middleware"}
{"ts":"2026-01-14T10:30:02Z","project":"myapp","ws":"api-refactor","event":"needs_input","question":"Should I use REST or GraphQL?"}
```

### Commands
| Command | Behavior |
|---------|----------|
| `ralph watch` | Live TUI showing all workstream progress |
| `ralph watch <project>` | Filter to one project |
| `ralph watch --json` | Raw JSONL stream (for piping) |

### Implementation ✅
1. **ralph-loop.sh changes:**
   - Add `emit_event()` function that appends to `~/.ralph/events/stream`
   - Emit events at: iteration start, iteration end, status change, NEEDS_INPUT
   - Include: timestamp, project, workstream, iteration, cost, tokens, progress message

2. **New `ralph watch` command:**
   - Read `~/.ralph/events/stream` using `tail -f`
   - Format events into human-readable boxes
   - Auto-refresh display (no screen clear, use ANSI cursor control)

3. **Event cleanup:**
   - Rotate/truncate event stream periodically
   - Or use per-workstream event files: `~/.ralph/state/<proj>/<ws>/events`

---

## Part 3: Workstream Dependencies & Orchestration ✅

### Problem
Want to spawn multiple related workstreams that have dependencies (e.g., "auth" must finish before "dashboard").

### Solution
Define workstreams with dependencies in a workflow file:

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

### Execution Model
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

### Commands
| Command | Behavior |
|---------|----------|
| `ralph run <workflow.yaml>` | Execute workflow with dependency resolution |
| `ralph run <workflow.yaml> --dry-run` | Show execution plan |
| `ralph workflows` | List defined workflows |

### Implementation ✅
1. **Workflow parser:**
   - Parse YAML workflow definitions
   - Build dependency graph
   - Detect cycles

2. **Orchestrator (`ralph run`):**
   - Start all workstreams with no dependencies
   - Watch for completions
   - Start dependent workstreams when deps are met
   - Track overall workflow status

3. **Integration with `ralph watch`:**
   - Show workflow-level progress
   - Highlight blocked workstreams and what they're waiting for

---

## Implementation Phases (ALL COMPLETE)

### Phase 1: Status + Diagnostics + Notes (bin/ralph) ✅
1. Add `detect_workstream_issues()` function
2. Add `get_last_progress()` function
3. Add `cmd_note()` command
4. Add `cmd_status_global()` command
5. Update command routing
6. Update help text

### Phase 2: Live Progress Streaming ✅
7. Modify ralph-loop.sh to emit events
8. Add event file management
9. Add `ralph watch` command with TUI formatting
10. Test event streaming end-to-end

### Phase 3: Workflow Dependencies ✅
11. Create workflow YAML schema
12. Add workflow parser
13. Add `ralph run` orchestrator command
14. Add `ralph workflows` listing
15. Integrate with watch for workflow-level view

### Phase 4: Polish ✅
16. Update CLAUDE.md documentation
17. Update /ralph skill to use new features
18. Test all combinations

---

## Files Modified

**bin/ralph** (~2500 lines after changes):
- Added diagnostic functions (~50 lines)
- Added `cmd_note()` (~30 lines)
- Added `cmd_status_global()` (~100 lines)
- Added `cmd_watch()` (~150 lines)
- Added `cmd_run_workflow()` (~200 lines)
- Updated routing

**bin/ralph-loop.sh** (~850 lines after changes):
- Added `emit_event()` function (~30 lines)
- Added event emission at key points (~20 lines)

**CLAUDE.md**:
- Documented new commands
- Added workflow examples

---

## Storage Changes

```
~/.ralph/
├── events/
│   └── stream               # Global event stream (JSONL)
├── workflows/               # Workflow definitions
│   └── <name>.yaml
├── state/<project>/<workstream>/
│   ├── note                 # Workstream note (NEW)
│   └── events               # Per-workstream events (optional)
```

---

## Verification (ALL PASSED)

1. ✅ **Status view**: `ralph` shows table + diagnostics + notes
2. ✅ **Notes**: `ralph -p proj note ws "text"` works
3. ✅ **Watch**: `ralph watch` shows live updates from running workstreams
4. ✅ **Workflow**: `ralph run workflow.yaml` orchestrates dependencies correctly
5. ✅ **Integration**: Parent Claude can see progress and intervene if needed
