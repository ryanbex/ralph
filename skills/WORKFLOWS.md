# Common Ralph Workflows

## Feature Development

Start a new feature workstream:

```bash
# Register project if not done
cd ~/git/myproject
ralph projects add

# Create workstream config
mkdir -p ~/.ralph/workstreams/myproject/new-feature

cat > ~/.ralph/workstreams/myproject/new-feature/PROMPT.md << 'EOF'
# Ralph Workstream: new-feature

## Objective
Implement [feature description]

## Tasks
1. Add database model
2. Create API endpoint
3. Build UI component
4. Add tests
5. Update documentation

## Instructions
1. Read PROGRESS.md
2. Pick next incomplete task
3. Implement with minimal changes
4. Run `pnpm build && pnpm test`
5. Update PROGRESS.md

## Constraints
- One logical change per iteration
- Always verify changes compile
- Follow existing patterns
EOF

# Start the workstream
ralph -p myproject start new-feature 30
```

---

## Bug Fix Sprint

Fix multiple bugs autonomously:

```bash
mkdir -p ~/.ralph/workstreams/myproject/bugfix

cat > ~/.ralph/workstreams/myproject/bugfix/PROMPT.md << 'EOF'
# Ralph Workstream: bugfix

## Objective
Fix bugs from issue tracker

## Bug List
- [ ] #123 - Form validation error
- [ ] #124 - Mobile layout broken
- [ ] #125 - API timeout handling

## Per-Bug Process
1. Read issue details
2. Write failing test (if applicable)
3. Fix bug
4. Verify test passes
5. Mark complete in PROGRESS.md

## Constraints
- One bug per iteration
- Must not break existing tests
EOF

ralph -p myproject start bugfix 20
```

---

## Multi-Repo Full-Stack Feature

Work across multiple repos simultaneously:

```bash
# Register multi-repo project
cd ~/git/work/superfunnel
ralph projects add --multi-repo

# Create workstream config
mkdir -p ~/.ralph/workstreams/superfunnel/fullstack-auth

cat > ~/.ralph/workstreams/superfunnel/fullstack-auth/PROMPT.md << 'EOF'
# Ralph Workstream: fullstack-auth

## Objective
Implement user authentication across all services

## Repos
- frontend: React login UI
- backend-api: Auth endpoints, JWT handling
- backend-workers: Token refresh jobs
- infrastructure: Auth service configuration

## Tasks
1. [ ] backend-api: Add auth endpoints
2. [ ] backend-api: Implement JWT signing/verification
3. [ ] frontend: Create login form component
4. [ ] frontend: Add auth context provider
5. [ ] backend-workers: Add token refresh job
6. [ ] infrastructure: Configure auth service

## Instructions
1. Read PROGRESS.md for current state
2. Pick next incomplete task
3. Work in the appropriate repo directory
4. Test changes locally
5. Update PROGRESS.md

## Constraints
- Maintain API compatibility between repos
- Test frontend against backend locally
- Follow each repo's coding standards
EOF

ralph -p superfunnel start fullstack-auth 50
```

---

## Parallel Development (Multiple Workstreams)

Run multiple autonomous agents simultaneously:

```bash
# Start multiple workstreams for same project
ralph -p pilates start auth 20
ralph -p pilates start api 20
ralph -p pilates start ui 20

# Or across different projects
ralph -p pilates start auth 20
ralph -p superfunnel start api 20

# Monitor all
ralph

# Or use project-specific dashboard
ralph -p pilates
```

Each runs in its own worktree, on its own branch, with no conflicts.

---

## Gap Filling

Work through GAP_ANALYSIS.md items:

```bash
mkdir -p ~/.ralph/workstreams/pilates/gaps

cat > ~/.ralph/workstreams/pilates/gaps/PROMPT.md << 'EOF'
# Ralph Workstream: gaps

## Objective
Fill engineering gaps from GAP_ANALYSIS.md

## Priority Order
1. CRITICAL: API Authorization
2. CRITICAL: Race Conditions
3. HIGH: Database Transactions
4. HIGH: Test Coverage
5. MEDIUM: Error Handling

## Instructions
1. Read PROGRESS.md
2. Read docs/GAP_ANALYSIS.md for context
3. Pick next incomplete item
4. Implement fix
5. Run verification: pnpm build && pnpm lint
6. Update PROGRESS.md
EOF

ralph -p pilates start gaps 50
```

---

## Refactoring

Large-scale refactoring:

```bash
mkdir -p ~/.ralph/workstreams/pilates/refactor

cat > ~/.ralph/workstreams/pilates/refactor/PROMPT.md << 'EOF'
# Ralph Workstream: refactor

## Objective
Decompose large files into smaller modules

## Targets
1. [ ] `api/webhooks/twilio/sms/route.ts` (850 lines)
   - Extract to lib/sms/handlers/
   - Keep webhook.ts for routing only

2. [ ] `lib/ai/prompts.ts` (400 lines)
   - Split by context type
   - Create shared utilities

## Instructions
1. One file decomposition per iteration
2. Keep all tests passing
3. No behavioral changes
4. Update imports throughout codebase
EOF

ralph -p pilates start refactor 30
```

---

## Test Coverage

Add comprehensive tests:

```bash
mkdir -p ~/.ralph/workstreams/pilates/tests

cat > ~/.ralph/workstreams/pilates/tests/PROMPT.md << 'EOF'
# Ralph Workstream: tests

## Objective
Increase test coverage to >80%

## Priority
1. Action executor (11 action types)
2. AI integration (retry logic, JSON parsing)
3. SMS webhook flow
4. Authentication/authorization
5. Scheduling/conflict detection

## Per-Component Process
1. Analyze existing code
2. Identify edge cases
3. Write unit tests
4. Write integration tests (where applicable)
5. Verify coverage increased

## Test Patterns
- Use vitest for unit tests
- Use supertest for API tests
- Mock external services (Twilio, Claude)
EOF

ralph -p pilates start tests 40
```

---

## Security Audit

Run security fixes:

```bash
mkdir -p ~/.ralph/workstreams/pilates/security

cat > ~/.ralph/workstreams/pilates/security/PROMPT.md << 'EOF'
# Ralph Workstream: security

## Objective
Address OWASP Top 10 vulnerabilities

## Audit Areas
1. [ ] Injection - Verify parameterized queries
2. [ ] Broken Auth - Add authorization checks
3. [ ] Sensitive Data - Audit logging
4. [ ] Broken Access Control - Resource ownership
5. [ ] XSS - Validate React escaping
6. [ ] Input Validation - Zod schemas

## Per-Issue Process
1. Identify vulnerability
2. Write test that would catch it
3. Implement fix
4. Verify test passes
5. Document in PROGRESS.md
EOF

ralph -p pilates start security 25
```

---

## Cleanup After Merge

When workstream is complete and PR merged:

```bash
# Stop if still running
ralph -p pilates stop auth

# Merge and cleanup
ralph -p pilates cleanup auth

# Optionally remove config files
rm -rf ~/.ralph/workstreams/pilates/auth
```

---

## Monitoring Long-Running Workstreams

For workstreams that take hours:

```bash
# Start workstream
ralph -p pilates start long-task 100

# Close terminal - tmux persists
exit

# Later, check status from anywhere
ralph -p pilates status

# Or reattach
ralph -p pilates attach long-task

# You'll get Bark notifications for:
# - Questions (needs input)
# - Stuck (no progress)
# - Complete
# - Errors
```

---

## Answering Questions

When Ralph asks for input:

```bash
# Check for questions
ralph -p pilates status

# If NEEDS_INPUT shown:
ralph -p pilates answer auth

# Type your answer when prompted
# Ralph will incorporate it next iteration
```

You'll also get a Bark push notification with the question.

---

## Recovery After Crash/Reboot

If your machine restarts:

```bash
# Run recovery to find orphaned workstreams
ralph recover

# This will:
# 1. Find workstreams that were RUNNING but tmux died
# 2. Restart them if worktree still exists
# 3. Mark as STOPPED if worktree is gone
# 4. Send Bark notification about recovery
```

---

## Emergency Stop

Stop everything immediately:

```bash
ralph stop --all
```

This sends stop signal to all Ralph tmux sessions.

---

## Working From Phone

With Bark notifications and VPN access:

1. **Monitor**: Get push notifications for events
2. **Check Status**: `curl http://your-machine:3847/projects` (Phase 4)
3. **Answer Questions**: Via REST API (Phase 4)
4. **Stop Workstream**: Via REST API (Phase 4)

For now, SSH into your machine and run ralph commands directly.

---

## Tips

### Minimize Context
Keep PROMPT.md focused and specific. Ralph works better with clear, narrow objectives.

### Use PROGRESS.md Wisely
Structure it for Ralph to easily parse:
- `## Completed` section with checkmarks
- `## In Progress` for current work
- `## Blocked` for items needing input

### One Thing At a Time
Configure workstreams to do one logical change per iteration. This makes commits atomic and easier to review.

### Watch the First Few Iterations
Attach to new workstreams initially to make sure Ralph understands the task correctly. Adjust PROMPT.md if needed.

### Clean Up Regularly
Don't let old worktrees accumulate. Run cleanup after merging PRs.
