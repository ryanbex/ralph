#!/usr/bin/env bash
# ralph-loop-cloud.sh - Cloud-adapted Ralph iteration loop for Fly.io
# Runs in worker container, streams output to Fly.io logs

set -euo pipefail

# Configuration from environment (set by entrypoint.sh)
WORKSTREAM_ID="${WORKSTREAM_ID:-}"
WORKSTREAM_BRANCH="${WORKSTREAM_BRANCH:-}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
RALPH_API_URL="${RALPH_API_URL:-}"

# Workspace paths
WORKSPACE_DIR="/workspace"
REPO_DIR="${WORKSPACE_DIR}/repo"
PROMPT_FILE="${WORKSPACE_DIR}/PROMPT.md"
PROGRESS_FILE="${WORKSPACE_DIR}/PROGRESS.md"

# State
ITERATION=0
LAST_PROGRESS_HASH=""
STUCK_COUNTER=0
STUCK_THRESHOLD=3

# Logging (all output goes to Fly.io logs via stdout/stderr)
log() {
  echo "[$(date -Iseconds)] [ralph] $*"
}

warn() {
  echo "[$(date -Iseconds)] [warn] $*"
}

error() {
  echo "[$(date -Iseconds)] [error] $*" >&2
}

# API calls to update Ralph backend
api_update() {
  local data="$1"
  curl -sf -X PATCH "${RALPH_API_URL}/api/internal/workstreams/${WORKSTREAM_ID}" \
    -H "Content-Type: application/json" \
    -d "$data" 2>/dev/null || warn "Failed to update workstream"
}

api_update_status() {
  api_update "{\"status\": \"$1\"}"
}

api_update_iteration() {
  api_update "{\"currentIteration\": $1}"
}

api_upload_progress() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    curl -sf -X PUT "${RALPH_API_URL}/api/internal/workstreams/${WORKSTREAM_ID}/progress" \
      -H "Content-Type: text/markdown" \
      --data-binary @"$PROGRESS_FILE" 2>/dev/null || warn "Failed to upload progress"
  fi
}

# Check if workstream is marked complete
is_complete() {
  [[ -f "$PROGRESS_FILE" ]] && grep -qiE "^## Status: (COMPLETE|DONE|FINISHED)" "$PROGRESS_FILE"
}

# Get hash of PROGRESS.md to detect stuck state
get_progress_hash() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    md5sum "$PROGRESS_FILE" 2>/dev/null | cut -d' ' -f1 || echo "unknown"
  else
    echo "empty"
  fi
}

# Check if we're stuck (no progress for multiple iterations)
check_stuck() {
  local current_hash
  current_hash=$(get_progress_hash)

  if [[ "$current_hash" == "$LAST_PROGRESS_HASH" ]]; then
    STUCK_COUNTER=$((STUCK_COUNTER + 1))
    if [[ $STUCK_COUNTER -ge $STUCK_THRESHOLD ]]; then
      if is_complete; then
        log "Work complete (detected via stuck check)"
        return 1
      fi
      warn "No progress detected for $STUCK_COUNTER iterations"
      api_update_status "stuck"
      return 0
    fi
  else
    STUCK_COUNTER=0
    LAST_PROGRESS_HASH="$current_hash"
  fi
  return 1
}

# Commit and push changes
commit_changes() {
  cd "$REPO_DIR"
  if git status --porcelain 2>/dev/null | grep -q .; then
    git add -A
    git commit -m "chore(ralph): iteration $ITERATION

Co-Authored-By: Ralph <ralph@ralph.dev>" --no-verify 2>/dev/null || true
    log "Committed changes from iteration $ITERATION"

    # Push to remote
    if git push origin "$WORKSTREAM_BRANCH" 2>/dev/null; then
      log "Pushed changes to origin/$WORKSTREAM_BRANCH"
    else
      warn "Failed to push changes"
    fi
    return 0
  fi
  return 1
}

# Cleanup on exit
cleanup() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    if is_complete; then
      api_update_status "complete"
      log "Workstream marked as COMPLETE"
    else
      api_update_status "stopped"
      log "Workstream stopped (max iterations reached)"
    fi
  else
    api_update_status "error"
    error "Workstream failed with exit code $exit_code"
  fi
  log "Ralph loop exiting"
}
trap cleanup EXIT

# Validate environment
if [[ -z "$WORKSTREAM_ID" ]]; then
  error "Missing WORKSTREAM_ID"
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  error "Missing PROMPT.md at $PROMPT_FILE"
  exit 1
fi

# Initialize
cd "$REPO_DIR"
LAST_PROGRESS_HASH=$(get_progress_hash)

log "=========================================="
log "Ralph Cloud Loop Starting"
log "=========================================="
log "  Workstream: $WORKSTREAM_ID"
log "  Branch: $WORKSTREAM_BRANCH"
log "  Max iterations: $MAX_ITERATIONS"
log "=========================================="
echo ""

# Main loop
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  api_update_iteration "$ITERATION"

  log ""
  log "=========================================="
  log "=== Iteration $ITERATION of $MAX_ITERATIONS ==="
  log "=========================================="

  # Check if we're stuck
  if check_stuck; then
    :  # Continue anyway, status was updated
  fi

  # Build the combined prompt
  CLAUDE_INPUT=$(mktemp)
  {
    cat "$PROMPT_FILE"
    echo ""
    echo "---"
    echo ""
    echo "## Current Progress"
    echo ""
    if [[ -f "$PROGRESS_FILE" ]]; then
      cat "$PROGRESS_FILE"
    else
      echo "_No progress yet - this is the first iteration._"
    fi
    echo ""
    echo "---"
    echo ""
    echo "## Iteration Context"
    echo "- Workstream ID: $WORKSTREAM_ID"
    echo "- Branch: $WORKSTREAM_BRANCH"
    echo "- Iteration: $ITERATION of $MAX_ITERATIONS"
    echo "- Timestamp: $(date -Iseconds)"
    echo ""
    echo "## Instructions"
    echo "1. Read the progress above to understand current state"
    echo "2. Pick the next incomplete task from PROGRESS.md"
    echo "3. Make minimal, focused changes"
    echo "4. Update PROGRESS.md with what you accomplished"
    echo "5. If blocked or need input, write 'NEEDS_INPUT: <your question>' in PROGRESS.md"
    echo "6. When ALL tasks are complete, write '## Status: COMPLETE' in PROGRESS.md"
  } > "$CLAUDE_INPUT"

  # Run Claude Code
  api_update_status "running"
  EXIT_CODE=0
  if cat "$CLAUDE_INPUT" | claude --dangerously-skip-permissions 2>&1; then
    EXIT_CODE=0
  else
    EXIT_CODE=$?
    if [[ $EXIT_CODE -ne 130 ]]; then
      warn "Claude exited with code $EXIT_CODE"
    fi
  fi
  rm -f "$CLAUDE_INPUT"

  # Upload progress
  api_upload_progress

  # Check for completion
  if is_complete; then
    log "Workstream marked as COMPLETE!"
    commit_changes || true
    exit 0
  fi

  # Check for NEEDS_INPUT
  if [[ -f "$PROGRESS_FILE" ]] && grep -q "NEEDS_INPUT:" "$PROGRESS_FILE"; then
    question=$(grep "NEEDS_INPUT:" "$PROGRESS_FILE" | tail -1 | sed 's/.*NEEDS_INPUT://' | xargs)
    if [[ -n "$question" ]]; then
      log "Ralph has a question: $question"
      api_update "{\"status\": \"needs_input\", \"pendingQuestion\": \"$question\"}"

      # Wait for answer (poll every 30 seconds)
      log "Waiting for user input..."
      while true; do
        sleep 30
        response=$(curl -sf "${RALPH_API_URL}/api/internal/workstreams/${WORKSTREAM_ID}" 2>/dev/null || echo "{}")
        answer=$(echo "$response" | jq -r '.pendingAnswer // empty' 2>/dev/null || true)
        if [[ -n "$answer" ]]; then
          log "Received answer: $answer"
          # Append answer to progress
          {
            echo ""
            echo "---"
            echo "## User Answer (Iteration $ITERATION)"
            echo "$answer"
          } >> "$PROGRESS_FILE"
          api_update_status "running"
          break
        fi
        log "Still waiting for input..."
      done
    fi
  fi

  # Commit any changes
  if commit_changes; then
    STUCK_COUNTER=0
  fi

  # Brief pause between iterations
  sleep 2
done

log "Completed $MAX_ITERATIONS iterations"
