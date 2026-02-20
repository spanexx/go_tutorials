#!/bin/bash

# Ralph Communications Layer - IPC wrapper for multi-agent coordination
# Uses tools/comm Go binary for inter-process communication

set -e

COMMS_BIN="./tools/comm/comm"
COMMS_STATE=".ralph/state.json"
COMMS_QUEUE=".ralph/work-queue.json"
COMMS_RESULTS=".ralph/results.json"
COMMS_LOCK=".ralph/.lock"

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Initialize communication state
comms_init() {
    mkdir -p .ralph/sessions
    
    # Initialize work queue if not exists
    if [ ! -f "$COMMS_QUEUE" ]; then
        cat > "$COMMS_QUEUE" << 'EOF'
{
  "tasks": [],
  "active": false,
  "worker_count": 0,
  "completed": 0
}
EOF
    fi
    
    # Initialize results
    if [ ! -f "$COMMS_RESULTS" ]; then
        echo '{"findings": [], "issues": [], "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$COMMS_RESULTS"
    fi
}

# Reset orchestration state for a fresh run
comms_reset_state() {
    mkdir -p .ralph/sessions

    cat > "$COMMS_QUEUE" << 'EOF'
{
  "tasks": [],
  "active": false,
  "worker_count": 0,
  "completed": 0
}
EOF

    echo '{"findings": [], "issues": [], "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$COMMS_RESULTS"
}

# Register worker with orchestrator
comms_register_worker() {
    local worker_id=$1
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > ".ralph/sessions/worker-$worker_id.session" << EOF
{
  "worker_id": "$worker_id",
  "status": "active",
  "registered": "$timestamp",
  "last_heartbeat": "$timestamp",
  "iteration": 0,
  "findings": []
}
EOF
    
    echo -e "${GREEN}✓ Worker $worker_id registered${NC}"
}

# Claim work from queue (atomic operation)
comms_claim_work() {
    local worker_id=$1
    
    # Acquire lock
    exec 3>"$COMMS_LOCK"
    flock 3
    
    # Read queue
    if [ ! -f "$COMMS_QUEUE" ]; then
        flock -u 3
        return 1
    fi
    
    local task=$(jq -c '.tasks | map(select(.status == "pending")) | .[0]' "$COMMS_QUEUE" 2>/dev/null)
    
    if [ -z "$task" ] || [ "$task" == "null" ]; then
        flock -u 3
        return 1
    fi
    
    local task_id=$(echo "$task" | jq -r '.id')
    local claimed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Mark task as claimed
    jq --arg task_id "$task_id" \
       --arg worker_id "$worker_id" \
       --arg claimed_at "$claimed_at" \
       '.tasks |= map(if .id == $task_id then .status = "claimed" | .worker_id = $worker_id | .claimed_at = $claimed_at else . end)' \
       "$COMMS_QUEUE" > "$COMMS_QUEUE.tmp"
    mv "$COMMS_QUEUE.tmp" "$COMMS_QUEUE"
    
    # Release lock
    flock -u 3
    
    echo "$task_id"
    return 0
}

# Report work completion
comms_report_result() {
    local worker_id=$1
    local task_id=$2
    local findings=$3
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Acquire lock
    exec 3>"$COMMS_LOCK"
    flock 3

    # Update results with task-id mapped finding
    local finding_entry="{\"task_id\": \"$task_id\", \"worker_id\": \"$worker_id\", \"finding\": \"$findings\", \"timestamp\": \"$timestamp\"}"
    jq ".findings += [$finding_entry]" "$COMMS_RESULTS" > "$COMMS_RESULTS.tmp"
    mv "$COMMS_RESULTS.tmp" "$COMMS_RESULTS"

    # Mark task complete
    jq ".tasks[] |= if .id == \"$task_id\" then .status = \"completed\" | .worker_id = \"$worker_id\" | .completed_at = \"$timestamp\" else . end" "$COMMS_QUEUE" > "$COMMS_QUEUE.tmp"
    mv "$COMMS_QUEUE.tmp" "$COMMS_QUEUE"

    # Update worker session with task-specific finding
    jq ".findings += [{\"task_id\": \"$task_id\", \"finding\": \"$findings\", \"timestamp\": \"$timestamp\"}] | .iteration += 1" ".ralph/sessions/worker-$worker_id.session" > ".ralph/sessions/worker-$worker_id.session.tmp"
    mv ".ralph/sessions/worker-$worker_id.session.tmp" ".ralph/sessions/worker-$worker_id.session"

    # Release lock
    flock -u 3

    echo -e "${GREEN}✓ Worker $worker_id completed task $task_id${NC}"
}

# Report task failure (so tasks don't remain stuck in claimed)
comms_report_failure() {
    local worker_id=$1
    local task_id=$2
    local error_message=$3

    exec 3>"$COMMS_LOCK"
    flock 3

    jq --arg msg "$error_message" '.issues += [$msg]' "$COMMS_RESULTS" > "$COMMS_RESULTS.tmp"
    mv "$COMMS_RESULTS.tmp" "$COMMS_RESULTS"

    jq ".tasks[] |= if .id == \"$task_id\" then .status = \"failed\" | .worker_id = \"$worker_id\" | .failed_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .error = \"$error_message\" else . end" "$COMMS_QUEUE" > "$COMMS_QUEUE.tmp"
    mv "$COMMS_QUEUE.tmp" "$COMMS_QUEUE"

    flock -u 3

    echo -e "${RED}✗ Worker $worker_id failed task $task_id${NC}"
}

# Get worker heartbeat
comms_heartbeat() {
    local worker_id=$1
    
    if [ -f ".ralph/sessions/worker-$worker_id.session" ]; then
        jq ".last_heartbeat = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" ".ralph/sessions/worker-$worker_id.session" > ".ralph/sessions/worker-$worker_id.session.tmp"
        mv ".ralph/sessions/worker-$worker_id.session.tmp" ".ralph/sessions/worker-$worker_id.session"
        return 0
    fi
    return 1
}

# Queue a task
comms_enqueue_task() {
    local task_id=$1
    local task_type=$2
    local task_data=$3
    
    exec 3>"$COMMS_LOCK"
    flock 3
    
    jq ".tasks += [{\"id\": \"$task_id\", \"type\": \"$task_type\", \"data\": $task_data, \"status\": \"pending\", \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]" "$COMMS_QUEUE" > "$COMMS_QUEUE.tmp"
    mv "$COMMS_QUEUE.tmp" "$COMMS_QUEUE"
    
    flock -u 3
    
    echo -e "${BLUE}⚡ Queued task $task_id${NC}"
}

# Get queue status
comms_queue_status() {
    if [ ! -f "$COMMS_QUEUE" ]; then
        echo "Queue not initialized"
        return 1
    fi
    
    jq '.' "$COMMS_QUEUE"
}

# Human-readable queue summary (compact)
comms_queue_summary() {
    if [ ! -f "$COMMS_QUEUE" ]; then
        echo "Queue not initialized"
        return 1
    fi

    local total pending claimed completed failed
    total=$(jq '.tasks | length' "$COMMS_QUEUE" 2>/dev/null || echo "0")
    pending=$(jq '[.tasks[] | select(.status == "pending")] | length' "$COMMS_QUEUE" 2>/dev/null || echo "0")
    claimed=$(jq '[.tasks[] | select(.status == "claimed")] | length' "$COMMS_QUEUE" 2>/dev/null || echo "0")
    completed=$(jq '[.tasks[] | select(.status == "completed")] | length' "$COMMS_QUEUE" 2>/dev/null || echo "0")
    failed=$(jq '[.tasks[] | select(.status == "failed")] | length' "$COMMS_QUEUE" 2>/dev/null || echo "0")

    echo "total=$total pending=$pending claimed=$claimed completed=$completed failed=$failed"

    jq -r '.tasks[] | [
        (.status // ""),
        (.id // ""),
        (if (.worker_id // "") != "" then ("worker=" + .worker_id) else "" end),
        (if (.data.description // "") != "" then (.data.description | tostring) else "" end)
      ] | map(select(. != "")) | join(" | ")' "$COMMS_QUEUE" 2>/dev/null
}

# Get results
comms_get_results() {
    if [ ! -f "$COMMS_RESULTS" ]; then
        echo "No results available"
        return 1
    fi
    
    jq '.' "$COMMS_RESULTS"
}

# Wait for all workers to complete
comms_wait_all_workers() {
    local timeout=${1:-300}
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        local pending=$(jq '[.tasks[] | select(.status == "pending" or .status == "claimed")] | length' "$COMMS_QUEUE")
        
        if [ "$pending" -eq 0 ]; then
            echo -e "${GREEN}✓ All workers completed${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $pending pending tasks... ($elapsed/$timeout)${NC}"
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    echo -e "${RED}✗ Timeout waiting for workers${NC}"
    return 1
}

# Export functions for sourcing
export -f comms_init
export -f comms_reset_state
export -f comms_register_worker
export -f comms_claim_work
export -f comms_report_result
export -f comms_report_failure
export -f comms_heartbeat
export -f comms_enqueue_task
export -f comms_queue_status
export -f comms_queue_summary
export -f comms_get_results
export -f comms_wait_all_workers
