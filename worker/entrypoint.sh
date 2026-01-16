#!/bin/bash
# Ralph Worker Entrypoint
# Sets up the workspace and launches the iteration loop

set -euo pipefail

log() {
  echo "[$(date -Iseconds)] [ENTRYPOINT] $*"
}

error() {
  echo "[$(date -Iseconds)] [ERROR] $*" >&2
}

# Validate required environment variables
required_vars=(
  "WORKSTREAM_ID"
  "GITHUB_REPO_URL"
  "PROMPT_BLOB_URL"
  "ANTHROPIC_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    error "Required environment variable $var is not set"
    exit 1
  fi
done

# Default values
BASE_BRANCH="${BASE_BRANCH:-main}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
RALPH_API_URL="${RALPH_API_URL:-http://localhost:3000}"

log "Starting Ralph worker for workstream: $WORKSTREAM_ID"
log "Repo: $GITHUB_REPO_URL, Branch: ralph/workstream-${WORKSTREAM_ID:0:8}"
log "Max iterations: $MAX_ITERATIONS"

# Configure git
git config --global user.name "Ralph Worker"
git config --global user.email "ralph-worker@ralph.dev"
git config --global init.defaultBranch main

# Clone the repository
log "Cloning repository: $GITHUB_REPO_URL"
if ! git clone "$GITHUB_REPO_URL" /workspace/repo 2>&1; then
  error "Failed to clone repository"
  exit 1
fi

cd /workspace/repo

# Create a workstream branch from base branch
WORKSTREAM_BRANCH="ralph/workstream-${WORKSTREAM_ID:0:8}"
log "Creating workstream branch: $WORKSTREAM_BRANCH from $BASE_BRANCH"

# Checkout base branch first
git checkout "$BASE_BRANCH" 2>/dev/null || git checkout -b "$BASE_BRANCH"

# Create or checkout workstream branch
if git ls-remote --exit-code --heads origin "$WORKSTREAM_BRANCH" >/dev/null 2>&1; then
  log "Workstream branch exists, checking out"
  git checkout "$WORKSTREAM_BRANCH"
  git pull origin "$WORKSTREAM_BRANCH" || true
else
  log "Creating new workstream branch"
  git checkout -b "$WORKSTREAM_BRANCH"
fi

# Download PROMPT.md from Vercel Blob
log "Downloading PROMPT.md from: $PROMPT_BLOB_URL"
if ! curl -fsSL "$PROMPT_BLOB_URL" -o /workspace/PROMPT.md 2>&1; then
  error "Failed to download PROMPT.md"
  exit 1
fi

# Download PROGRESS.md if URL provided
if [[ -n "${PROGRESS_BLOB_URL:-}" ]]; then
  log "Downloading PROGRESS.md from: $PROGRESS_BLOB_URL"
  curl -fsSL "$PROGRESS_BLOB_URL" -o /workspace/PROGRESS.md 2>/dev/null || true
fi

# Create initial PROGRESS.md if it doesn't exist
if [[ ! -f /workspace/PROGRESS.md ]]; then
  cat > /workspace/PROGRESS.md << 'EOF'
# Progress

## Status
Starting workstream...

## Completed Tasks
(none yet)

## Current Task
Initializing

## Notes
EOF
fi

# Update status to running via API
log "Updating status to running"
curl -sf -X PATCH "$RALPH_API_URL/api/internal/workstreams/$WORKSTREAM_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "running"}' 2>/dev/null || log "Warning: Failed to update status (API may not be ready)"

# Export variables for the loop script
export WORKSTREAM_BRANCH
export BASE_BRANCH
export MAX_ITERATIONS
export RALPH_API_URL

# Launch the iteration loop
log "Launching iteration loop"
exec /usr/local/bin/ralph-loop-cloud.sh
