# Ralph Philosophy

> "That's the beauty of Ralph—the technique is deterministically bad in an undeterministic world."
> — [Geoffrey Huntley](https://ghuntley.com/ralph/)

## The Origin

Ralph started as an elegantly simple idea:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

This single line captures the essence: give an AI a task, let it work, repeat. No complex orchestration. No elaborate frameworks. Just a loop.

This implementation extends that core pattern with infrastructure for parallel execution, persistence, and observability—but the philosophy remains the same.

## The Problem

AI coding assistants have two fundamental limitations:

1. **Context Limits**: Every conversation has a maximum context window. Long sessions degrade as important context gets pushed out.

2. **Session Persistence**: Terminal sessions end. SSH connections drop. Your laptop sleeps. The AI loses its train of thought.

Traditional solutions—saving chat logs, manual handoffs, context summaries—create friction and lose nuance.

## The Insight

What if the AI could work *autonomously*, maintaining its own context across sessions, committing progress incrementally, and asking for human input only when truly stuck?

This is Ralph: an orchestrator that treats AI development as a *continuous loop* rather than an *interactive session*.

## Core Principles

### 1. Autonomy Over Interactivity

Traditional AI coding:
```
Human: Do task A
AI: [does A]
Human: Now do B
AI: [does B]
Human: Now do C...
```

Ralph's approach:
```
Human: Here's the goal and constraints. Go.
Ralph: [does A, B, C, D, E... commits each step... asks questions only when blocked]
Human: [reviews completed work]
```

The AI works autonomously. The human reviews asynchronously.

### 2. Iteration Over Sessions

Each Ralph iteration is atomic:
1. Read current state (PROGRESS.md)
2. Decide what to do next
3. Do it
4. Commit the change
5. Update progress
6. Repeat

If the session dies, nothing is lost. The next iteration picks up where it left off.

### 3. Isolation Over Coordination

Each workstream:
- Has its own git branch
- Has its own worktree directory
- Has its own tmux session
- Has its own progress tracking

No coordination needed between workstreams. They can't conflict because they never touch the same files on the same branch.

### 4. Focus Over Breadth

A workstream has ONE objective. The PROMPT.md defines:
- What to accomplish
- What's in scope
- What's NOT in scope
- When it's "done"

Narrow focus = better results.

### 5. Progress Over Perfection

Ralph commits after every iteration. Small, incremental commits. This means:
- Easy to review changes
- Easy to revert if needed
- Progress is never lost
- You can see exactly what the AI did

### 6. Human Judgment at Merge Time

Ralph works on branches. Humans decide when to merge. This preserves human oversight while enabling autonomous work.

```
Ralph: [works on ralph/feature for 50 iterations]
Human: [reviews the branch diff]
Human: [decides to merge, or requests changes]
```

### 7. Eventual Consistency

From the original Ralph philosophy: outcomes are deterministically bad in an undeterministic world. Ralph will produce flawed output. That's expected.

The key insight: **when output is wrong, refine the prompts**. Don't blame the tool. Treat it like tuning an instrument—small adjustments compound into harmony.

This requires:
- **Patience**: First iterations are rough
- **Observation**: Watch what Ralph does wrong
- **Refinement**: Improve PROMPT.md based on failures
- **Faith**: Trust the process converges

## Design Decisions

### Why Git Worktrees?

**Considered alternatives:**
- Separate clones (too much disk space)
- Branch switching (can't run parallel)
- Stash-based isolation (fragile)

**Worktrees win because:**
- Shared `.git` directory (efficient)
- True parallel branches
- Native git tooling works
- Clean mental model

### Why tmux?

**Considered alternatives:**
- Background processes (lose output)
- Screen (less common)
- Systemd services (overkill)
- Docker containers (overkill)

**tmux wins because:**
- Survives terminal close
- Easy attach/detach
- Session naming
- Widely installed
- Simple to script

### Why Bash?

**Considered alternatives:**
- Python (heavier runtime)
- Go (compilation step)
- Node.js (callback hell for scripting)

**Bash wins because:**
- No dependencies
- Native git/tmux integration
- Fast startup
- Easy to modify
- "It's just commands"

### Why File-Based State?

**Considered alternatives:**
- SQLite database
- Redis
- JSON files

**Simple files win because:**
- Easy to inspect (`cat status`)
- Easy to modify (`echo "STOPPED" > status`)
- No dependencies
- Survives crashes
- Human-readable

### Why PROGRESS.md?

The AI maintains its own context in a markdown file:
- What's been done
- What's in progress
- What's blocked
- Notes for next iteration

This solves context limits by externalizing memory.

### Why Push Notifications?

When Ralph needs input, you shouldn't have to poll. Bark (iOS) provides:
- Instant notification
- Works from anywhere
- No server infrastructure
- Simple curl to send

## Anti-Patterns to Avoid

### 1. Micromanaging Ralph

❌ **Wrong:**
```markdown
## Instructions
1. Open file X
2. Find function Y
3. Change line Z to...
```

✅ **Right:**
```markdown
## Objective
Fix the authentication bug where users are logged out after 5 minutes.

## Constraints
- Don't change the token format
- Keep backwards compatibility
```

Tell Ralph *what*, not *how*.

### 2. Kitchen Sink Workstreams

❌ **Wrong:**
```markdown
## Objective
- Build the new feature
- Fix all the bugs
- Refactor the database layer
- Add comprehensive tests
- Update documentation
```

✅ **Right:**
```markdown
## Objective
Add user authentication with JWT tokens.

## Out of Scope
- Refactoring (separate workstream)
- Performance optimization
- UI polish
```

One objective per workstream.

### 3. Ignoring Progress

❌ **Wrong:**
Starting a workstream and forgetting about it.

✅ **Right:**
- Check status regularly
- Answer questions promptly
- Review completed work
- Cleanup after merge

Ralph is autonomous, not unsupervised.

### 4. Skipping Cleanup

❌ **Wrong:**
Leaving dozens of worktrees and branches around.

✅ **Right:**
```bash
ralph -p project cleanup workstream
```

Clean up after every completed workstream.

## When NOT to Use Ralph

Ralph is not the right tool when:

1. **You need immediate feedback**: Interactive debugging, exploratory work
2. **The task is tiny**: Single-line fix, quick question
3. **Context is complex**: Needs deep codebase understanding you can't write down
4. **Quality is critical**: Security-sensitive code that needs careful review
5. **Iteration is fast**: Changes take seconds, not minutes

Use Ralph for:
- Multi-hour implementation tasks
- Overnight or weekend work
- Parallelizing independent features
- "Let it run while I do other things"

## The Future

Ralph is a step toward AI software engineering at scale:

1. **Current**: One human + multiple Ralph workstreams
2. **Next**: Teams sharing Ralph infrastructure
3. **Future**: AI agents coordinating with each other

The patterns established here—isolation, autonomy, incremental progress, human review—scale to more sophisticated multi-agent systems.

### Workflow Orchestration (Implemented)

Ralph now supports declarative workflow definitions with dependency resolution:

```yaml
workstreams:
  - name: auth
    prompt: "Implement authentication"
  - name: api
    depends_on: [auth]  # waits for auth to complete
```

This enables:
- **Parallel execution** of independent workstreams
- **Automatic sequencing** based on dependencies
- **Cycle detection** to prevent deadlocks
- **Real-time monitoring** via event streaming

A parent Claude session can spawn child workstreams and monitor their progress through the event stream—a step toward multi-agent coordination.

### Event-Driven Observability

Each workstream emits structured events (JSONL) that enable:
- Real-time progress dashboards
- Cost and token tracking
- Anomaly detection (stuck workstreams)
- Integration with external monitoring systems

This decouples the execution from observation, allowing multiple consumers (CLI, web UI, other agents) to monitor the same workstreams.

## References

- [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/) - The original Ralph concept
- [Claude Code CLI](https://claude.ai/code)
- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [tmux Manual](https://man.openbsd.org/tmux)

---

*"The best tool is the one that lets you think about the problem, not the tool."*

Ralph handles the plumbing so you can focus on what matters.
