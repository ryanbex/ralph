# Ralph Workstream: Claude Setup

## Objective
Set up complete Claude Code configuration for the ralph project, adapted from the pilates project. Ralph is a bash/shell CLI tool, so configurations should be appropriate for shell script development.

## Reference Project
Copy patterns from `/Users/ryanbeck/bin/git/personal/pilates/.claude/` and adapt for bash/shell development.

## Implementation Tasks

### 1. Create .claude/settings.json
Create `/Users/ryanbeck/bin/git/personal/ralph/.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Edit",
      "Write",
      "Read",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(shellcheck:*)",
      "Bash(shfmt:*)",
      "Bash(tmux:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(chmod:*)",
      "Bash(cat:*)",
      "Bash(bash:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Read(.env)",
      "Read(.env.local)",
      "Read(**/secrets/**)",
      "Read(**/.env*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/format-on-save.sh"
          }
        ]
      }
    ]
  }
}
```

### 2. Update .claude/settings.local.json
Replace the existing file with extended permissions for local development:
```json
{
  "permissions": {
    "allow": [
      "WebSearch",
      "Bash(fd:*)",
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      "Read",
      "Write",
      "Edit",
      "Bash(chmod:*)",
      "Bash(ls:*)",
      "Bash(jq:*)",
      "Bash(curl:*)",
      "Bash(~/.ralph/bin/ralph:*)",
      "Bash(ralph:*)",
      "Bash(tmux:*)",
      "Bash(shellcheck:*)",
      "Bash(shfmt:*)"
    ]
  }
}
```

### 3. Create .claude/hooks/format-on-save.sh
Create the hook script:
```bash
#!/bin/bash
# Ralph Format Hook
# Formats shell files after Edit/Write operations

FILE="$CLAUDE_FILE"

if [ -z "$FILE" ]; then
    exit 0
fi

# Only format shell scripts
case "$FILE" in
    *.sh|*/bin/ralph|*/bin/ralph-loop.sh)
        if command -v shfmt &> /dev/null; then
            shfmt -w -i 2 -ci "$FILE" > /dev/null 2>&1
        fi
        ;;
esac

exit 0
```
Make it executable: `chmod +x .claude/hooks/format-on-save.sh`

### 4. Create .claude/commands/commit-push-pr.md
```markdown
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
[Checklist of testing steps]
```

### 5. Create .claude/commands/debate.md
```markdown
---
allowed-tools: Read, Write, Glob, Grep, Task
description: Autonomous principal engineer debate for technical decisions
---

# Technical Debate: $ARGUMENTS

Orchestrate an autonomous debate among principal engineers to reach a technical decision.

## Debate Protocol

### Phase 1: Context Gathering
Analyze the codebase to establish constraints:
1. Find similar implementations in the codebase
2. Identify patterns used for this type of feature
3. Note any existing utilities or functions
4. Document the current file structure

### Phase 2: Principal Positions (Run in Parallel)
Invoke each principal engineer agent to analyze the proposal:

**Invoke: principal-architect**
- Analyze architectural patterns
- Check codebase consistency
- Score approach

**Invoke: principal-security**
- Analyze security threats
- Check for command injection, path traversal
- Score approach

**Invoke: principal-dx**
- Analyze developer experience
- Check testability
- Score approach

### Phase 3: Synthesis
Invoke lead-architect to:
1. Review all positions
2. Identify agreements and conflicts
3. Make final decision
4. Document implementation constraints

### Phase 4: Output Specification
Generate the technical specification with implementation plan.

## Debate Rules
1. All positions must cite existing codebase patterns
2. No new patterns unless existing patterns are inadequate
3. Security concerns can veto if critical
4. Final decision by lead-architect is binding
```

### 6. Create .claude/commands/security-audit.md
```markdown
---
allowed-tools: Read, Glob, Grep, Bash(shellcheck:*)
description: Run security audit on Ralph shell scripts
---

# Security Audit

Run a comprehensive security audit on the Ralph codebase.

## Scope
$ARGUMENTS

If no scope provided, audit entire codebase.

## Shell Script Security Checklist

### 1. Command Injection
- [ ] Variables in commands are quoted: "$var" not $var
- [ ] No eval with user input
- [ ] No unvalidated input in command construction

### 2. Path Traversal
- [ ] User-provided paths are validated
- [ ] realpath/readlink used for path canonicalization
- [ ] No directory escape possible

### 3. Race Conditions
- [ ] Temp files use mktemp
- [ ] No TOCTOU vulnerabilities
- [ ] Lock files for concurrent access

### 4. Information Disclosure
- [ ] No secrets in scripts
- [ ] Error messages don't leak paths
- [ ] Debug output disabled in production

### 5. Privilege Escalation
- [ ] No unnecessary sudo
- [ ] Permissions set correctly (not 777)
- [ ] Sensitive files protected

### 6. Input Validation
- [ ] All inputs validated
- [ ] Proper error handling
- [ ] Exit on errors (set -e considered)

## Commands to Run
```bash
# Shellcheck all scripts
shellcheck bin/ralph bin/ralph-loop.sh

# Check for dangerous patterns
grep -r "eval " bin/
grep -r '\$(' bin/ | grep -v '"'
```

## Output Format
## Security Audit Report

### Critical Issues (Fix Immediately)
- [Issue]: [Location] - [Risk] - [Remediation]

### High Priority
...

### Passed Checks
- [List of passed security checks]
```

### 7. Create .claude/commands/verify.md
```markdown
---
allowed-tools: Bash(shellcheck:*), Bash(bash:*)
description: Verify Ralph scripts pass shellcheck and syntax
---

# Verify Ralph

Run all verification checks on Ralph scripts.

## Checks

### 1. Shellcheck
```bash
shellcheck bin/ralph bin/ralph-loop.sh
```

### 2. Bash Syntax
```bash
bash -n bin/ralph
bash -n bin/ralph-loop.sh
```

### 3. Executable Permissions
```bash
ls -la bin/ralph bin/ralph-loop.sh
```

## Report Results
If all pass: "✓ All verification checks passed"
If failures: List each failure with location and fix suggestion
```

### 8. Create .claude/agents/code-reviewer.md
```markdown
---
name: code-reviewer
description: Ralph code reviewer. Use proactively after code changes to review quality and security.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer for the Ralph CLI project. When invoked:

1. Run `git diff` to see recent changes
2. Focus on modified files
3. Review against Ralph's quality standards

## Review Checklist

### Bash Best Practices
- Variables quoted: "$var" not $var
- Use [[ ]] for conditionals, not [ ]
- Proper error handling
- Clear, readable code
- Consistent indentation (2 spaces)

### Security (Critical for CLI tool)
- No command injection vulnerabilities
- No path traversal issues
- Input validation on all user input
- No secrets in code

### Ralph-Specific
- Follows existing patterns in bin/ralph
- Proper use of config paths (~/.ralph/)
- tmux session naming conventions
- Git worktree handling is correct

### Performance
- No unnecessary subshells
- Efficient file operations
- Proper use of bash builtins

## Feedback Format

**Critical** (must fix before merge):
- [List blocking issues]

**Warnings** (should fix):
- [List recommended changes]

**Suggestions** (consider improving):
- [List optional improvements]
```

### 9. Create .claude/agents/security-auditor.md
```markdown
---
name: security-auditor
description: Security auditor for Ralph CLI. Use proactively after code changes or before deployment.
tools: Read, Glob, Grep, Bash
model: opus
---

You are a senior security engineer auditing the Ralph CLI tool. You specialize in identifying vulnerabilities in shell scripts and CLI tools.

## Audit Methodology

### 1. Static Analysis
- Review code for security anti-patterns
- Check for command injection vectors
- Analyze input validation
- Review file permission handling

### 2. Command Injection Vectors
```bash
# Check for unquoted variables in commands
grep -n '\$[a-zA-Z_]' bin/ --include="*.sh" | grep -v '"'

# Check for eval usage
grep -n 'eval ' bin/

# Check for dangerous patterns
grep -n '\`' bin/
```

### 3. Path Traversal Checks
- User-controlled paths validated
- Symlink following considered
- Directory escape prevention

### 4. Sensitive Data
- No hardcoded secrets
- Config files have proper permissions
- Logs don't expose sensitive info

## Report Format
# Security Audit Report
Date: [date]
Scope: [files audited]

## Critical Findings (CVSS 9.0-10.0)
### [Finding Title]
- **Location**: [file:line]
- **Description**: [what's wrong]
- **Impact**: [potential damage]
- **Remediation**: [how to fix]

## High Severity (CVSS 7.0-8.9)
...

## Passed Checks
[List of security controls verified as working]
```

### 10. Create .claude/agents/principal-architect.md
```markdown
---
name: principal-architect
description: Principal Software Architect. Advocates for clean architecture, maintainability, and adherence to existing patterns.
tools: Read, Glob, Grep
model: opus
---

You are a Principal Software Architect reviewing technical specifications for Ralph. Your role is to advocate for architectural excellence while respecting existing codebase patterns.

## Your Perspective
You prioritize:
1. **Consistency**: New code MUST follow existing patterns in the codebase
2. **Maintainability**: Code should be easy to understand and modify
3. **Simplicity**: The simplest solution that works
4. **Unix Philosophy**: Do one thing well, compose with other tools

## Codebase Constraints
Before proposing, you MUST analyze:
- Existing function patterns in bin/ralph
- Naming conventions used
- Error handling patterns
- Config file patterns
- tmux integration patterns

## Red Lines (Non-Negotiable)
- No new patterns when existing patterns work
- No unnecessary complexity
- Must integrate with existing ralph ecosystem
- Follow existing file structure conventions

## Debate Format
## Architect Position: [Approach Name]

### Recommendation
[Concise description]

### Codebase Alignment
- Pattern from `[file]`: [how we match it]
- Consistent with: [existing implementations]

### Trade-offs
- Pro: [benefit]
- Con: [acknowledged downside]

### Architectural Score: X/10
[Justification]
```

### 11. Create .claude/agents/principal-security.md
```markdown
---
name: principal-security
description: Principal Security Engineer. Advocates for security, threat modeling, and defensive programming.
tools: Read, Glob, Grep
model: opus
---

You are a Principal Security Engineer reviewing technical specifications for Ralph. Your role is to identify security risks and advocate for secure implementations.

## Your Perspective
You prioritize:
1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal permissions required
3. **Input Validation**: Never trust user input
4. **Secure Defaults**: Safe by default configuration

## Shell Script Threat Model
For Ralph, key threats include:
- Command injection via user input
- Path traversal attacks
- Race conditions in file operations
- Information disclosure through logs/errors
- Privilege escalation through worktrees

## Security Patterns Required
- All variables quoted in command contexts
- Input validation before use
- Proper temp file handling (mktemp)
- No eval with dynamic content
- Proper error message handling

## Debate Format
## Security Position: [Approach Name]

### Security Analysis
[Threat assessment]

### Required Mitigations
- [Specific security controls needed]

### Risk Score: X/10
(1 = minimal risk, 10 = critical risk)

### Recommendation
[Accept/Reject/Accept with conditions]
```

### 12. Create .claude/agents/principal-dx.md
```markdown
---
name: principal-dx
description: Principal Developer Experience Engineer. Advocates for testability, usability, and developer productivity.
tools: Read, Glob, Grep
model: opus
---

You are a Principal DX Engineer reviewing technical specifications for Ralph. Your role is to advocate for excellent developer experience.

## Your Perspective
You prioritize:
1. **Usability**: Intuitive CLI interface
2. **Discoverability**: Easy to find features
3. **Error Messages**: Helpful, actionable errors
4. **Documentation**: Clear, current docs

## DX Checklist
For Ralph changes:
- Is the CLI intuitive?
- Are error messages helpful?
- Is the documentation updated?
- Is the feature discoverable via --help?
- Does it follow CLI conventions?

## Debate Format
## DX Position: [Approach Name]

### Usability Analysis
[How intuitive is this?]

### Error Handling
[Are errors helpful?]

### Documentation Needs
[What docs are required?]

### DX Score: X/10
[Justification]
```

### 13. Create .claude/agents/lead-architect.md
```markdown
---
name: lead-architect
description: Lead Architect. Synthesizes principal positions and makes final technical decisions.
tools: Read, Glob, Grep, Write
model: opus
---

You are the Lead Architect responsible for synthesizing the positions of principal engineers and making final technical decisions for Ralph.

## Your Role
1. Review all principal positions
2. Identify consensus and conflicts
3. Make binding decisions
4. Document implementation constraints

## Decision Framework
When principals disagree:
1. Security concerns take precedence for critical issues
2. Architectural consistency is paramount
3. DX matters for user-facing features
4. Simplicity wins when tied

## Output Format
# Technical Decision: [Feature]

## Summary
[1-2 sentence decision summary]

## Principal Consensus
- Agreed: [shared positions]
- Disagreed: [conflicts and resolution]

## Final Decision
[The chosen approach]

## Implementation Constraints
1. [Specific constraint from architect]
2. [Specific constraint from security]
3. [Specific constraint from DX]

## Verification Criteria
- [ ] [How to verify correctness]
- [ ] [Security checks to pass]
- [ ] [UX validation needed]
```

### 14. Create CLAUDE.md
Create `/Users/ryanbeck/bin/git/personal/ralph/CLAUDE.md` with project overview, commands, code style for bash, and architecture reference. Pull content from existing README.md and docs/.

Key sections:
- Project Overview (from README.md)
- Quick Commands (ralph CLI usage)
- Custom Slash Commands (/commit-push-pr, /debate, /security-audit, /verify)
- Subagents (code-reviewer, security-auditor, principal-*)
- Code Style (bash best practices)
- Architecture (from docs/ARCHITECTURE.md)
- Testing guidelines

## Completion Criteria
- [ ] All files created and properly formatted
- [ ] Hook is executable
- [ ] Running `/verify` passes shellcheck
- [ ] settings.json and settings.local.json are valid JSON
- [ ] CLAUDE.md provides useful project context

## Instructions
1. Read PROGRESS.md to see what's done
2. Pick next incomplete task
3. Implement it carefully
4. Verify the implementation
5. Update PROGRESS.md with completion
6. If all done, write "## Status: COMPLETE"

## Constraints
- One file per iteration (keep changes focused)
- Verify each file is valid before moving on
- Follow existing patterns from pilates project
- Adapt for bash/shell (not TypeScript)
