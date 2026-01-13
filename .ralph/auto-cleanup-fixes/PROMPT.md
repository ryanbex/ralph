# Ralph Workstream: Auto-Cleanup Fixes + Enhanced Status

## Objective
Fix bugs preventing automatic cleanup of completed workstreams and enhance the status command with table format, token tracking, and cost display.

## Problem Summary
Workstreams that complete successfully are not being auto-merged because:
1. Max iterations exit doesn't check for COMPLETE marker
2. STUCK detection doesn't check for COMPLETE marker
3. Only one completion pattern is recognized

## Implementation Tasks

### Phase 1: Bug Fixes (Priority)

#### Task 1.1: Fix max iterations exit
**File:** `bin/ralph-loop.sh`

Find the code after the main `while` loop ends (around line 540) and add a COMPLETE check before marking STOPPED:

```bash
done  # End of while loop

# Check if actually complete before marking stopped
if [[ -f "$PROGRESS_FILE" ]] && grep -q "^## Status: COMPLETE" "$PROGRESS_FILE"; then
    log "Workstream marked as COMPLETE (reached max iterations)"
    set_status "COMPLETE"
    if is_auto_merge_enabled; then
        auto_merge && exit 0
    fi
    exit 0
fi

log "Completed $MAX_ITERATIONS iterations"
set_status "STOPPED"
```

#### Task 1.2: Fix STUCK detection
**File:** `bin/ralph-loop.sh`

Find the STUCK detection code (around line 507-520, where `NO_PROGRESS_COUNT -ge 3` is checked) and add COMPLETE check:

```bash
if [[ $NO_PROGRESS_COUNT -ge 3 ]]; then
    # Check if actually complete before marking stuck
    if grep -q "^## Status: COMPLETE" "$PROGRESS_FILE" 2>/dev/null; then
        log "Work complete (detected via STUCK check)"
        set_status "COMPLETE"
        if is_auto_merge_enabled; then
            auto_merge && exit 0
        fi
        exit 0
    fi
    log "No progress detected for $NO_PROGRESS_COUNT iterations"
    set_status "STUCK"
    notify "Ralph Stuck" "${PROJECT}/${WORKSTREAM} - no progress for $NO_PROGRESS_COUNT iterations"
fi
```

#### Task 1.3: Add is_complete() helper function
**File:** `bin/ralph-loop.sh`

Add near other helper functions (around line 100):

```bash
# Check if workstream is marked complete
is_complete() {
    local progress_file="${1:-$PROGRESS_FILE}"
    [[ -f "$progress_file" ]] && grep -qiE "^## Status: (COMPLETE|DONE|FINISHED)" "$progress_file"
}
```

Then update all COMPLETE checks to use this function.

### Phase 2: Metrics Tracking

#### Task 2.1: Create metrics initialization
**File:** `bin/ralph-loop.sh`

Add function to initialize metrics.json when workstream starts:

```bash
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
```

Call this at workstream start.

#### Task 2.2: Create metrics update function
**File:** `bin/ralph-loop.sh`

Add function to parse Claude output and update metrics:

```bash
update_metrics() {
    local log_output="$1"
    local metrics_file="$STATE_DIR/metrics.json"

    # Parse token counts from Claude Code output
    # Look for patterns like "Input: 12345 tokens" or "tokens in: 12345"
    local new_tokens_in=$(echo "$log_output" | grep -oE '[0-9,]+\s*(input|in)\s*tokens?' | grep -oE '[0-9,]+' | tr -d ',' | tail -1)
    local new_tokens_out=$(echo "$log_output" | grep -oE '[0-9,]+\s*(output|out)\s*tokens?' | grep -oE '[0-9,]+' | tr -d ',' | tail -1)
    local new_cost=$(echo "$log_output" | grep -oE '\$[0-9]+\.[0-9]+' | tr -d '$' | tail -1)

    # Read current metrics
    if [[ -f "$metrics_file" ]]; then
        local current_in=$(jq -r '.tokens_in' "$metrics_file")
        local current_out=$(jq -r '.tokens_out' "$metrics_file")
        local current_cost=$(jq -r '.total_cost' "$metrics_file")
        local iterations=$(jq -r '.iterations_completed' "$metrics_file")

        # Update with new values
        local total_in=$((current_in + ${new_tokens_in:-0}))
        local total_out=$((current_out + ${new_tokens_out:-0}))
        local total_cost=$(echo "$current_cost + ${new_cost:-0}" | bc)
        local new_iterations=$((iterations + 1))

        # Write updated metrics
        jq --argjson ti "$total_in" --argjson to "$total_out" \
           --argjson tc "$total_cost" --argjson it "$new_iterations" \
           '.tokens_in = $ti | .tokens_out = $to | .total_cost = $tc | .iterations_completed = $it' \
           "$metrics_file" > "${metrics_file}.tmp" && mv "${metrics_file}.tmp" "$metrics_file"
    fi
}
```

Call this after each Claude iteration with the captured output.

### Phase 3: Enhanced Status Display

#### Task 3.1: Add get_metrics function
**File:** `bin/ralph`

Add helper function:

```bash
get_metrics() {
    local project=$1
    local workstream=$2
    local metrics_file="$STATE_DIR/$project/$workstream/metrics.json"
    if [[ -f "$metrics_file" ]]; then
        cat "$metrics_file"
    else
        echo '{"tokens_in":0,"tokens_out":0,"total_cost":0,"start_time":"","max_iterations":0,"iterations_completed":0}'
    fi
}

get_max_iterations() {
    local project=$1
    local workstream=$2
    local metrics=$(get_metrics "$project" "$workstream")
    echo "$metrics" | jq -r '.max_iterations // 100'
}

format_tokens() {
    local count=$1
    if [[ $count -ge 1000000 ]]; then
        printf "%.1fM" $(echo "$count / 1000000" | bc -l)
    elif [[ $count -ge 1000 ]]; then
        printf "%.1fK" $(echo "$count / 1000" | bc -l)
    else
        echo "$count"
    fi
}

format_duration() {
    local start_time=$1
    if [[ -z "$start_time" || "$start_time" == "null" ]]; then
        echo "-"
        return
    fi
    local start_sec=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s 2>/dev/null || echo 0)
    local now_sec=$(date +%s)
    local diff=$((now_sec - start_sec))

    if [[ $diff -ge 3600 ]]; then
        printf "%dh %dm" $((diff/3600)) $(((diff%3600)/60))
    elif [[ $diff -ge 60 ]]; then
        printf "%dm" $((diff/60))
    else
        printf "%ds" $diff
    fi
}
```

#### Task 3.2: Rewrite cmd_status function
**File:** `bin/ralph`

Replace the existing `cmd_status` function with table format:

```bash
cmd_status() {
    local project=$1
    local workstreams=$(get_workstreams "$project")

    if [[ -z "$workstreams" ]]; then
        echo ""
        echo -e "${BOLD}Ralph Workstreams - $project${RESET}"
        echo "=============================="
        echo ""
        echo "No workstreams running"
        echo ""
        echo "Start one with: ralph -p $project start <name>"
        return
    fi

    # Table header
    echo ""
    printf "┌────────────────────┬──────────┬────────────┬──────────┬─────────┬──────────┐\n"
    printf "│ %-18s │ %-8s │ %-10s │ %-8s │ %-7s │ %-8s │\n" \
           "Workstream" "Status" "Progress" "Tokens" "Cost" "Duration"
    printf "├────────────────────┼──────────┼────────────┼──────────┼─────────┼──────────┤\n"

    for ws in $workstreams; do
        local status=$(get_status "$project" "$ws")
        local iteration=$(get_iteration "$project" "$ws")
        local metrics=$(get_metrics "$project" "$ws")

        local max_iter=$(echo "$metrics" | jq -r '.max_iterations // 100')
        local tokens_in=$(echo "$metrics" | jq -r '.tokens_in // 0')
        local tokens_out=$(echo "$metrics" | jq -r '.tokens_out // 0')
        local total_tokens=$((tokens_in + tokens_out))
        local cost=$(echo "$metrics" | jq -r '.total_cost // 0')
        local start_time=$(echo "$metrics" | jq -r '.start_time // ""')

        local progress_pct=0
        [[ $max_iter -gt 0 ]] && progress_pct=$((iteration * 100 / max_iter))

        local tokens_fmt=$(format_tokens $total_tokens)
        local cost_fmt=$(printf "$%.2f" "$cost")
        local duration_fmt=$(format_duration "$start_time")
        local progress_fmt=$(printf "%2d/%-3d %2d%%" "$iteration" "$max_iter" "$progress_pct")

        # Status with color
        local status_display="$status"
        case "$status" in
            RUNNING)   status_display="${GREEN}RUNNING${RESET}" ;;
            COMPLETE)  status_display="${GREEN}COMPLETE${RESET}" ;;
            STOPPED)   status_display="${DIM}STOPPED${RESET}" ;;
            NEEDS_INPUT) status_display="${YELLOW}NEEDS_IN${RESET}" ;;
            STUCK)     status_display="${RED}STUCK${RESET}" ;;
            ERROR)     status_display="${RED}ERROR${RESET}" ;;
        esac

        printf "│ %-18s │ %-8s │ %-10s │ %-8s │ %-7s │ %-8s │\n" \
               "$ws" "$status_display" "$progress_fmt" "$tokens_fmt" "$cost_fmt" "$duration_fmt"
    done

    printf "└────────────────────┴──────────┴────────────┴──────────┴─────────┴──────────┘\n"
    echo ""
}
```

### Phase 4: Configuration

#### Task 4.1: Update example config
**File:** `examples/config.yaml`

Add pricing configuration section:

```yaml
# Model pricing ($ per million tokens)
pricing:
  claude-sonnet-4:
    input: 3.00
    output: 15.00
  claude-opus-4:
    input: 15.00
    output: 75.00
  claude-haiku-3.5:
    input: 0.80
    output: 4.00
```

## Instructions

1. Read PROGRESS.md to see what's done
2. Pick the next incomplete task (in order: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 4.1)
3. Read the relevant file before making changes
4. Make focused, minimal edits
5. Run `shellcheck bin/ralph bin/ralph-loop.sh` to verify
6. Update PROGRESS.md with completion status
7. If all tasks are done, write "## Status: COMPLETE"

## Constraints

- One task per iteration
- Always run shellcheck after changes
- Preserve existing functionality
- Test changes don't break existing scripts
- Use existing code patterns and style

## Verification

After all tasks complete:
1. `shellcheck bin/ralph bin/ralph-loop.sh` should pass (or have only minor warnings)
2. `ralph -p ralph status` should show table format
3. The auto-cleanup logic should trigger on completion
