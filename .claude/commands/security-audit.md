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
