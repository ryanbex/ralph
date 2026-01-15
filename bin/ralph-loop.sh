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

# Files - config paths (source of truth)
PROMPT_FILE="${WORKSTREAM_DIR}/PROMPT.md"
PROGRESS_FILE_CONFIG="${WORKSTREAM_DIR}/PROGRESS.md"
STATUS_FILE="${STATE_DIR}/status"

# Local progress file in worktree (set after we know cwd)
PROGRESS_FILE_LOCAL=""
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

# Event streaming - emit events to global stream for `ralph watch`
EVENTS_DIR="$RALPH_HOME/events"
EVENTS_FILE="$EVENTS_DIR/stream"

emit_event() {
    local event_type="$1"
    shift
    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Ensure events directory exists
    mkdir -p "$EVENTS_DIR"

    # Build JSON event
    local json
    case "$event_type" in
        iteration_start)
            local iter="$1" max="$2"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"iteration_start","iter":%d,"max":%d}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "$iter" "$max")
            ;;
        iteration_end)
            local iter="$1" exit_code="$2" cost="$3" tokens_in="$4" tokens_out="$5"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"iteration_end","iter":%d,"exit_code":%d,"cost":%s,"tokens_in":%d,"tokens_out":%d}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "$iter" "$exit_code" "$cost" "$tokens_in" "$tokens_out")
            ;;
        status_change)
            local status="$1" msg="$2"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"status","status":"%s","msg":"%s"}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "$status" "${msg//\"/\\\"}")
            ;;
        needs_input)
            local question="$1"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"needs_input","question":"%s"}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "${question//\"/\\\"}")
            ;;
        progress)
            local msg="$1"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"progress","msg":"%s"}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "${msg//\"/\\\"}")
            ;;
        complete)
            local final_status="$1"
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"complete","status":"%s"}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "$final_status")
            ;;
        *)
            json=$(printf '{"ts":"%s","project":"%s","ws":"%s","event":"%s"}' \
                   "$ts" "$PROJECT" "$WORKSTREAM" "$event_type")
            ;;
    esac

    # Append to event stream
    echo "$json" >> "$EVENTS_FILE"

    # Rotate if file gets too big (> 1MB)
    if [[ -f "$EVENTS_FILE" ]]; then
        local size
        size=$(stat -f%z "$EVENTS_FILE" 2>/dev/null || stat -c%s "$EVENTS_FILE" 2>/dev/null || echo 0)
        if [[ $size -gt 1048576 ]]; then
            # Keep last 1000 lines
            tail -1000 "$EVENTS_FILE" > "${EVENTS_FILE}.tmp" && mv "${EVENTS_FILE}.tmp" "$EVENTS_FILE"
        fi
    fi
}

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

# Set up local PROGRESS.md in worktree and sync with config
setup_progress_file() {
    PROGRESS_FILE_LOCAL="${PWD}/PROGRESS.md"

    # If local doesn't exist but config does, copy it
    if [[ ! -f "$PROGRESS_FILE_LOCAL" ]] && [[ -f "$PROGRESS_FILE_CONFIG" ]]; then
        cp "$PROGRESS_FILE_CONFIG" "$PROGRESS_FILE_LOCAL"
        log "Copied PROGRESS.md from config to worktree"
    fi

    # If neither exists, create a default one
    if [[ ! -f "$PROGRESS_FILE_LOCAL" ]]; then
        cat > "$PROGRESS_FILE_LOCAL" << 'EOF'
# Progress

## Status: IN_PROGRESS

## Completed
- (none yet)

## Current Task
- Starting work

## Remaining
- Review requirements
- Implement changes
- Test and verify
EOF
        log "Created default PROGRESS.md"
    fi
}

# Sync local PROGRESS.md back to config directory
sync_progress_file() {
    if [[ -f "$PROGRESS_FILE_LOCAL" ]]; then
        cp "$PROGRESS_FILE_LOCAL" "$PROGRESS_FILE_CONFIG"
    fi
}

# Check if workstream is marked complete
is_complete() {
    local progress_file="${1:-$PROGRESS_FILE_LOCAL}"
    [[ -f "$progress_file" ]] && grep -qiE "^## Status: (COMPLETE|DONE|FINISHED)" "$progress_file"
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

# Archive workstream metrics before cleanup
archive_workstream() {
    local project="$1"
    local workstream="$2"
    local final_status="$3"

    local state_dir="$RALPH_HOME/state/${project}/${workstream}"
    local metrics_file="${state_dir}/metrics.json"
    local history_file="$RALPH_HOME/archive/history.json"

    if [[ -f "$metrics_file" ]]; then
        mkdir -p "$RALPH_HOME/archive"

        # Build record with project/workstream/status/end_time
        local record
        record=$(jq -c --arg p "$project" --arg w "$workstream" \
                      --arg s "$final_status" \
                      --arg et "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                      '. + {project: $p, workstream: $w, status: $s, end_time: $et}' \
                      "$metrics_file" 2>/dev/null)

        if [[ -n "$record" ]]; then
            echo "$record" >> "$history_file"
            log "Archived metrics for ${project}/${workstream}"
        fi
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

        # Archive metrics before cleanup
        archive_workstream "$PROJECT" "$WORKSTREAM" "COMPLETE"
        touch "$STATE_DIR/.archived"

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

    # Archive metrics before cleanup
    archive_workstream "$PROJECT" "$WORKSTREAM" "COMPLETE"
    touch "$STATE_DIR/.archived"

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

# Initialize metrics tracking
init_metrics() {
    local metrics_file="$STATE_DIR/metrics.json"
    cat > "$metrics_file" << EOF
{
  "tokens_in": 0,
  "tokens_out": 0,
  "total_cost": 0.00,
  "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "max_iterations": $MAX_ITERATIONS,
  "iterations_completed": 0
}
EOF
}

# Update metrics after each iteration
# Takes path to JSON output file from claude --output-format json
update_metrics() {
    local json_file="$1"
    local metrics_file="$STATE_DIR/metrics.json"

    # Validate JSON file exists and has content
    if [[ ! -f "$json_file" ]] || [[ ! -s "$json_file" ]]; then
        warn "No JSON output from Claude iteration $ITERATION - metrics not updated"
        return 1
    fi

    # Parse from Claude JSON output (--output-format json)
    local new_in new_out new_cost
    new_in=$(jq -r '.usage.input_tokens // 0' "$json_file" 2>/dev/null)
    new_out=$(jq -r '.usage.output_tokens // 0' "$json_file" 2>/dev/null)
    new_cost=$(jq -r '.total_cost_usd // 0' "$json_file" 2>/dev/null)

    # Include cache tokens in input count (cache creation and reads are billed as input tokens)
    local cache_create cache_read
    cache_create=$(jq -r '.usage.cache_creation_input_tokens // 0' "$json_file" 2>/dev/null)
    cache_read=$(jq -r '.usage.cache_read_input_tokens // 0' "$json_file" 2>/dev/null)

    # Validate numeric values (jq can return "null" string instead of empty)
    [[ "$new_in" =~ ^[0-9]+$ ]] || new_in=0
    [[ "$new_out" =~ ^[0-9]+$ ]] || new_out=0
    [[ "$new_cost" =~ ^[0-9.]+$ ]] || new_cost=0
    [[ "$cache_create" =~ ^[0-9]+$ ]] || cache_create=0
    [[ "$cache_read" =~ ^[0-9]+$ ]] || cache_read=0

    new_in=$((new_in + cache_create + cache_read))

    # Read current metrics and update
    if [[ -f "$metrics_file" ]]; then
        local cur_in cur_out cur_cost iters
        cur_in=$(jq -r '.tokens_in // 0' "$metrics_file")
        cur_out=$(jq -r '.tokens_out // 0' "$metrics_file")
        cur_cost=$(jq -r '.total_cost // 0' "$metrics_file")
        iters=$(jq -r '.iterations_completed // 0' "$metrics_file")

        # Validate current values too
        [[ "$cur_in" =~ ^[0-9]+$ ]] || cur_in=0
        [[ "$cur_out" =~ ^[0-9]+$ ]] || cur_out=0
        [[ "$cur_cost" =~ ^[0-9.]+$ ]] || cur_cost=0
        [[ "$iters" =~ ^[0-9]+$ ]] || iters=0

        # Update with new values
        local total_in=$((cur_in + new_in))
        local total_out=$((cur_out + new_out))
        local total_cost
        total_cost=$(echo "$cur_cost + $new_cost" | bc -l)
        local new_iters=$((iters + 1))

        # Write updated metrics
        jq --argjson ti "$total_in" --argjson to "$total_out" \
           --arg tc "$total_cost" --argjson it "$new_iters" \
           '.tokens_in = $ti | .tokens_out = $to | .total_cost = ($tc | tonumber) | .iterations_completed = $it' \
           "$metrics_file" > "${metrics_file}.tmp" && mv "${metrics_file}.tmp" "$metrics_file"
    fi
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
    if [[ -n "$PROGRESS_FILE_LOCAL" ]] && [[ -f "$PROGRESS_FILE_LOCAL" ]]; then
        md5 -q "$PROGRESS_FILE_LOCAL" 2>/dev/null || md5sum "$PROGRESS_FILE_LOCAL" 2>/dev/null | cut -d' ' -f1
    elif [[ -f "$PROGRESS_FILE_CONFIG" ]]; then
        md5 -q "$PROGRESS_FILE_CONFIG" 2>/dev/null || md5sum "$PROGRESS_FILE_CONFIG" 2>/dev/null | cut -d' ' -f1
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
            # Check if actually complete before marking stuck
            if is_complete; then
                log "Work complete (detected via STUCK check)"
                set_status "COMPLETE"
                if is_auto_merge_enabled; then
                    auto_merge && exit 0
                fi
                exit 0
            fi
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

        # Append answer to progress file (use local if available)
        local progress_target="${PROGRESS_FILE_LOCAL:-$PROGRESS_FILE_CONFIG}"
        {
            echo ""
            echo "---"
            echo "## User Answer (Iteration $ITERATION)"
            echo "$answer"
        } >> "$progress_target"

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

    # Sync progress one last time
    sync_progress_file 2>/dev/null || true

    local status
    status=$(cat "$STATUS_FILE" 2>/dev/null || echo "UNKNOWN")
    local final_status="$status"

    case "$status" in
        RUNNING|STOPPING)
            set_status "STOPPED"
            final_status="STOPPED"
            ;;
        COMPLETE)
            notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} completed successfully!"
            ;;
        ERROR)
            notify "Ralph Error" "${PROJECT}/${WORKSTREAM} exited with error"
            ;;
    esac

    # Add end_time to metrics before archiving
    local metrics_file="$STATE_DIR/metrics.json"
    if [[ -f "$metrics_file" ]]; then
        local end_time
        end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        jq --arg et "$end_time" '. + {end_time: $et}' "$metrics_file" > "${metrics_file}.tmp" 2>/dev/null && \
            mv "${metrics_file}.tmp" "$metrics_file"
    fi

    # Archive workstream metrics on any exit (unless already archived by auto-merge)
    if [[ -f "$STATE_DIR/metrics.json" ]] && [[ ! -f "$STATE_DIR/.archived" ]]; then
        archive_workstream "$PROJECT" "$WORKSTREAM" "$final_status"
        touch "$STATE_DIR/.archived"
    fi

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
init_metrics

# Set up local PROGRESS.md in worktree
setup_progress_file
LAST_PROGRESS_HASH=$(get_progress_hash)

# Start logging
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%dT%H-%M-%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log "Starting Ralph: ${PROJECT}/${WORKSTREAM}"
log "  Max iterations: $MAX_ITERATIONS"
log "  Prompt: $PROMPT_FILE"
log "  Progress: $PROGRESS_FILE_LOCAL"
log "  Log: $LOG_FILE"
log "  Project type: $(get_project_type)"
echo ""

# Emit start event
emit_event "status_change" "RUNNING" "Starting workstream"

# Main loop
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    set_iteration "$ITERATION"

    log "=== [${PROJECT}/${WORKSTREAM}] Iteration $ITERATION of $MAX_ITERATIONS ==="

    # Emit iteration start event
    emit_event "iteration_start" "$ITERATION" "$MAX_ITERATIONS"

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
        if [[ -f "$PROGRESS_FILE_LOCAL" ]]; then
            cat "$PROGRESS_FILE_LOCAL"
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
        echo "- Progress file: PROGRESS.md (in current directory)"
        echo ""
        echo "## Instructions"
        echo "1. Review the Current Progress section above"
        echo "2. Pick the next incomplete task from the Remaining list"
        echo "3. Make minimal, focused changes to complete that task"
        echo "4. **IMPORTANT**: Update ./PROGRESS.md file to reflect what you completed:"
        echo "   - Move completed tasks from Remaining to Completed"
        echo "   - Update Current Task to the next item"
        echo "   - Add any notes about what was done"
        echo "5. If blocked or need user input, add 'NEEDS_INPUT: <your question>' to PROGRESS.md"
        echo "6. If ALL tasks are complete, change the Status line to: '## Status: COMPLETE'"
    } > "$CLAUDE_INPUT"

    # Run Claude with JSON output format for metrics capture
    set_status "RUNNING"
    claude_output=$(mktemp)
    claude_json=$(mktemp)
    if cat "$CLAUDE_INPUT" | claude --dangerously-skip-permissions --print --output-format json > "$claude_json" 2>&1; then
        EXIT_CODE=0
        # Extract text result for logging
        jq -r '.result // empty' "$claude_json" 2>/dev/null | tee "$claude_output"
    else
        EXIT_CODE=$?
        warn "Iteration $ITERATION exited with code $EXIT_CODE"
        # On error, output may still have useful info
        cat "$claude_json" 2>/dev/null | tee "$claude_output"
    fi
    rm -f "$CLAUDE_INPUT"

    # Update metrics from JSON output (don't exit on failure)
    update_metrics "$claude_json" || warn "Failed to update metrics for iteration $ITERATION"

    # Emit iteration end event with metrics
    local iter_tokens_in iter_tokens_out iter_cost
    iter_tokens_in=$(jq -r '.usage.input_tokens // 0' "$claude_json" 2>/dev/null || echo 0)
    iter_tokens_out=$(jq -r '.usage.output_tokens // 0' "$claude_json" 2>/dev/null || echo 0)
    iter_cost=$(jq -r '.total_cost_usd // 0' "$claude_json" 2>/dev/null || echo 0)
    emit_event "iteration_end" "$ITERATION" "$EXIT_CODE" "$iter_cost" "$iter_tokens_in" "$iter_tokens_out"

    rm -f "$claude_output" "$claude_json"

    # Check for errors
    if [[ $EXIT_CODE -ne 0 ]] && [[ $EXIT_CODE -ne 130 ]]; then
        # 130 is Ctrl-C, which is expected
        set_status "ERROR"
        emit_event "status_change" "ERROR" "Iteration $ITERATION failed (exit $EXIT_CODE)"
        notify "Ralph Error" "${PROJECT}/${WORKSTREAM} iteration $ITERATION failed (exit $EXIT_CODE)"
    fi

    # Check for completion marker in PROGRESS.md
    if is_complete; then
        log "Workstream marked as COMPLETE!"
        set_status "COMPLETE"
        emit_event "complete" "COMPLETE"

        # Auto-merge if enabled
        if is_auto_merge_enabled; then
            if auto_merge; then
                emit_event "status_change" "MERGED" "Auto-merged successfully"
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
    if [[ -f "$PROGRESS_FILE_LOCAL" ]] && grep -q "NEEDS_INPUT:" "$PROGRESS_FILE_LOCAL"; then
        local question
        question=$(grep "NEEDS_INPUT:" "$PROGRESS_FILE_LOCAL" | tail -1 | sed 's/.*NEEDS_INPUT://' | xargs)
        if [[ -n "$question" ]]; then
            log "Ralph has a question: $question"
            echo "$question" > "$QUESTION_FILE"
            set_status "NEEDS_INPUT"
            emit_event "needs_input" "$question"
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

    # Sync progress file back to config directory
    sync_progress_file

    # Brief pause between iterations
    sleep 2
done

# Check if actually complete before marking stopped
if is_complete; then
    log "Workstream marked as COMPLETE (reached max iterations)"
    set_status "COMPLETE"
    emit_event "complete" "COMPLETE"
    if is_auto_merge_enabled; then
        auto_merge && emit_event "status_change" "MERGED" "Auto-merged" && exit 0
    fi
    exit 0
fi

log "Completed $MAX_ITERATIONS iterations"
set_status "STOPPED"
emit_event "status_change" "STOPPED" "Reached max iterations ($MAX_ITERATIONS)"
notify "Ralph Complete" "${PROJECT}/${WORKSTREAM} finished $MAX_ITERATIONS iterations"
