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
If all pass: "All verification checks passed"
If failures: List each failure with location and fix suggestion
