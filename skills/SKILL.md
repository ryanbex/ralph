---
name: ralph
description: >
  Global autonomous AI development orchestrator. Use when user mentions:
  autonomous development, parallel agents, ralph, workstreams,
  "run this in background", "work on this autonomously",
  multiple concurrent tasks, AI-driven development loops,
  multi-repo projects, global workstreams.
allowed-tools: Bash, Read, Glob
user-invocable: true
---

# Ralph - Global Multi-Repo Autonomous Development Orchestrator

Ralph runs parallel autonomous Claude Code sessions using git worktrees
and tmux for persistence. Each workstream works independently on its
own branch without conflicts. Ralph works globally across all your projects.

## Installation

Ralph is installed at `~/.ralph/` with:
- `~/.ralph/bin/ralph` - Global CLI (add to PATH)
- `~/.ralph/bin/ralph-loop.sh` - Core iteration loop
- `~/.ralph/projects/` - Project registry (YAML configs)
- `~/.ralph/workstreams/` - All workstream configs
- `~/.ralph/config.yaml` - Global configuration

Add to PATH:
```bash
export PATH="$HOME/.ralph/bin:$PATH"
```

## Quick Commands

| Command | What It Does |
|---------|--------------|
| `ralph` | Open global interactive dashboard |
| `ralph -p <project>` | Project-specific dashboard |
| `ralph projects` | List all registered projects |
| `ralph projects add` | Register current directory as project |
| `ralph projects add --multi-repo` | Register multi-repo project |
| `ralph -p <project> start <ws> [n]` | Start workstream (n iterations) |
| `ralph -p <project> stop <ws>` | Stop a workstream |
| `ralph -p <project> status` | Show workstreams for project |
| `ralph -p <project> attach <ws>` | Watch live (Ctrl-b d to detach) |
| `ralph -p <project> answer <ws>` | Answer pending question |
| `ralph -p <project> cleanup <ws>` | Merge and remove worktree |
| `ralph recover` | Recover orphaned workstreams |

## Project Auto-Detection

When inside a registered project directory, you can omit `-p`:
```bash
cd ~/git/pilates
ralph start auth 20    # Automatically detects pilates project
ralph status           # Shows pilates workstreams
```

## How It Works

1. **Project Registry**: Projects are registered in `~/.ralph/projects/`
   - Single-repo: Standard git repository
   - Multi-repo: Directory containing multiple git repos

2. **Worktrees**: Each workstream gets its own git worktree
   - Single-repo: `../<project>-<workstream>/`
   - Multi-repo: `../<project>-<workstream>/<repo>/` for each repo

3. **Branches**: Each worktree uses branch `ralph/<workstream>`

4. **tmux**: Processes run in `ralph-<project>-<workstream>` sessions

5. **Iteration Loop**: Each iteration:
   - Reads workstream config from `~/.ralph/workstreams/<project>/<ws>/`
   - Pipes PROMPT.md + PROGRESS.md to `claude --dangerously-skip-permissions`
   - Commits any changes (all repos for multi-repo)
   - Checks for stop signals, questions, completion
   - Sends Bark push notifications for important events

## Multi-Repo Projects

For projects with multiple git repositories:

```bash
# Register a multi-repo project
cd ~/git/work/superfunnel
ralph projects add --multi-repo

# This auto-detects repos in subdirectories:
# - frontend/
# - backend-api/
# - backend-workers/
# - infrastructure/

# Start a workstream that spans all repos
ralph -p superfunnel start fullstack-auth 30

# Creates unified worktree:
# ~/git/work/superfunnel-fullstack-auth/
#   frontend/          (worktree on ralph/fullstack-auth)
#   backend-api/       (worktree on ralph/fullstack-auth)
#   backend-workers/   (worktree on ralph/fullstack-auth)
#   infrastructure/    (worktree on ralph/fullstack-auth)
```

## Starting a Workstream

```bash
# Register project if not done
ralph projects add

# Create workstream config
mkdir -p ~/.ralph/workstreams/<project>/<workstream>
# Write PROMPT.md and optionally PROGRESS.md

# Start the workstream
ralph -p <project> start <workstream> 20
```

## Checking Status

```bash
# Global status (all projects)
ralph

# Project-specific status
ralph -p pilates status

# Check specific workstream progress
cat ~/.ralph/workstreams/pilates/auth/PROGRESS.md
```

## Answering Questions

If Ralph needs input (status shows NEEDS_INPUT):

```bash
ralph -p pilates answer auth
# Enter your answer when prompted
```

## When Ralph Finishes

Merge the workstream and cleanup:

```bash
ralph -p pilates cleanup auth
```

For multi-repo projects, this atomically merges all repos.

## Creating a New Workstream

Create the prompt file at `~/.ralph/workstreams/<project>/<workstream>/PROMPT.md`:

```markdown
# Ralph Workstream: <name>

## Objective
<Clear description of what to accomplish>

## Scope
- Include X
- Exclude Y

## Instructions
1. Read PROGRESS.md to see what's done
2. Pick next task
3. Implement minimal changes
4. Run build/tests
5. Update PROGRESS.md
6. If all done, write "## Status: COMPLETE"

## Constraints
- One logical change per iteration
- Always verify changes compile
- Follow existing patterns
```

See [WORKFLOWS.md](WORKFLOWS.md) for common workstream templates.

## Push Notifications

Ralph sends Bark push notifications for:
- Stuck (no progress for 3+ iterations)
- Question (needs user input)
- Complete (workstream finished)
- Error (iteration failed)
- Recovered (auto-recovered orphaned workstream)

Configure in `~/.ralph/config.yaml`:
```yaml
notifications:
  bark:
    enabled: true
    url: "https://api.day.app/YOUR_KEY"
```

## Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| RUNNING | Actively processing |
| STOPPED | Gracefully stopped |
| NEEDS_INPUT | Question pending |
| COMPLETE | All tasks finished |
| ERROR | Last iteration failed |
| STUCK | No progress detected |

## Architecture

```
~/.ralph/                          # Global Ralph home
  bin/ralph                        # CLI
  bin/ralph-loop.sh                # Iteration loop
  config.yaml                      # Global config
  projects/                        # Project registry
    pilates.yaml                   # Single-repo project
    superfunnel.yaml               # Multi-repo project
  workstreams/                     # All workstream configs
    pilates/
      auth/
        PROMPT.md
        PROGRESS.md
  state/                           # Runtime state
    pilates/
      auth/
        status
        iteration
        pid
        question
  logs/                            # Persistent logs
    pilates/
      auth/
        2026-01-12T10-30-00.log

~/git/pilates/                     # Original repo
~/git/pilates-auth/                # Worktree for auth workstream

~/git/superfunnel/                 # Multi-repo project
  frontend/
  backend-api/
~/git/superfunnel-auth/            # Multi-repo worktree
  frontend/                        # Worktree of frontend repo
  backend-api/                     # Worktree of backend-api repo
```

## Troubleshooting

### tmux session not found
The workstream may have finished or crashed. Check:
```bash
ralph -p pilates status
cat ~/.ralph/workstreams/pilates/auth/PROGRESS.md
ralph recover  # Auto-recover orphaned workstreams
```

### Merge conflicts on cleanup
For single-repo, resolve manually then retry cleanup.
For multi-repo, cleanup will fail if any repo has conflicts.
Resolve conflicts in each repo, then:
```bash
git worktree remove <path>
git branch -d ralph/<workstream>
```

### Ralph stuck (no progress)
Check if waiting for input:
```bash
cat ~/.ralph/state/pilates/auth/question
ralph -p pilates answer auth
```
Or attach to see what's happening:
```bash
ralph -p pilates attach auth
```

### Project not found
Register the project first:
```bash
cd ~/git/myproject
ralph projects add
```
