# Ralph Web Platform - Development Roadmap

## Vision
Transform Ralph from a local CLI tool into a web-deployable platform where non-engineers can autonomously develop features across multi-repo projects, with full observability and a Simpsons-themed gamification system.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           RALPH WEB                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  VERCEL (Frontend)                                                   │
│  ├── Next.js App (Simpsons UI)                                      │
│  ├── GitHub OAuth                                                    │
│  ├── WebSocket Gateway (real-time logs)                             │
│  └── MCP Server (Edge) for terminal control                         │
│                                                                      │
│  AWS (Backend)                                                       │
│  ├── API Gateway (REST + WebSocket)                                 │
│  ├── Lambda (Orchestration)                                         │
│  ├── Step Functions (VM lifecycle)                                  │
│  ├── EC2 Spot (Ephemeral VMs per workstream)                        │
│  │   └── Claude Code + Playwright + Git worktrees                   │
│  ├── RDS PostgreSQL (Users, Projects, Workstreams)                  │
│  ├── S3 (PROMPT.md, PROGRESS.md, logs)                              │
│  ├── Secrets Manager (API keys)                                     │
│  ├── SSM Session Manager (SSH alternative)                          │
│  └── CloudWatch (Real-time log streaming)                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Compute** | EC2 Spot (m6i.xlarge) | Claude Code needs full pty/tty, Playwright needs real browser |
| **Database** | PostgreSQL (Aurora Serverless v2) | Relational model fits hierarchy, rich queries for leaderboards |
| **Real-time** | API Gateway WebSockets + Redis | Native AWS, avoids third-party deps |
| **Auth** | GitHub OAuth + BYOK Anthropic keys | Users control their own API spend |
| **SSH** | SSM Session Manager | No bastion, IAM auth, audit trail |
| **MCP** | Vercel Edge Functions | Low latency for terminal users |
| **Art Style** | 8-bit Pixel Art | Retro game aesthetic, Simpsons theme via colors/names. Avoids IP issues. |
| **Code Structure** | Monorepo (this repo) | Add web/, api/, infra/ directories to existing ralph repo |

---

## Role System (Simpsons Themed)

| Role | Character | Permissions |
|------|-----------|-------------|
| **Admin** | Marge | Full control, billing, user management |
| **DevLead** | Homer | Manage projects, SSH, higher limits |
| **Dev** | Bart/Lisa | Create workstreams, SSH to own VMs |
| **Viewer** | Maggie | Watch, trigger, answer questions (no SSH, capped iterations) |

### Iteration Limits

| Role | Max per Workstream | Max Concurrent | Max per Day |
|------|-------------------|----------------|-------------|
| Marge | 1000 | 50 | 10000 |
| Homer | 200 | 20 | 2000 |
| Bart/Lisa | 100 | 10 | 500 |
| Maggie | **20** | 3 | 50 |

**Claude Code receives iteration context**: Knows remaining iterations and plans accordingly.

---

## Security Model

1. **VM Isolation**: Each workstream gets isolated EC2, private subnet, NAT egress
2. **Secrets**: User API keys encrypted in Secrets Manager, fetched at VM start, env vars only
3. **Network**: Egress allowlist (GitHub, npm, pypi, Anthropic API), crypto pools blocked
4. **Resource Limits**: Max iterations (role-based), auto-terminate runaway VMs
5. **Audit**: Full audit log of all actions

---

## Gamification System

### Donut Economy
- **Earn donuts**: 10 base per merged PR, +5 per 100 lines, +2 per file, +10 first of day
- **Streak bonus**: +5 per consecutive day (max 50)
- **Helping others**: +3 per answered question

### XP & Levels
- XP mirrors donuts but never spent
- Level 1-10: 100 XP each, Level 11-25: 200 XP each, Level 26+: 500 XP each

### Ralph Worker Evolution (8-bit Pixel Art)
| Level | Sprite | Description |
|-------|--------|-------------|
| 1-5 | Basic Worker | Simple 16x16 sprite, pencil, yellow shirt |
| 6-10 | Junior Dev | Hardhat added, clipboard, walking animation |
| 11-15 | Developer | Laptop sprite, coffee cup, blue pants |
| 16-20 | Senior Dev | Dual monitors background, mechanical keyboard glow |
| 21-30 | Tech Lead | Standing desk setup, whiteboard with diagrams |
| 31-40 | Principal | Corner office scene, trophy shelf, plants |
| 41+ | Distinguished | Golden keyboard sparkle effect, halo animation |

**Special Items** (unlocked via achievements):
- Homer's Donut (desk decoration) - 100 donuts earned
- Skateboard (speed trail effect) - "Eat My Shorts" achievement
- Saxophone (music on completion) - "Excellent..." achievement
- Blue Hair Accessory - Admin role unlocked

### Achievements (Sample)
- **First Donut**: Merge your first PR
- **D'oh!**: Cancel after 50+ iterations
- **Excellent...**: 10 workstreams without questions
- **Eat My Shorts**: Complete in under 5 iterations
- **Perfectly Cromulent**: Zero conflicts on 20 consecutive PRs

---

## Workstream Flow

```
1. User creates project (multi-repo: frontend, backend, infra)
2. User submits prompt: "Add dark mode to the app"
3. Claude refines prompt interactively (clarifies scope, suggests structure)
4. User confirms → PROMPT.md saved to S3
5. VM provisioned (EC2 Spot, ~1-2 min)
6. VM clones repos, creates unified worktree
7. ralph-loop.sh runs (same iteration logic as local Ralph)
8. Real-time logs stream to UI via WebSocket
9. If Claude needs input → Question appears in UI, user answers
10. On completion → Auto-creates PR, optionally auto-merges
11. Donuts/XP awarded → Leaderboard updated
12. VM terminated, state archived to S3
```

---

## MCP Interface (Terminal Control)

Full control from terminal via MCP:

| Tool | Description |
|------|-------------|
| `ralph-start` | Start workstream with prompt |
| `ralph-stop` | Stop running workstream |
| `ralph-status` | Get status (all or specific) |
| `ralph-answer` | Answer pending question |
| `ralph-logs` | Tail logs (with follow mode) |
| `ralph-attach` | Get SSM session URL for SSH |
| `ralph-projects` | List projects |
| `ralph-project-create` | Create project with repos |

---

## Database Schema (Core Tables)

```sql
users          -- GitHub OAuth, role, Anthropic key, gamification stats
projects       -- Multi-repo support, settings
project_repos  -- GitHub repos linked to project
project_members -- Team sharing
workstreams    -- Status, iteration tracking, VM reference, gamification
workstream_iterations -- Detailed per-iteration history
achievements   -- Simpsons-themed achievements
user_achievements -- Earned achievements
leaderboard_cache -- Weekly/monthly/all-time rankings
```

---

## Phase Breakdown

### Phase 1: MVP (4-6 weeks)
**Goal**: CTO can use basic web UI with single-repo workstreams

- [ ] Vercel Next.js app with GitHub OAuth
- [ ] User model + encrypted Anthropic API key storage
- [ ] Project CRUD (single-repo only)
- [ ] Workstream CRUD with basic VM provisioning
- [ ] ralph-loop.sh running on EC2
- [ ] CloudWatch log streaming to UI
- [ ] WebSocket for real-time status
- [ ] Manual start/stop controls
- [ ] Basic iteration tracking in DB

**Not included**: Multi-repo, prompt refinement, gamification, SSH, MCP, roles

### Phase 2: Core Features (4-6 weeks)
**Goal**: Production-ready single-user platform

- [ ] Multi-repo project support (unified worktrees)
- [ ] Interactive prompt refinement (Claude-assisted)
- [ ] Answer questions via UI
- [ ] Auto-merge on completion with PR creation
- [ ] S3 storage for PROMPT.md/PROGRESS.md
- [ ] Full role system (Marge/Homer/Bart/Lisa/Maggie)
- [ ] Iteration limits per role
- [ ] SSM Session Manager for dev SSH
- [ ] Push notifications (Bark/Slack)
- [ ] Audit logging

### Phase 3: Collaboration & Terminal Control (4-6 weeks)
**Goal**: Team features and MCP interface

- [ ] MCP server (full terminal control)
- [ ] Team/organization model
- [ ] Project sharing between users
- [ ] GitHub App integration (replace PAT)
- [ ] Advanced log search
- [ ] Cost tracking per workstream
- [ ] Workstream templates
- [ ] Webhook triggers (on issue, etc.)
- [ ] Workstream resume after failure

### Phase 4: Gamification & Polish (3-4 weeks)
**Goal**: Full Simpsons-themed gamification

- [ ] Donut economy
- [ ] XP and level system
- [ ] Achievements (30+ achievements)
- [ ] Leaderboards (weekly/monthly/all-time)
- [ ] Ralph worker visual evolution
- [ ] Profile customization
- [ ] Onboarding flow
- [ ] UI/UX polish pass

### Phase 5: Enterprise Features (6-8 weeks)
**Goal**: Enterprise readiness

- [ ] SSO (SAML/OIDC)
- [ ] Fine-grained RBAC
- [ ] Custom egress rules per project
- [ ] VPC peering for private repos
- [ ] Usage-based billing
- [ ] Admin dashboard
- [ ] Multi-region support
- [ ] Security audit + hardening

---

## Cost Estimates

### Per Workstream
- EC2 m6i.xlarge Spot: ~$0.08/hr × 2hr avg = $0.16
- S3 + CloudWatch + data transfer: ~$0.09
- **Total: ~$0.25 per workstream**

### Monthly Platform (1000 workstreams)
- EC2: $250
- RDS Aurora: $50-100
- ElastiCache: $30-50
- API Gateway + Lambda: $20-30
- S3 + CloudWatch: $30-50
- **Total: ~$400-500/month**

---

## Monorepo Structure

```
ralph/                           # Existing repo root
├── bin/                         # Existing CLI
│   ├── ralph
│   └── ralph-loop.sh
├── server/                      # Existing REST API
│   └── server.js
├── skills/                      # Existing Claude skill
├── docs/                        # Existing docs
│
├── web/                         # NEW: Next.js frontend
│   ├── src/
│   │   ├── app/                 # App router
│   │   ├── components/         # UI components
│   │   │   └── pixel-ralph/    # 8-bit sprite assets
│   │   ├── lib/                # Utilities
│   │   └── hooks/              # React hooks
│   ├── public/
│   │   └── sprites/            # 8-bit art assets
│   └── package.json
│
├── api/                         # NEW: Lambda functions
│   ├── src/
│   │   ├── handlers/           # API handlers
│   │   ├── services/           # Business logic
│   │   └── mcp/                # MCP server
│   └── package.json
│
├── infra/                       # NEW: Terraform
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ec2/
│   │   ├── rds/
│   │   └── lambda/
│   └── environments/
│       ├── dev/
│       └── prod/
│
├── db/                          # NEW: Database
│   ├── migrations/
│   └── seeds/
│
├── shared/                      # NEW: Shared types
│   └── types/
│
└── package.json                 # NEW: Root workspace
```

### Critical Files to Modify
- `bin/ralph-loop.sh` - Adapt for cloud (S3 state, CloudWatch logs)
- `server/server.js` - Patterns to reference for API design

---

## Verification Plan

### Phase 1 MVP Testing
1. Login with GitHub OAuth
2. Add Anthropic API key
3. Create single-repo project
4. Create workstream with simple prompt
5. Watch logs stream in real-time
6. Stop workstream manually
7. Verify VM terminates

### End-to-End Testing
1. Create multi-repo project (frontend + backend)
2. Submit complex prompt ("Add user authentication")
3. Claude refines prompt interactively
4. Workstream runs, answers question when asked
5. Auto-creates PR on completion
6. Verify donuts/XP awarded
7. Check leaderboard updated
8. Use MCP from terminal to check status

---

## Remaining Decisions (Can Defer)

1. **Push Notifications**: Start with Bark (iOS), add Slack/Discord in Phase 3?
2. **Domain**: ralphweb.com? ralphdev.io? springfield-dev.io?
3. **Pixel Art Creation**: Commission artist or generate with AI tools?

---

## Summary

Ralph Web extends the local Ralph CLI into a cloud-native platform:

| What | How |
|------|-----|
| **Local CLI** | Preserved - still works for local development |
| **Web UI** | Next.js on Vercel with 8-bit Simpsons theme |
| **VMs** | Ephemeral EC2 Spot instances per workstream |
| **State** | PostgreSQL + S3 (replaces local file system) |
| **Real-time** | WebSockets for log streaming |
| **Terminal** | MCP server for full control from CLI |
| **Gamification** | Donuts, XP, levels, achievements, leaderboards |
| **Security** | Role-based iteration limits, VM isolation |

The core Ralph philosophy is preserved: **PROMPT.md + PROGRESS.md → Claude → Git branch → Human review → Merge**
