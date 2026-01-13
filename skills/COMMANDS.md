# Ralph Command Reference

## Interactive Mode

```bash
ralph
```

Opens global TUI dashboard showing all projects and their workstreams with:
- Project grouping
- Status indicators (RUNNING, STOPPED, NEEDS_INPUT, COMPLETE, ERROR, STUCK)
- Progress bars
- Iteration counts
- Pending questions

Numbered menu for actions:
1. Select project to manage
2. Start new workstream
3. Answer pending question
4. Stop workstream
5. Attach to workstream
6. Cleanup finished workstream
q. Quit

### Project-Specific Dashboard

```bash
ralph -p <project>
```

Shows dashboard for a single project only.

---

## Project Management

### ralph projects

List all registered projects with their types and paths.

```bash
ralph projects
```

**Example output:**
```
Ralph Projects
==============

  pilates (single-repo)
    Root: /Users/ryanbeck/bin/git/personal/pilates

  superfunnel (multi-repo)
    Root: /Users/ryanbeck/bin/git/work/superfunnel
    Repos: frontend, backend-api, backend-workers, infrastructure
```

---

### ralph projects add [--multi-repo]

Register current directory as a project.

**Single-repo (default):**
```bash
cd ~/git/pilates
ralph projects add
```

Creates `~/.ralph/projects/pilates.yaml`:
```yaml
name: pilates
type: single-repo
root: /Users/ryanbeck/bin/git/personal/pilates
base_branch: main
```

**Multi-repo:**
```bash
cd ~/git/work/superfunnel
ralph projects add --multi-repo
```

Auto-detects git repos in subdirectories and creates:
```yaml
name: superfunnel
type: multi-repo
root: /Users/ryanbeck/bin/git/work/superfunnel
base_branch: main
repos:
  - path: frontend
  - path: backend-api
  - path: backend-workers
  - path: infrastructure
```

---

### ralph projects remove <name>

Unregister a project. Does not delete files, only removes from registry.

```bash
ralph projects remove pilates
```

---

### ralph projects update <name>

Re-detect repos for a multi-repo project (after adding new repos).

```bash
ralph projects update superfunnel
```

---

## Workstream Operations

### ralph -p <project> start <workstream> [iterations]

Creates git worktree(s) and starts Ralph in tmux session.

**Arguments:**
- `project` - Project name from registry (or auto-detected from cwd)
- `workstream` - Workstream identifier (e.g., `auth`, `api`, `bugfix`)
- `iterations` - Maximum iterations (default: 20)

**What it does:**
1. Creates worktree at `../<project>-<workstream>/`
2. For multi-repo: creates worktree for each repo inside unified directory
3. Creates branch `ralph/<workstream>` in each repo
4. Copies workstream config from `~/.ralph/workstreams/<project>/<workstream>/`
5. Starts tmux session `ralph-<project>-<workstream>`
6. Runs `ralph-loop.sh` in the worktree

**Prerequisites:**
- Project must be registered (`ralph projects add`)
- `~/.ralph/workstreams/<project>/<workstream>/PROMPT.md` must exist

**Examples:**
```bash
# Explicit project
ralph -p pilates start auth 30

# Auto-detect project from cwd
cd ~/git/pilates
ralph start auth 30

# Multi-repo project
ralph -p superfunnel start fullstack-auth 50
```

---

### ralph -p <project> stop <workstream>

Sends stop signal. Ralph exits gracefully after current iteration.

```bash
ralph -p pilates stop auth
```

**Stop all workstreams in a project:**
```bash
ralph -p pilates stop --all
```

**Stop everything globally:**
```bash
ralph stop --all
```

---

### ralph -p <project> status

Lists all workstreams for a project with status info.

**Output includes:**
- Workstream name
- Status (RUNNING, STOPPED, NEEDS_INPUT, COMPLETE, ERROR, STUCK)
- Current iteration
- Pending questions (if any)

**Example output:**
```
Ralph Workstreams: pilates
==========================

  auth
    Status: RUNNING
    Iteration: 12/30

  gaps
    Status: NEEDS_INPUT
    Iteration: 8/20
    Question: Should I use PostgreSQL or SQLite?

  refactor
    Status: COMPLETE
    Iteration: 15/20
```

---

### ralph -p <project> attach <workstream>

Attaches to tmux session for live viewing.

**Controls:**
- `Ctrl-b d` - Detach (keeps running)
- `Ctrl-c` - Stop Ralph (in that session)

```bash
ralph -p pilates attach auth
# Watch live output...
# Press Ctrl-b d to detach
```

---

### ralph -p <project> answer <workstream>

Answers pending question for a workstream.

**What it does:**
1. Reads question from `~/.ralph/state/<project>/<workstream>/question`
2. Displays the question
3. Prompts for answer
4. Writes answer to state file
5. Ralph incorporates answer in next iteration

```bash
ralph -p pilates answer auth
# Question: Should I use JWT or session-based auth?
# > Use JWT with short expiry
```

---

### ralph -p <project> cleanup <workstream>

Merges workstream branch(es) and removes worktree(s).

**Single-repo:**
1. Kills tmux session if running
2. Checks for uncommitted changes (warns if present)
3. Merges `ralph/<workstream>` into base branch
4. Removes git worktree
5. Deletes `ralph/<workstream>` branch

**Multi-repo (atomic):**
1. Checks ALL repos for uncommitted changes
2. Checks ALL repos for merge conflicts (dry-run)
3. Only if all clear: merges ALL repos
4. Removes all worktrees
5. Deletes all branches

```bash
ralph -p pilates cleanup auth
# Merging ralph/auth...
# Merge successful!
# Removing worktree...
# Cleanup complete!
```

---

### ralph -p <project> logs <workstream>

View logs for a workstream.

```bash
# Most recent log
ralph -p pilates logs auth

# Follow live
ralph -p pilates logs auth -f

# All logs
ls ~/.ralph/logs/pilates/auth/
```

---

## Recovery

### ralph recover

Detects and recovers orphaned workstreams.

An orphan is when:
- State file says RUNNING
- But tmux session doesn't exist
- (Usually after reboot or crash)

**What it does:**
1. Scans all state directories
2. Finds orphans
3. Either restarts them or marks as STOPPED
4. Sends Bark notification

```bash
ralph recover
# Found 2 orphaned workstreams:
#   pilates/auth - Restarting...
#   superfunnel/api - Marking stopped (worktree missing)
# Recovery complete!
```

---

## Global Commands

### ralph help

Shows usage information and available commands.

### ralph version

Shows Ralph version.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `RALPH_HOME` | `~/.ralph` | Ralph home directory |
| `MAX_ITERATIONS` | 20 | Default max iterations |

---

## File Locations

### Global Files

| File | Purpose |
|------|---------|
| `~/.ralph/config.yaml` | Global configuration |
| `~/.ralph/bin/ralph` | Main CLI |
| `~/.ralph/bin/ralph-loop.sh` | Iteration loop |

### Per-Project Files

| File | Purpose |
|------|---------|
| `~/.ralph/projects/<project>.yaml` | Project configuration |

### Per-Workstream Files

| File | Purpose |
|------|---------|
| `~/.ralph/workstreams/<project>/<ws>/PROMPT.md` | Task instructions |
| `~/.ralph/workstreams/<project>/<ws>/PROGRESS.md` | Progress tracking |
| `~/.ralph/state/<project>/<ws>/status` | Current status |
| `~/.ralph/state/<project>/<ws>/iteration` | Current iteration |
| `~/.ralph/state/<project>/<ws>/pid` | Process ID |
| `~/.ralph/state/<project>/<ws>/question` | Pending question |
| `~/.ralph/logs/<project>/<ws>/*.log` | Iteration logs |

---

## tmux Session Naming

Sessions are named: `ralph-<project>-<workstream>`

Examples:
- `ralph-pilates-auth`
- `ralph-superfunnel-fullstack-auth`

List all Ralph sessions:
```bash
tmux ls | grep ^ralph-
```
