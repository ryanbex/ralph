# Ralph - Claude Code Configuration

## Project Overview

Ralph is an autonomous AI development orchestrator that runs parallel Claude Code sessions using git worktrees and tmux for persistence. Each workstream works independently on its own branch without conflicts.

**Language**: Bash/Shell
**Purpose**: CLI tool for managing autonomous AI development workstreams

## Quick Commands

```bash
# Quick status with diagnostics (default)
ralph

# Interactive dashboard
ralph dashboard

# Register current project
ralph projects add

# Start a workstream (20 iterations)
ralph -p <project> start <workstream> 20

# Check all workstreams
ralph -p <project> status

# Watch live output
ralph -p <project> attach <workstream>

# Answer a question
ralph -p <project> answer <workstream>

# Stop gracefully
ralph -p <project> stop <workstream>

# Merge and cleanup
ralph -p <project> cleanup <workstream>

# Recover orphaned workstreams
ralph recover

# Prune stale workstream state
ralph prune [--dry-run]

# View workstream history (tokens, cost, duration)
ralph history [--all] [project]

# Workstream notes
ralph -p <project> note <ws> "context for later"
ralph notes                    # List all notes

# Live progress streaming
ralph watch                    # All workstreams
ralph watch <project>          # Filter by project
ralph watch --json             # Raw JSONL for piping

# Workflow orchestration (DAG dependencies)
ralph workflows                # List available workflows
ralph run <workflow> --dry-run # Preview execution plan
ralph run <workflow>           # Execute with auto-parallelism
```

## Custom Slash Commands

| Command | Description |
|---------|-------------|
| `/commit-push-pr` | Stage, commit, push, and create PR |
| `/debate` | Run principal engineer debate for technical decisions |
| `/security-audit` | Run security audit on shell scripts |
| `/verify` | Run shellcheck and syntax verification |

## Subagents

| Agent | Description | Model |
|-------|-------------|-------|
| `code-reviewer` | Reviews code changes for quality and security | sonnet |
| `security-auditor` | Deep security audit of shell scripts | opus |
| `principal-architect` | Architectural decision advocate | opus |
| `principal-security` | Security decision advocate | opus |
| `principal-dx` | Developer experience advocate | opus |
| `lead-architect` | Synthesizes decisions, makes final calls | opus |

## Code Style (Bash)

### Variables
```bash
# Always quote variables
"$variable"

# Use [[ ]] for conditionals
if [[ "$status" == "RUNNING" ]]; then

# Use parameter expansion
"${var:-default}"
```

### Functions
```bash
# Descriptive names with underscores
cmd_start() {
  local project="$1"
  local workstream="$2"
  # ...
}
```

### Error Handling
```bash
# Check command success
if ! git worktree add "$path" -b "$branch"; then
  error "Failed to create worktree"
  return 1
fi
```

### Indentation
- 2 spaces (no tabs)
- shfmt format: `shfmt -w -i 2 -ci`

## Architecture

### Directory Structure
```
~/.ralph/
├── bin/
│   ├── ralph              # Main CLI (~2500 lines)
│   └── ralph-loop.sh      # Iteration engine (~850 lines)
├── config.yaml            # Global config
├── projects/              # Project registrations
│   └── <project>.yaml
├── workstreams/           # Workstream configs
│   └── <project>/
│       └── <workstream>/
│           ├── PROMPT.md
│           └── PROGRESS.md
├── state/                 # Runtime state
│   └── <project>/
│       └── <workstream>/
│           ├── status
│           ├── iteration
│           ├── metrics.json   # Token usage, cost, timing
│           ├── pid
│           ├── question
│           ├── answer
│           └── note           # Workstream notes
├── events/                # Live progress streaming
│   └── stream             # JSONL event log (auto-rotating)
├── workflows/             # Workflow definitions
│   └── <name>.yaml        # DAG workflow specs
└── archive/               # Historical records
    └── history.json       # JSONL: all completed workstreams
```

### Core Loop
```
PROMPT.md + PROGRESS.md → claude --dangerously-skip-permissions → commit → repeat
```

### Key Files
- `bin/ralph` - Main CLI, all commands
- `bin/ralph-loop.sh` - Iteration loop engine
- `server/server.js` - REST API for remote management

## Security Guidelines

### Critical Checks
- [ ] All variables quoted in command contexts
- [ ] No eval with user input
- [ ] User paths validated (prevent traversal)
- [ ] Temp files use mktemp
- [ ] No secrets in code

### Common Vulnerabilities
```bash
# BAD: Command injection
eval "$user_input"

# GOOD: Validated input
if [[ "$workstream" =~ ^[a-zA-Z0-9_-]+$ ]]; then
```

## Testing

### Verification
```bash
# Shellcheck
shellcheck bin/ralph bin/ralph-loop.sh

# Syntax check
bash -n bin/ralph
bash -n bin/ralph-loop.sh
```

### Manual Testing
```bash
# Test workstream lifecycle
ralph projects add
ralph -p test start feature 5
ralph -p test status
ralph -p test attach feature
ralph -p test stop feature
ralph -p test cleanup feature
```

## Dependencies

- git (worktrees)
- tmux (session persistence)
- jq (JSON parsing)
- curl (notifications)
- Claude Code CLI
- Node.js 18+ (REST API only)

## Configuration

### ~/.ralph/config.yaml
```yaml
defaults:
  max_iterations: 20
  base_branch: main

notifications:
  bark:
    enabled: true
    url: "https://api.day.app/YOUR_KEY"

server:
  port: 3847
```

## Git Workflow

- Branch naming: `ralph/<workstream>`
- Commit format: `chore(<workstream>): iteration N`
- Workstream isolation via git worktrees
- Never force push main

## Workflow Orchestration

Define complex multi-workstream tasks with dependencies:

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
    depends_on: [auth, database]  # Waits for both

  - name: dashboard
    prompt: "Build dashboard UI"
    iterations: 25
    depends_on: [api]
```

Execution automatically parallelizes independent workstreams:
- `auth` and `database` start together (no dependencies)
- `api` starts when both complete
- `dashboard` starts when `api` completes

## Links

- [Architecture](docs/ARCHITECTURE.md)
- [Philosophy](docs/PHILOSOPHY.md)
- [Commands Reference](skills/COMMANDS.md)
- [Workflows](skills/WORKFLOWS.md)
