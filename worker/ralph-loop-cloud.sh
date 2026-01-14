#!/usr/bin/env bash
# ralph-loop-cloud.sh - Cloud-adapted Ralph iteration loop for AWS Fargate
# Runs in worker container, communicates with Vercel API for state management

set -euo pipefail

# Configuration from environment
WORKSTREAM_ID="${WORKSTREAM_ID:-}"
PROJECT_SLUG="${PROJECT_SLUG:-}"
BRANCH="${BRANCH:-}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
RALPH_API_URL="${RALPH_API_URL:-}"
RALPH_API_KEY="${RALPH_API_KEY:-}"

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

# Logging (all output goes to CloudWatch via stdout/stderr)
log() {
  echo "[$(date -Iseconds)] [INFO] $*"
}

warn() {
  echo "[$(date -Iseconds)] [WARN] $*"
}

error() {
  echo "[$(date -Iseconds)] [ERROR] $*" >&2
}

# API calls to update Vercel backend
api_update_status() {
  local status="$1"
  curl -sf -X PATCH "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}" \
    -H "Authorization: Bearer ${RALPH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"${status}\"}" 2>/dev/null || warn "Failed to update status to ${status}"
}

api_update_iteration() {
  local iteration="$1"
  curl -sf -X PATCH "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}" \
    -H "Authorization: Bearer ${RALPH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"current_iteration\": ${iteration}}" 2>/dev/null || warn "Failed to update iteration"
}

api_upload_progress() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    curl -sf -X PUT "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}/progress" \
      -H "Authorization: Bearer ${RALPH_API_KEY}" \
      -H "Content-Type: text/markdown" \
      --data-binary @"$PROGRESS_FILE" 2>/dev/null || warn "Failed to upload progress"
  fi
}

api_send_question() {
  local question="$1"
  curl -sf -X PATCH "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}" \
    -H "Authorization: Bearer ${RALPH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"needs_input\", \"pending_question\": \"${question}\"}" 2>/dev/null || warn "Failed to send question"
}

api_check_answer() {
  local response
  response=$(curl -sf "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}" \
    -H "Authorization: Bearer ${RALPH_API_KEY}" 2>/dev/null)

  if [[ -n "$response" ]]; then
    # Check if there's an answer
    local answer
    answer=$(echo "$response" | jq -r '.pending_answer // empty')
    if [[ -n "$answer" ]]; then
      echo "$answer"
      return 0
    fi
  fi
  return 1
}

api_update_metrics() {
  local tokens_in="$1"
  local tokens_out="$2"
  local cost="$3"

  curl -sf -X PATCH "${RALPH_API_URL}/api/workstreams/${WORKSTREAM_ID}/metrics" \
    -H "Authorization: Bearer ${RALPH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"tokens_in\": ${tokens_in}, \"tokens_out\": ${tokens_out}, \"cost\": ${cost}}" 2>/dev/null || warn "Failed to update metrics"
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
        log "Work complete (detected via STUCK check)"
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

# Commit changes
commit_changes() {
  cd "$REPO_DIR"
  if git status --porcelain 2>/dev/null | grep -q .; then
    git add -A
    git commit -m "chore(workstream): ralph iteration $ITERATION" --no-verify 2>/dev/null || true
    log "Committed changes from iteration $ITERATION"

    # Push to remote
    if git push origin "$BRANCH" 2>/dev/null; then
      log "Pushed changes to origin/$BRANCH"
    else
      warn "Failed to push changes"
    fi
    return 0
  fi
  return 1
}

# Parse metrics from Claude output
parse_metrics() {
  local output="$1"
  local tokens_in tokens_out cost

  tokens_in=$(echo "$output" | grep -oE '[0-9,]+\s*(input|in)\s*tokens?' | grep -oE '[0-9,]+' | tr -d ',' | tail -1 || echo "0")
  tokens_out=$(echo "$output" | grep -oE '[0-9,]+\s*(output|out)\s*tokens?' | grep -oE '[0-9,]+' | tr -d ',' | tail -1 || echo "0")
  cost=$(echo "$output" | grep -oE '\$[0-9]+\.[0-9]+' | tr -d '$' | tail -1 || echo "0")

  api_update_metrics "${tokens_in:-0}" "${tokens_out:-0}" "${cost:-0}"
}

# Cleanup on exit
cleanup() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    if is_complete; then
      api_update_status "complete"
    else
      api_update_status "stopped"
    fi
  else
    api_update_status "error"
  fi
  log "Ralph loop exiting with code $exit_code"
}
trap cleanup EXIT

# Validate environment
if [[ -z "$WORKSTREAM_ID" ]] || [[ -z "$RALPH_API_URL" ]] || [[ -z "$RALPH_API_KEY" ]]; then
  error "Missing required environment variables"
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  error "Missing PROMPT.md file at $PROMPT_FILE"
  exit 1
fi

# Initialize
cd "$REPO_DIR"
LAST_PROGRESS_HASH=$(get_progress_hash)

log "Starting Ralph Cloud Loop"
log "  Workstream ID: $WORKSTREAM_ID"
log "  Project: $PROJECT_SLUG"
log "  Branch: $BRANCH"
log "  Max iterations: $MAX_ITERATIONS"
echo ""

# Main loop
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  api_update_iteration "$ITERATION"

  log "=== Iteration $ITERATION of $MAX_ITERATIONS ==="

  # Check if we're stuck
  if check_stuck; then
    # Continue anyway, but status was updated
    :
  fi

  # Build the prompt with context
  CLAUDE_INPUT=$(mktemp)
  {
    cat "$PROMPT_FILE"
    echo ""
    echo "---"
    echo "## Current Progress"
    if [[ -f "$PROGRESS_FILE" ]]; then
      cat "$PROGRESS_FILE"
    else
      echo "_No progress yet - this is the first iteration._"
    fi
    echo ""
    echo "---"
    echo "## Iteration Info"
    echo "- Project: $PROJECT_SLUG"
    echo "- Workstream: $WORKSTREAM_ID"
    echo "- Branch: $BRANCH"
    echo "- Current iteration: $ITERATION of $MAX_ITERATIONS"
    echo "- Timestamp: $(date -Iseconds)"
    echo ""
    echo "## Instructions"
    echo "1. Read PROGRESS.md to understand current state"
    echo "2. Pick the next incomplete task"
    echo "3. Make minimal, focused changes"
    echo "4. Update PROGRESS.md with what you did"
    echo "5. If blocked or need input, write 'NEEDS_INPUT: <question>' to PROGRESS.md"
    echo "6. If all tasks complete, write '## Status: COMPLETE' to PROGRESS.md"
  } > "$CLAUDE_INPUT"

  # Run Claude and capture output
  api_update_status "running"
  claude_output=$(mktemp)
  EXIT_CODE=0
  if cat "$CLAUDE_INPUT" | claude --dangerously-skip-permissions 2>&1 | tee "$claude_output"; then
    EXIT_CODE=0
  else
    EXIT_CODE=$?
    warn "Iteration $ITERATION exited with code $EXIT_CODE"
  fi
  rm -f "$CLAUDE_INPUT"

  # Parse and update metrics
  parse_metrics "$(cat "$claude_output")"
  rm -f "$claude_output"

  # Check for errors
  if [[ $EXIT_CODE -ne 0 ]] && [[ $EXIT_CODE -ne 130 ]]; then
    api_update_status "error"
    error "Iteration $ITERATION failed with exit code $EXIT_CODE"
  fi

  # Upload progress to Vercel Blob
  api_upload_progress

  # Check for completion
  if is_complete; then
    log "Workstream marked as COMPLETE!"
    api_update_status "complete"
    commit_changes || true
    exit 0
  fi

  # Check for NEEDS_INPUT
  if [[ -f "$PROGRESS_FILE" ]] && grep -q "NEEDS_INPUT:" "$PROGRESS_FILE"; then
    local question
    question=$(grep "NEEDS_INPUT:" "$PROGRESS_FILE" | tail -1 | sed 's/.*NEEDS_INPUT://' | xargs)
    if [[ -n "$question" ]]; then
      log "Ralph has a question: $question"
      api_send_question "$question"

      # Wait for answer (check every 30 seconds)
      log "Waiting for answer..."
      while true; do
        sleep 30
        if answer=$(api_check_answer); then
          log "Received answer: $answer"
          # Append answer to progress file
          {
            echo ""
            echo "---"
            echo "## User Answer (Iteration $ITERATION)"
            echo "$answer"
          } >> "$PROGRESS_FILE"
          api_update_status "running"
          break
        fi
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

# Check if complete before marking stopped
if is_complete; then
  log "Workstream marked as COMPLETE (reached max iterations)"
  api_update_status "complete"
  exit 0
fi

log "Completed $MAX_ITERATIONS iterations"
api_update_status "stopped"
