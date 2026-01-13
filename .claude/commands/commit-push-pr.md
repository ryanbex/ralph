---
allowed-tools: Bash(git:*), Bash(gh:*)
description: Stage, commit, push, and create PR for Ralph
---

# Git Status
!`git status --short`
# Current Branch
!`git branch --show-current`
# Recent Commits
!`git log -5 --oneline`

Based on the status above:
1. Stage all relevant changes (avoid .env files and secrets)
2. Create a descriptive commit message following conventional commits (feat:, fix:, refactor:, docs:, test:, chore:)
3. Push to remote
4. Create PR with summary of changes

Use the format:
## Summary
<1-3 bullet points>

## Test plan
[Bulleted markdown checklist of TODOs for testing the pull request...]
