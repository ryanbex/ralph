#!/usr/bin/env bash
# ralph-loop.sh - Global Ralph iteration loop with multi-repo support
# Used by: ~/.ralph/bin/ralph start <project> <workstream>
# Runs in worktree directory, reads config from ~/.ralph/

set -euo pipefail

# Arguments
PROJECT=${1:-}
WORKSTREAM=${2:-}
MAX_ITERATIONS=${MAX_ITERATIONS:-100}

if [[ -z "$PROJECT" ]] || [[ -z "$WORKSTREAM" ]]; then
    echo "Usage: ralph-loop.sh <project> <workstream>"
    echo "This script is called by 'ralph start', not directly."
    exit 1
fi

# Global paths
RALPH_HOME="${RALPH_HOME:-$HOME/.ralph}"
CONFIG_FILE="$RALPH_HOME/config.yaml"
PROJECT_FILE="$RALPH_HOME/projects/${PROJECT}.yaml"
WORKSTREAM_DIR="$RALPH_HOME/workstreams/${PROJECT}/${WORKSTREAM}"
STATE_DIR="$RALPH_HOME/state/${PROJECT}/${WORKSTREAM}"
LOG_DIR="$RALPH_HOME/logs/${PROJECT}/${WORKSTREAM}"

# Files
PROMPT_FILE="${WORKSTREAM_DIR}/PROMPT.md"
PROGRESS_FILE="${WORKSTREAM_DIR}/PROGRESS.md"
STATUS_FILE="${STATE_DIR}/status"
ITERATION_FILE="${STATE_DIR}/iteration"
PID_FILE="${STATE_DIR}/pid"
QUESTION_FILE="${STATE_DIR}/question"
ANSWER_FILE="${STATE_DIR}/answer"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# State
ITERATION=0
LAST_PROGRESS_HASH=""
STUCK_COUNTER=0
STUCK_THRESHOLD=3  # Notify if no progress for 3 iterations

# Logging
log() { echo -e "${GREEN}[Ralph]${NC} $1"; }
warn() { echo -e "${YELLOW}[Ralph]${NC} $1"; }
error() { echo -e "${RED}[Ralph]${NC} $1"; }

# Get Bark URL from config
get_bark_url() {
    if [[ -f "$CONFIG_FILE" ]]; then
        grep -A2 "bark:" "$CONFIG_FILE" 2>/dev/null | grep "url:" | cut -d'"' -f2 || echo ""
    else
        echo ""
    fi
}

# Send Bark push notification
notify() {
    local title="$1"
    local message="$2"
    local bark_url
    bark_url=$(get_bark_url)

    if [[ -n "$bark_url" ]]; then
        # URL encode the message
        local encoded
        encoded=$(echo "$message" | jq -sRr @uri 2>/dev/null || echo "$message" | sed 's/ /%20/g')
        curl -s "${bark_url}/${title}/${encoded}" > /dev/null 2>&1 &
    fi
}

# Get project type (single-repo or multi-repo)
get_project_type() {
    if [[ -f "$PROJECT_FILE" ]]; then
        grep "^type:" "$PROJECT_FILE" | cut -d: -f2 | xargs
    else
        echo "single-repo"
    fi
}

# Get list of repos for multi-repo projects
get_repos() {
    if [[ -f "$PROJECT_FILE" ]]; then
        grep -A100 "^repos:" "$PROJECT_FILE" 2>/dev/null | grep "path:" | cut -d: -f2 | xargs || echo ""
    else
        echo ""
    fi
}

# Write status to state file
set_status() {
    echo "$1" > "$STATUS_FILE"
}

# Check if auto_merge is enabled
is_auto_merge_enabled() {
    if [[ -f "$CONFIG_FILE" ]]; then
        local value
        value=$(grep "auto_merge:" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f2 | xargs)
        [[ "$value" == "true" ]]
    else
        # Default to true
        return 0
    fi
}

# Get project root from project file
get_project_root() {
    if [[ -f "$PROJECT_FILE" ]]; then
        grep "^root:" "$PROJECT_FILE" | cut -d: -f2- | xargs
    else
        echo ""
    fi
}

# Get base branch from project file
get_base_branch() {
    if [[ -f "$PROJECT_FILE" ]]; then
        local branch
        branch=$(grep "^base_branch:" "$PROJECT_FILE" | cut -d: -f2 | xargs)
        echo "${branch:-main}"
    else
        echo "main"
    fi
}

# Perform auto-merge after completion
auto_merge() {
    log "Auto-merge enabled, merging workstream..."

    local project_type
    project_type=$(get_project_type)
    local project_root
    project_root=$(get_project_root)
    local base_branch
    base_branch=$(get_base_branch)
    local worktree_path="${project_root}-${WORKSTREAM}"

    if [[ "$project_type" == "multi-repo" ]]; then
        auto_merge_multi_repo "$project_root" "$base_branch" "$worktree_path"
    else
        auto_merge_single_repo "$project_root" "$base_branch" "$worktree_path"
    fi
}

# Auto-merge for single-repo projects
auto_merge_single_repo() {
    local project_root="$1"
    local base_branch="$2"
    local worktree_path="$3"
    local branch="ralph/${WORKSTREAM}"

    cd "$project_root"

    # Merge the branch
    log "Merging $branch into $base_branch..."
    if git merge "$branch" --no-edit 2>/dev/null; then
        log "Merge successful"

        # Remove worktree
        log "Removing worktree..."
        git worktree remove "$worktree_path" --force 2>/dev/null || true

        # Delete branch
        git branch -d "$branch" 2>/dev/null || git branch -D "$branch" 2>/dev/null || true

        # Clean up state
        rm -rf "$STATE_DIR"

        notify "Ralph Merged" "${PROJECT}/${WORKSTREAM} merged successfully"
        log "Auto-merge complete!"
        return 0
    else
        warn "Merge failed - manual cleanup required"
        notify "Ralph Merge Failed" "${PROJECT}/${WORKSTREAM} has conflicts"
        return 1
    fi
}

# Auto-merge for multi-repo projects
auto_merge_multi_repo() {
    local project_root="$1"
    local base_branch="$2"
    local worktree_path="$3"
    local branch="ralph/${WORKSTREAM}"
    local repos
    repos=$(get_repos)

    # First, check all repos can merge cleanly
    log "Checking all repos for merge conflicts..."
    for repo in $repos; do
        local repo_path="${project_root}/${repo}"
        cd "$repo_path"

        if ! git merge --no-commit --no-ff "$branch" 2>/dev/null; then
            git merge --abort 2>/dev/null || true
            warn "Merge would conflict in $repo - manual cleanup required"
            notify "Ralph Merge Failed" "${PROJECT}/${WORKSTREAM} has conflicts in $repo"
            return 1
        fi
        git merge --abort 2>/dev/null || true
    done

    # All clear, do the actual merges
    log "Merging all repos..."
    for repo in $repos; do
        local repo_path="${project_root}/${repo}"
        cd "$repo_path"

        log "Merging $repo..."
        git merge "$branch" --no-edit

        # Remove worktree for this repo
        git worktree remove "${worktree_path}/${repo}" --force 2>/dev/null || true

        # Delete branch
        git branch -d "$branch" 2>/dev/null || git branch -D "$branch" 2>/dev/null || true
    done

    # Remove unified worktree directory
    rmdir "$worktree_path" 2>/dev/null || rm -rf "$worktree_path" 2>/dev/null || true

    # Clean up state
    rm -rf "$STATE_DIR"

    notify "Ralph Merged" "${PROJECT}/${WORKSTREAM} merged across all repos"
    log "Auto-merge complete!"
    return 0
}

# Update iteration count
set_iteration() {
    echo "$1" > "$ITERATION_FILE"
}

# Commit changes in current repo or all repos (multi-repo)
commit_changes() {
    local project_type
    project_type=$(get_project_type)

    if [[ "$project_type" == "multi-repo" ]]; then
        commit_multi_repo
    else
        commit_single_repo
    fi
}

# Commit in single-repo project
commit_single_repo() {
    if git status --porcelain 2>/dev/null | grep -q .; then
        git add -A
        git commit -m "chore(${WORKSTREAM}): ralph iteration $ITERATION" --no-verify 2>/dev/null || true
        log "Committed changes from iteration $ITERATION"
        return 0
    fi
    return 1
}

# Commit in all repos of multi-repo project
# Note: For multi-repo, cwd is the unified worktree dir containing repo subdirs
commit_multi_repo() {
    local repos any_commit=false
    repos=$(get_repos)

    # We're in the unified worktree dir (e.g., /path/project-workstream/)
    # Each repo is a subdirectory with its own git worktree
    for repo in $repos; do
        local repo_path="${PWD}/${repo}"
        if [[ -d "$repo_path" ]] && [[ -d "$repo_path/.git" || -f "$repo_path/.git" ]]; then
            pushd "$repo_path" > /dev/null
            if git status --porcelain 2>/dev/null | grep -q .; then
                git add -A
                git commit -m "chore(${WORKSTREAM}): ralph iteration $ITERATION" --no-verify 2>/dev/null || true
                log "Committed changes in $repo from iteration $ITERATION"
                any_commit=true
            fi
            popd > /dev/null
        fi
    done

    [[ "$any_commit" == "true" ]]
}

# Get hash of PROGRESS.md to detect stuck state
get_progress_hash() {
    if [[ -f "$PROGRESS_FILE" ]]; then
        md5 -q "$PROGRESS_FILE" 2>/dev/null || md5sum "$PROGRESS_FILE" 2>/dev/null | cut -d' ' -f1
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
            warn "No progress detected for $STUCK_COUNTER iterations"
            set_status "STUCK"
            notify "Ralph Stuck" "${PROJECT}/${WORKSTREAM}: No progress for ${STUCK_COUNTER} iterations"
            return 0
        fi
    else
        STUCK_COUNTER=0
        LAST_PROGRESS_HASH="$current_hash"
    fi
    return 1
}

# Check if user has answered a pending question
check_for_answer() {
    if [[ -f "$ANSWER_FILE" ]] && [[ -f "$QUESTION_FILE" ]]; then
        local answer
        answer=$(cat "$ANSWER_FILE")
        log "Received answer: $answer"

        # Append answer to progress file
        {
            echo ""
            echo "---"
            echo "## User Answer (Iteration $ITERATION)"
            echo "$answer"
        } >> "$PROGRESS_FILE"

        # Clean up
        rm -f "$QUESTION_FILE" "$ANSWER_FILE"
        set_status "RUNNING"
    fi
}

# Check for stop signals
check_stop_signals() {
    # Global stop
    if [[ -f "$RALPH_HOME/.stop-all" ]]; then
        log "Global stop signal detected. Exiting gracefully."
        return 0
    fi

    # Project stop
    if [[ -f "$RALPH_HOME/state/${PROJECT}/.stop" ]]; then
        log "Project stop signal detected. Exiting gracefully."
        return 0
    fi

    # Workstream stop
    if [[ -f "${STATE_DIR}/.stop" ]]; then
        log "Workstream stop signal detected. Exiting gracefully."
        rm -f "${STATE_DIR}/.stop"
        return 0
    fi

    return 1
}

# Cleanup on exit
cleanup() {
    rm -f "$PID_FILE"

    local status
    status=$(cat "$STATUS_FILE" 2>/dev/null || echo "UNKNOWN")

    case "$status" in
        RUNNING)
            set_status "STOPPED"
            ;;
        COMPLETE)
            notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} completed successfully!"
            ;;
        ERROR)
            notify "Ralph Error" "${PROJECT}/${WORKSTREAM} exited with error"
            ;;
    esac

    log "Ralph loop exiting"
}
trap cleanup EXIT

# Pre-flight checks
if [[ ! -f "$PROJECT_FILE" ]]; then
    error "Project not found: $PROJECT"
    error "Register it first: ralph projects add"
    exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
    error "Missing prompt file: $PROMPT_FILE"
    error "Create workstream config first"
    exit 1
fi

# Initialize state
mkdir -p "$STATE_DIR" "$LOG_DIR"
echo $$ > "$PID_FILE"
set_status "RUNNING"
set_iteration 0
LAST_PROGRESS_HASH=$(get_progress_hash)

# Start logging
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%dT%H-%M-%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log "Starting Ralph: ${PROJECT}/${WORKSTREAM}"
log "  Max iterations: $MAX_ITERATIONS"
log "  Prompt: $PROMPT_FILE"
log "  Progress: $PROGRESS_FILE"
log "  Log: $LOG_FILE"
log "  Project type: $(get_project_type)"
echo ""

# Main loop
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    set_iteration "$ITERATION"

    log "=== [${PROJECT}/${WORKSTREAM}] Iteration $ITERATION of $MAX_ITERATIONS ==="

    # Check for stop signals
    if check_stop_signals; then
        set_status "STOPPED"
        exit 0
    fi

    # Check for user answers
    check_for_answer

    # Check if we're stuck
    if check_stuck; then
        # Continue anyway, but notification was sent
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
        echo "- Project: $PROJECT"
        echo "- Workstream: $WORKSTREAM"
        echo "- Branch: ralph/${WORKSTREAM}"
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

    # Run Claude
    set_status "RUNNING"
    if cat "$CLAUDE_INPUT" | claude --dangerously-skip-permissions; then
        EXIT_CODE=0
    else
        EXIT_CODE=$?
        warn "Iteration $ITERATION exited with code $EXIT_CODE"
    fi
    rm -f "$CLAUDE_INPUT"

    # Check for errors
    if [[ $EXIT_CODE -ne 0 ]] && [[ $EXIT_CODE -ne 130 ]]; then
        # 130 is Ctrl-C, which is expected
        set_status "ERROR"
        notify "Ralph Error" "${PROJECT}/${WORKSTREAM} iteration $ITERATION failed (exit $EXIT_CODE)"
    fi

    # Check for completion marker in PROGRESS.md
    if [[ -f "$PROGRESS_FILE" ]] && grep -q "^## Status: COMPLETE" "$PROGRESS_FILE"; then
        log "Workstream marked as COMPLETE!"
        set_status "COMPLETE"

        # Auto-merge if enabled
        if is_auto_merge_enabled; then
            if auto_merge; then
                exit 0
            else
                # Merge failed, but workstream is complete
                notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} complete (manual merge needed)"
                exit 0
            fi
        else
            notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} complete"
            exit 0
        fi
    fi

    # Check for NEEDS_INPUT marker
    if [[ -f "$PROGRESS_FILE" ]] && grep -q "NEEDS_INPUT:" "$PROGRESS_FILE"; then
        local question
        question=$(grep "NEEDS_INPUT:" "$PROGRESS_FILE" | tail -1 | sed 's/.*NEEDS_INPUT://' | xargs)
        if [[ -n "$question" ]]; then
            log "Ralph has a question: $question"
            echo "$question" > "$QUESTION_FILE"
            set_status "NEEDS_INPUT"
            notify "Ralph Question" "$question"

            # Wait for answer (check every 10 seconds)
            log "Waiting for answer... Use: ralph -p $PROJECT answer $WORKSTREAM"
            while [[ ! -f "$ANSWER_FILE" ]]; do
                sleep 10

                # Check for stop signals while waiting
                if check_stop_signals; then
                    set_status "STOPPED"
                    exit 0
                fi
            done

            # Answer received, continue loop
            check_for_answer
        fi
    fi

    # Commit any changes
    if commit_changes; then
        STUCK_COUNTER=0  # Reset stuck counter on successful commit
    fi

    # Brief pause between iterations
    sleep 2
done

log "Completed $MAX_ITERATIONS iterations"
set_status "STOPPED"
notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} finished $MAX_ITERATIONS iterations"
