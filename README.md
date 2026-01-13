# Ralph

**Autonomous AI Development Orchestrator**

Ralph runs parallel autonomous Claude Code sessions using git worktrees and tmux for persistence. Each workstream works independently on its own branch without conflicts.

> Inspired by [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/) - the elegant `while :; do cat PROMPT.md | claude-code; done` pattern for autonomous AI development.

## The Core Idea

From the original Ralph:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

This implementation extends that pattern with:
- **Parallel workstreams** via git worktrees (no branch conflicts)
- **Session persistence** via tmux (survives terminal close)
- **Multi-repo support** (single workstream spans multiple repos)
- **Progress tracking** (PROGRESS.md maintains context across iterations)
- **Push notifications** (know when Ralph needs you)
- **Remote access** (manage from your phone via REST API)

## Quick Start

### Installation

```bash
git clone https://github.com/ryanbex/ralph.git
cd ralph
./install.sh

# Add to ~/.zshrc or ~/.bashrc
export PATH="$HOME/.ralph/bin:$PATH"
```

### Using Ralph with Claude Code

The primary way to interact with Ralph is through Claude Code. After installation, the Ralph skill is available:

```
You: Use Ralph to implement user authentication autonomously

Claude: I'll set up a Ralph workstream for authentication.
        First, let me register your project and create the workstream config...

        [Creates ~/.ralph/workstreams/myproject/auth/PROMPT.md]
        [Starts workstream with 30 iterations]

        Ralph is now running autonomously on the auth feature.
        You'll get a Bark notification when it completes or needs input.
```

### Example: Starting a Feature with Claude Code

```
You: I need to add a payment integration. Set up Ralph to work on it overnight.

Claude: I'll create a Ralph workstream for the payment integration.

        Setting up:
        1. Creating workstream config at ~/.ralph/workstreams/myproject/payments/
        2. Writing PROMPT.md with the payment integration tasks
        3. Starting Ralph with 50 iterations

        [Executes: ralph -p myproject start payments 50]

        Done! Ralph is working on:
        - Stripe API integration
        - Payment webhook handling
        - Invoice generation
        - Receipt emails

        Monitor with: ralph -p myproject status
        Watch live: ralph -p myproject attach payments

        I'll notify you via Bark when it completes or has questions.
```

### Example: Checking Progress

```
You: How's Ralph doing on the payments feature?

Claude: [Reads ~/.ralph/workstreams/myproject/payments/PROGRESS.md]

        Ralph has completed 23 of 50 iterations:

        ✅ Completed:
        - Stripe SDK integration
        - Payment intent creation
        - Webhook signature verification
        - Basic invoice model

        🔄 In Progress:
        - Receipt email templates

        📋 Remaining:
        - Refund handling
        - Subscription support

        No blockers. Estimated 10-15 more iterations to complete.
```

### Example: Answering Ralph's Questions

```
You: Ralph asked about the database - what does it need?

Claude: [Reads ~/.ralph/state/myproject/payments/question]

        Ralph is asking:
        "Should I use a separate payments table or add columns to the
        existing orders table? The orders table already has 15 columns."

        What's your preference?

You: Separate table, keep it normalized

Claude: [Writes answer to state file]

        Got it. I've told Ralph to use a separate payments table.
        It will continue on the next iteration.
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     RALPH WORKSTREAM                         │
│                                                              │
│   PROMPT.md          PROGRESS.md         Claude Code        │
│   (what to do)  ───► (what's done)  ───► (do next thing)   │
│        │                   │                   │             │
│        │                   │                   ▼             │
│        │                   │            ┌──────────┐        │
│        │                   │            │  Commit  │        │
│        │                   │            │ Changes  │        │
│        │                   │            └────┬─────┘        │
│        │                   │                 │               │
│        │                   ◄─────────────────┘               │
│        │                   │                                 │
│        └───────────────────┴─────────► Loop until done      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Each iteration:
1. Reads PROMPT.md (the objective) + PROGRESS.md (current state)
2. Pipes to `claude --dangerously-skip-permissions`
3. Claude makes changes and updates PROGRESS.md
4. Auto-commits with iteration number
5. Repeats until complete or max iterations

## CLI Commands

While Claude Code is the primary interface, you can also use the CLI directly:

| Command | Description |
|---------|-------------|
| `ralph` | Interactive dashboard |
| `ralph projects add` | Register current directory |
| `ralph -p <project> start <ws> [n]` | Start workstream |
| `ralph -p <project> status` | Check progress |
| `ralph -p <project> attach <ws>` | Watch live output |
| `ralph -p <project> answer <ws>` | Answer question |
| `ralph -p <project> stop <ws>` | Stop gracefully |
| `ralph -p <project> cleanup <ws>` | Merge and remove |

## Configuration

Edit `~/.ralph/config.yaml`:

```yaml
defaults:
  max_iterations: 20
  base_branch: main

# iOS push notifications (optional)
notifications:
  bark:
    enabled: true
    url: "https://api.day.app/YOUR_BARK_KEY"

# REST API for phone access (optional)
server:
  port: 3847
```

## Multi-Repo Projects

For projects with multiple repositories:

```
You: Set up Ralph for our platform - it has frontend, backend, and infra repos

Claude: I'll register this as a multi-repo project.

        [Executes: ralph projects add --multi-repo]

        Detected repos:
        - frontend/
        - backend-api/
        - infrastructure/

        When you start a workstream, Ralph will create a unified worktree
        with all repos on the same branch, so it can work across the full stack.
```

## The Philosophy

From [Geoffrey Huntley's original post](https://ghuntley.com/ralph/):

> "That's the beauty of Ralph—the technique is deterministically bad in an undeterministic world."

Ralph embraces **eventual consistency**. It will make mistakes. It will need guidance. But with good prompts and patience, it converges on working software.

The key insights:
- **Outcomes reflect operator skill** - Better prompts = better results
- **Learn through iteration** - Each cycle refines the output
- **Faith in the process** - Trust that small steps compound

This implementation adds infrastructure (worktrees, tmux, notifications) but the core loop remains: read prompt, do work, commit, repeat.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design
- [Philosophy](docs/PHILOSOPHY.md) - Design principles
- [Commands](skills/COMMANDS.md) - CLI reference
- [Workflows](skills/WORKFLOWS.md) - Common patterns

## Requirements

- macOS or Linux
- Git, tmux, jq
- [Claude Code CLI](https://claude.ai/code)
- Node.js 18+ (for REST API)

## License

MIT

## Acknowledgments

- [Geoffrey Huntley](https://ghuntley.com/ralph/) for the original Ralph concept
- [Anthropic](https://anthropic.com) for Claude and Claude Code
