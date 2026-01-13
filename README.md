# Ralph

**Autonomous AI Development Orchestrator**

Ralph runs parallel autonomous Claude Code sessions using git worktrees and tmux for persistence. Each workstream works independently on its own branch without conflicts. Supports both single-repo and multi-repo projects.

> Inspired by [Anthropic's "How we built multi-file editing"](https://www.anthropic.com/engineering/claude-code-multi-file-editing) and the original Ralph concept for autonomous AI agents.

## Features

- **Parallel Workstreams**: Run multiple autonomous Claude sessions simultaneously
- **Git Worktrees**: Isolated branches prevent conflicts between workstreams
- **Multi-Repo Support**: Single workstream spans multiple repositories
- **tmux Persistence**: Sessions survive terminal close and SSH disconnects
- **Push Notifications**: Bark (iOS) notifications for questions, completion, errors
- **REST API**: Manage workstreams from your phone via VPN
- **Auto-Recovery**: Detects and restarts orphaned workstreams after crashes
- **Claude Code Skill**: Natural language control via Claude Code CLI

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ralph.git
cd ralph

# Run the installer
./install.sh

# Add to your shell profile (~/.zshrc or ~/.bashrc)
export PATH="$HOME/.ralph/bin:$PATH"

# Restart your shell or source your profile
source ~/.zshrc
```

### Basic Usage

```bash
# Register your project
cd ~/your-project
ralph projects add

# Create a workstream
mkdir -p ~/.ralph/workstreams/your-project/feature-x
cat > ~/.ralph/workstreams/your-project/feature-x/PROMPT.md << 'EOF'
# Ralph Workstream: feature-x

## Objective
Implement feature X

## Tasks
1. [ ] Create database model
2. [ ] Add API endpoint
3. [ ] Build UI component

## Instructions
1. Read PROGRESS.md
2. Pick next task
3. Implement with minimal changes
4. Update PROGRESS.md
5. If done, write "## Status: COMPLETE"
EOF

# Start Ralph
ralph -p your-project start feature-x 20

# Monitor progress
ralph -p your-project status
ralph -p your-project attach feature-x  # Ctrl-b d to detach

# When done
ralph -p your-project cleanup feature-x
```

## Commands

| Command | Description |
|---------|-------------|
| `ralph` | Interactive dashboard (all projects) |
| `ralph -p <project>` | Project-specific dashboard |
| `ralph projects` | List registered projects |
| `ralph projects add` | Register current directory |
| `ralph projects add --multi-repo` | Register multi-repo project |
| `ralph -p <project> start <ws> [n]` | Start workstream (n iterations) |
| `ralph -p <project> stop <ws>` | Stop workstream gracefully |
| `ralph -p <project> status` | Show workstream status |
| `ralph -p <project> attach <ws>` | Watch live output |
| `ralph -p <project> answer <ws>` | Answer pending question |
| `ralph -p <project> cleanup <ws>` | Merge and remove worktree |
| `ralph recover` | Find orphaned workstreams |
| `ralph server start` | Start REST API server |

## Configuration

After installation, edit `~/.ralph/config.yaml`:

```yaml
# Default settings
defaults:
  max_iterations: 20
  base_branch: main

# Push notifications (optional)
notifications:
  bark:
    enabled: true
    url: "https://api.day.app/YOUR_BARK_KEY"
    events: [stuck, question, complete, error]

# REST API server (optional)
server:
  port: 3847
  api_key: "your-generated-key"
```

### Bark Notifications (iOS)

1. Install [Bark](https://apps.apple.com/us/app/bark-simple-push-notifications/id1403753865) on your iPhone
2. Copy your Bark URL from the app
3. Update `~/.ralph/config.yaml` with your URL

### REST API (Remote Access)

```bash
# Generate API key
ralph server key

# Start server
ralph server start

# Access via VPN from phone
curl -H "X-Ralph-Key: YOUR_KEY" http://your-machine:3847/projects
```

## Multi-Repo Projects

For projects with multiple git repositories:

```bash
cd ~/work/my-platform  # Contains: frontend/, backend/, infrastructure/
ralph projects add --multi-repo

# Start a full-stack workstream
ralph -p my-platform start auth-feature 30

# Creates unified worktree:
# ~/work/my-platform-auth-feature/
#   frontend/          (worktree on ralph/auth-feature)
#   backend/           (worktree on ralph/auth-feature)
#   infrastructure/    (worktree on ralph/auth-feature)
```

## Claude Code Integration

Ralph includes a Claude Code skill for natural language control:

```bash
# Copy skill files to your Claude Code skills directory
cp -r skills/* ~/.claude/skills/ralph/
```

Then in Claude Code:
```
> Use Ralph to work on the authentication feature autonomously
```

## Directory Structure

```
~/.ralph/
├── bin/
│   ├── ralph              # Main CLI
│   └── ralph-loop.sh      # Iteration loop
├── config.yaml            # Global configuration
├── projects/              # Project registry (YAML files)
├── workstreams/           # Workstream configs (PROMPT.md, PROGRESS.md)
├── state/                 # Runtime state (status, iteration, pid)
├── logs/                  # Persistent logs
└── server/                # REST API server
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Philosophy](docs/PHILOSOPHY.md) - Design principles and rationale
- [Commands Reference](skills/COMMANDS.md) - Detailed command documentation
- [Workflows](skills/WORKFLOWS.md) - Common workflow templates

## Requirements

- macOS or Linux
- Bash 4+
- Git
- tmux
- [Claude Code CLI](https://claude.ai/claude-code) (`claude` command)
- Node.js 18+ (for REST API server)
- jq (for JSON processing)

## License

MIT

## Contributing

Contributions welcome! Please read the [Philosophy](docs/PHILOSOPHY.md) first to understand the design principles.

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and Claude Code
- The original Ralph concept for autonomous AI development loops
