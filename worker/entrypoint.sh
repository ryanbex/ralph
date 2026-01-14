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
  "PROJECT_SLUG"
  "REPO_URL"
  "BRANCH"
  "RALPH_API_URL"
  "RALPH_API_KEY"
  "PROMPT_BLOB_URL"
  "ANTHROPIC_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    error "Required environment variable $var is not set"
    exit 1
  fi
done

log "Starting Ralph worker for workstream: $WORKSTREAM_ID"
log "Project: $PROJECT_SLUG, Branch: $BRANCH"
log "Max iterations: ${MAX_ITERATIONS:-20}"

# Configure git
git config --global user.name "Ralph Worker"
git config --global user.email "ralph-worker@localhost"
git config --global init.defaultBranch main

# Clone the repository
log "Cloning repository: $REPO_URL"
if ! git clone "$REPO_URL" /workspace/repo 2>&1; then
  error "Failed to clone repository"
  exit 1
fi

cd /workspace/repo

# Checkout or create the branch
log "Checking out branch: $BRANCH"
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
else
  log "Branch does not exist, creating from main"
  git checkout -b "$BRANCH"
fi

# Download PROMPT.md from Vercel Blob
log "Downloading PROMPT.md from: $PROMPT_BLOB_URL"
if ! curl -fsSL "$PROMPT_BLOB_URL" -o /workspace/PROMPT.md 2>&1; then
  error "Failed to download PROMPT.md"
  exit 1
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

# Update status to running
log "Updating status to running"
curl -sf -X PATCH "$RALPH_API_URL/api/workstreams/$WORKSTREAM_ID" \
  -H "Authorization: Bearer $RALPH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "running"}' || log "Warning: Failed to update status"

# Launch the iteration loop
log "Launching iteration loop"
exec /usr/local/bin/ralph-loop-cloud.sh
