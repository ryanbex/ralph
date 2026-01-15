---
allowed-tools: Bash(git:*), Bash(/bin/cp:*), Bash(chmod:*)
description: Commit, push, and update global ralph installation
---

# Git Status
!`git status --short`
# Current Branch
!`git branch --show-current`
# Recent Commits
!`git log -3 --oneline`

Based on the status above:
1. Stage all relevant changes to bin/ralph and bin/ralph-loop.sh
2. Create a descriptive commit message following conventional commits
3. Push to remote
4. Update the global ralph installation by copying to ~/.ralph/bin/:
   ```bash
   /bin/cp -f bin/ralph bin/ralph-loop.sh ~/.ralph/bin/
   chmod +x ~/.ralph/bin/ralph ~/.ralph/bin/ralph-loop.sh
   ```
5. Confirm the update was successful
