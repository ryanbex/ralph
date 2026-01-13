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
