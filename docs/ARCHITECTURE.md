# Ralph Architecture

## Overview

Ralph is an autonomous AI development orchestrator that enables parallel, persistent Claude Code sessions working on isolated git branches. It solves the problem of context limits and session timeouts by running multiple focused workstreams simultaneously.

```
┌─────────────────────────────────────────────────────────────────┐
│                         RALPH ORCHESTRATOR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Workstream  │  │  Workstream  │  │  Workstream  │          │
│  │    "auth"    │  │    "api"     │  │    "ui"      │          │
│  │              │  │              │  │              │          │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │
│  │  │ Claude │  │  │  │ Claude │  │  │  │ Claude │  │          │
│  │  │  Code  │  │  │  │  Code  │  │  │  │  Code  │  │          │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │
│  │      │       │  │      │       │  │      │       │          │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │
│  │  │ tmux   │  │  │  │ tmux   │  │  │  │ tmux   │  │          │
│  │  │session │  │  │  │session │  │  │  │session │  │          │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │
│  │      │       │  │      │       │  │      │       │          │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │
│  │  │  git   │  │  │  │  git   │  │  │  │  git   │  │          │
│  │  │worktree│  │  │  │worktree│  │  │  │worktree│  │          │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │
│  │              │  │              │  │              │          │
│  │ ralph/auth   │  │ ralph/api    │  │ ralph/ui     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI (`~/.ralph/bin/ralph`)

The main command-line interface (~1200 lines of Bash). Handles:

- **Project Registry**: Add, list, remove, update projects
- **Workstream Management**: Start, stop, status, attach, cleanup
- **Interactive Dashboard**: TUI for monitoring all workstreams
- **Recovery**: Detect and restart orphaned workstreams
- **Server Management**: Start/stop REST API

Key functions:
```bash
cmd_start()      # Create worktree, start tmux session
cmd_stop()       # Send stop signal to workstream
cmd_cleanup()    # Merge branch, remove worktree
cmd_recover()    # Find and restart orphans
detect_project() # Auto-detect project from cwd
```

### 2. Iteration Loop (`~/.ralph/bin/ralph-loop.sh`)

The core iteration engine (~300 lines of Bash). Each iteration:

1. **Check stop signals** - Global, project, or workstream level
2. **Check for user answers** - If question was pending
3. **Build prompt** - Combine PROMPT.md + PROGRESS.md + context
4. **Run Claude** - Pipe to `claude --dangerously-skip-permissions`
5. **Check completion** - Look for `## Status: COMPLETE`
6. **Check questions** - Look for `NEEDS_INPUT:`
7. **Commit changes** - Auto-commit with workstream prefix
8. **Detect stuck** - Hash PROGRESS.md, notify if unchanged

```bash
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    # Build prompt
    {
        cat "$PROMPT_FILE"
        echo "---"
        echo "## Current Progress"
        cat "$PROGRESS_FILE"
        echo "---"
        echo "## Iteration Info"
        echo "Iteration: $ITERATION of $MAX_ITERATIONS"
    } | claude --dangerously-skip-permissions

    # Commit changes
    git add -A && git commit -m "chore: iteration $ITERATION"
done
```

### 3. Project Registry (`~/.ralph/projects/`)

YAML files defining registered projects:

**Single-repo:**
```yaml
name: pilates
type: single-repo
root: /Users/ryan/git/pilates
base_branch: main
```

**Multi-repo:**
```yaml
name: superfunnel
type: multi-repo
root: /Users/ryan/git/superfunnel
base_branch: main
repos:
  - path: frontend
  - path: backend-api
  - path: backend-workers
```

### 4. Workstream Config (`~/.ralph/workstreams/<project>/<ws>/`)

Each workstream has:

- `PROMPT.md` - Task instructions (what to do)
- `PROGRESS.md` - Current state (what's done)

The iteration loop reads both and pipes to Claude.

### 5. State Management (`~/.ralph/state/<project>/<ws>/`)

Runtime state files:

| File | Purpose |
|------|---------|
| `status` | RUNNING, STOPPED, NEEDS_INPUT, COMPLETE, ERROR, STUCK |
| `iteration` | Current iteration number |
| `pid` | Process ID of ralph-loop.sh |
| `question` | Pending question text |
| `answer` | User's answer (triggers continuation) |

### 6. REST API Server (`~/.ralph/server/`)

Express.js server for remote management:

```
GET  /projects                           # List all projects
GET  /projects/:name                     # Get project details
GET  /projects/:name/workstreams         # List workstreams
GET  /projects/:name/workstreams/:ws     # Get workstream status
POST /projects/:name/workstreams/:ws/stop   # Stop workstream
POST /projects/:name/workstreams/:ws/answer # Answer question
GET  /projects/:name/workstreams/:ws/logs   # Stream logs
GET  /health                             # Health check
```

Authentication via `X-Ralph-Key` header.

## Data Flow

### Starting a Workstream

```
User: ralph -p project start feature 20
                    │
                    ▼
        ┌─────────────────────┐
        │  1. Create Worktree │
        │  git worktree add   │
        │  ../project-feature │
        │  -b ralph/feature   │
        └─────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  2. Copy Config     │
        │  ~/.ralph/workstreams│
        │  /project/feature/  │
        │  → worktree         │
        └─────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  3. Start tmux      │
        │  tmux new-session   │
        │  -d -s ralph-       │
        │  project-feature    │
        └─────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  4. Run Loop        │
        │  ralph-loop.sh      │
        │  project feature    │
        └─────────────────────┘
```

### Iteration Cycle

```
┌─────────────────────────────────────────────────────────┐
│                    ITERATION LOOP                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐                                           │
│  │  Start   │                                           │
│  └────┬─────┘                                           │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────────────┐    Yes    ┌──────────────────┐   │
│  │  Stop Signal?    │──────────▶│      Exit        │   │
│  └────────┬─────────┘           └──────────────────┘   │
│           │ No                                          │
│           ▼                                              │
│  ┌──────────────────┐    Yes    ┌──────────────────┐   │
│  │  Answer Ready?   │──────────▶│  Append to       │   │
│  └────────┬─────────┘           │  PROGRESS.md     │   │
│           │ No                   └────────┬─────────┘   │
│           ▼                               │              │
│  ┌──────────────────┐◀───────────────────┘              │
│  │  Build Prompt    │                                   │
│  │  PROMPT.md +     │                                   │
│  │  PROGRESS.md     │                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐                                   │
│  │  Pipe to Claude  │                                   │
│  │  --dangerously-  │                                   │
│  │  skip-permissions│                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐    Yes    ┌──────────────────┐   │
│  │  COMPLETE in     │──────────▶│  Exit Success    │   │
│  │  PROGRESS.md?    │           └──────────────────┘   │
│  └────────┬─────────┘                                   │
│           │ No                                          │
│           ▼                                              │
│  ┌──────────────────┐    Yes    ┌──────────────────┐   │
│  │  NEEDS_INPUT?    │──────────▶│  Wait for Answer │   │
│  └────────┬─────────┘           │  Send Bark Push  │   │
│           │ No                   └────────┬─────────┘   │
│           ▼                               │              │
│  ┌──────────────────┐                    │              │
│  │  Commit Changes  │◀───────────────────┘              │
│  │  git add -A      │                                   │
│  │  git commit      │                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐                                   │
│  │  Check Stuck     │──Notify if no progress──────────▶│
│  │  (hash check)    │                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐    Yes    ┌──────────────────┐   │
│  │  Max Iterations? │──────────▶│  Exit Complete   │   │
│  └────────┬─────────┘           └──────────────────┘   │
│           │ No                                          │
│           └─────────────────────────────────────────────┤
│                         Loop                             │
└─────────────────────────────────────────────────────────┘
```

## Multi-Repo Architecture

For projects with multiple git repositories:

```
Original Project Structure:
~/git/superfunnel/
├── frontend/           (separate git repo)
├── backend-api/        (separate git repo)
├── backend-workers/    (separate git repo)
└── infrastructure/     (separate git repo)

Unified Workstream Worktree:
~/git/superfunnel-auth/
├── frontend/           (worktree of frontend, ralph/auth branch)
├── backend-api/        (worktree of backend-api, ralph/auth branch)
├── backend-workers/    (worktree of backend-workers, ralph/auth branch)
└── infrastructure/     (worktree of infrastructure, ralph/auth branch)
```

### Multi-Repo Commit Flow

```bash
commit_multi_repo() {
    for repo in $repos; do
        pushd "$repo"
        if git status --porcelain | grep -q .; then
            git add -A
            git commit -m "chore(${WORKSTREAM}): iteration $ITERATION"
        fi
        popd
    done
}
```

### Atomic Multi-Repo Cleanup

1. Check ALL repos for uncommitted changes
2. Dry-run merge in ALL repos
3. Only if all pass: merge all repos
4. Remove all worktrees
5. Delete all branches

## Notification System

### Bark Push Notifications

Simple curl-based iOS push:

```bash
notify() {
    local title="$1"
    local message="$2"
    local bark_url=$(get_bark_url)

    if [[ -n "$bark_url" ]]; then
        local encoded=$(echo "$message" | jq -sRr @uri)
        curl -s "${bark_url}/${title}/${encoded}" &
    fi
}
```

Events:
- `stuck` - No progress for 3+ iterations
- `question` - Ralph needs user input
- `complete` - Workstream finished
- `error` - Iteration failed
- `recovered` - Orphaned workstream restarted

## Recovery System

Detects orphaned workstreams:
- State file says `RUNNING`
- But tmux session doesn't exist

```bash
cmd_recover() {
    for state_dir in "$STATE_BASE"/*/*; do
        status=$(cat "$state_dir/status" 2>/dev/null)
        session="ralph-$project-$workstream"

        if [[ "$status" == "RUNNING" ]] && ! tmux has-session -t "$session" 2>/dev/null; then
            # Orphan detected - restart or mark stopped
        fi
    done
}
```

## Security Considerations

1. **API Key Auth**: REST API requires `X-Ralph-Key` header
2. **Local Only**: Server binds to localhost by default
3. **VPN Access**: Users access via VPN (network security)
4. **No Secrets in Config**: API keys generated, not hardcoded
5. **Worktree Isolation**: Each workstream has separate branch

## Performance

- **Parallel Execution**: Workstreams run independently
- **Low Overhead**: tmux + bash minimal resource usage
- **Efficient Commits**: Only commit if changes detected
- **Hash-Based Stuck Detection**: MD5 of PROGRESS.md

## Extensibility

### Custom Notifications

Replace Bark with any push service:

```bash
notify() {
    # Slack
    curl -X POST -H 'Content-type: application/json' \
         --data "{\"text\":\"$1: $2\"}" \
         "$SLACK_WEBHOOK_URL"

    # Pushover
    curl -s --form-string "token=$PUSHOVER_TOKEN" \
         --form-string "user=$PUSHOVER_USER" \
         --form-string "message=$2" \
         https://api.pushover.net/1/messages.json
}
```

### Custom Actions

Add post-iteration hooks:

```bash
# In ralph-loop.sh
if [[ -f "$WORKSTREAM_DIR/post-iteration.sh" ]]; then
    source "$WORKSTREAM_DIR/post-iteration.sh"
fi
```
