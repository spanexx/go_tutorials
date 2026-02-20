#!/bin/bash
#
# Ralph Agent (Real-Time Worker)
# An agent that can execute tasks and chat with other agents
#

set -e

WORKER_ID=${1:-1}
ASSIGNED_TASK=${2:-""}
SESSION=${3:-"orchestrator"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Communication
COMMS_BIN="./tools/comm/comm"
CHAT_CHANNEL="agent-chat"
COMM_CLI="./tools/comm/comm"

# Register this agent
register() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > ".ralph/sessions/worker-$WORKER_ID.session" << EOF
{
  "worker_id": "$WORKER_ID",
  "status": "idle",
  "registered": "$timestamp",
  "last_heartbeat": "$timestamp",
  "task": "$ASSIGNED_TASK",
  "iteration": 0
}
EOF
    
    echo -e "${BLUE}[Agent $WORKER_ID]${NC} Registered"
    
    # Join chat
    send_chat "JOINED" "Worker $WORKER_ID ready for duty"
}

# Send chat message
send_chat() {
    local type=$1
    local msg=$2
    local timestamp=$(date '+%H:%M:%S')
    
    echo "[$timestamp] <Agent-$WORKER_ID:$type> $msg" >> .ralph/chat.log

    if [ -x "$COMM_CLI" ]; then
        "$COMM_CLI" write --from "Agent-$WORKER_ID" "[$type] $msg" >/dev/null 2>&1 || true
    fi

    # Mandatory worker -> orchestrator message channel
    if [ -p ".ralph/orchestrator.inbox" ]; then
        # tab-separated: worker_id, event_type, message
        printf "%s\t%s\t%s\n" "$WORKER_ID" "$type" "$msg" > .ralph/orchestrator.inbox 2>/dev/null || true
    fi
    
    # Send via comm binary
    if [ -x "$COMMS_BIN" ] && [ -S ".ralph/comm.sock" ]; then
        "$COMMS_BIN" send --channel "$CHAT_CHANNEL" --message "Agent-$WORKER_ID: [$type] $msg" 2>/dev/null || true
    fi
}

# Listen for chat messages
chat_listener() {
    if [ -x "$COMMS_BIN" ] && [ -S ".ralph/comm.sock" ]; then
        while true; do
            local msg
            msg=$("$COMMS_BIN" receive --channel "$CHAT_CHANNEL" --timeout 1 2>/dev/null) || continue
            if [ -n "$msg" ]; then
                handle_chat_message "$msg"
            fi
        done
    else
        # Fallback: watch chat log
        tail -f .ralph/chat.log 2>/dev/null | while read -r line; do
            handle_chat_message "$line"
        done
    fi
}

# Handle incoming chat message
handle_chat_message() {
    local msg="$1"
    
    # Don't echo own messages
    if [[ "$msg" == *"Agent-$WORKER_ID"* ]]; then
        return
    fi
    
    # Check for commands directed at this agent
    if [[ "$msg" == *"@Agent-$WORKER_ID"* ]] || [[ "$msg" == *"@all"* ]]; then
        echo -e "${MAGENTA}[Chat to $WORKER_ID]${NC} $msg"
        
        # Respond if it's a status request
        if [[ "$msg" == *"status"* ]]; then
            local current_task=$(jq -r '.task // "idle"' ".ralph/sessions/worker-$WORKER_ID.session")
            send_chat "STATUS" "Currently on task: $current_task"
        fi
    fi
}

# Update status
update_status() {
    local status=$1
    local task=${2:-""}
    
    jq --arg s "$status" --arg t "$task" '.status = $s | .task = $t | .last_heartbeat = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
        ".ralph/sessions/worker-$WORKER_ID.session" > ".ralph/sessions/worker-$WORKER_ID.session.tmp"
    mv ".ralph/sessions/worker-$WORKER_ID.session.tmp" ".ralph/sessions/worker-$WORKER_ID.session"
}

# Claim a task from the queue
claim_task() {
    local task_id=$(jq -r '.tasks | map(select(.status == "pending")) | .[0] | .id' .ralph/work-queue.json 2>/dev/null)
    
    if [ -n "$task_id" ] && [ "$task_id" != "null" ]; then
        # Claim atomically using file lock
        (
            flock -n 200 || return 1
            jq --arg tid "$task_id" --arg wid "$WORKER_ID" \
               '.tasks |= map(if .id == $tid then .status = "claimed" | .worker_id = $wid | .claimed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" else . end)' \
               .ralph/work-queue.json > .ralph/work-queue.json.tmp
            mv .ralph/work-queue.json.tmp .ralph/work-queue.json
        ) 200>.ralph/.lock
        
        echo "$task_id"
        return 0
    fi
    
    return 1
}

# Execute a task
execute_task() {
    local task_id=$1
    local task_data
    task_data=$(jq --arg tid "$task_id" '.tasks[] | select(.id == $tid)' .ralph/work-queue.json)
    
    update_status "working" "$task_id"
    send_chat "STARTED" "Starting task: $task_id"
    
    # Get task type and plan info
    local task_type=$(echo "$task_data" | jq -r '.type // "unknown"')
    local milestone_dir=$(echo "$task_data" | jq -r '.data.plan.milestone_dir // ""')
    local prd_item_id=$(echo "$task_data" | jq -r '.data.plan.prd_item_id // ""')
    
    echo -e "${YELLOW}[Agent $WORKER_ID]${NC} Executing $task_id (type: $task_type)"
    
    # Check if we have a real agent command
    if ! command -v qwen >/dev/null 2>&1; then
        send_chat "ERROR" "qwen not found, cannot execute task"
        fail_task "$task_id" "Agent binary not available"
        return 1
    fi
    
    # Build prompt based on task
    local prompt="You are Agent $WORKER_ID executing task $task_id."
    
    if [ -n "$milestone_dir" ] && [ -n "$prd_item_id" ]; then
        prompt="$prompt

This is a planned task from milestone: $milestone_dir
Target PRD item: $prd_item_id

Follow the /execute workflow:
1. Read README.md, tasks.md, prd.json, Progress.md in $milestone_dir
2. Implement exactly ONE PRD item end-to-end (no placeholders)
3. Update prd.json: set passes=true for the implemented item
4. Update Progress.md with what changed
5. Run the smallest relevant checks, then npm run build minimum

Task Data: $task_data"
    else
        prompt="$prompt

Execute this general development task:
1. Analyze current codebase
2. Identify ONE improvement
3. Implement with production-quality code
4. Validate with npm run build
5. Report findings

Task Data: $task_data"
    fi
    
    # Execute using a persistent UUID session per worker in YOLO mode
    local session_id_file=".ralph/sessions/worker-$WORKER_ID.qwen-session"
    local session_id=""

    if [ -f "$session_id_file" ]; then
        session_id=$(cat "$session_id_file" 2>/dev/null || true)
    fi

    if [ -z "$session_id" ]; then
        if command -v uuidgen >/dev/null 2>&1; then
            session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
        elif command -v python3 >/dev/null 2>&1; then
            session_id=$(python3 -c 'import uuid; print(str(uuid.uuid4()))' 2>/dev/null || true)
        elif command -v node >/dev/null 2>&1; then
            session_id=$(node -e 'console.log(require("crypto").randomUUID())' 2>/dev/null || true)
        fi

        if [ -n "$session_id" ]; then
            printf "%s" "$session_id" > "$session_id_file"
        fi
    fi

    if [ -z "$session_id" ]; then
        send_chat "ERROR" "Unable to generate UUID session id for qwen"
        fail_task "$task_id" "Unable to generate UUID session id for qwen"
        update_status "idle" ""
        return 1
    fi

    if AGENT_OUTPUT=$(qwen --session-id "$session_id" --approval-mode yolo -p "$prompt" 2>&1); then
        local findings=$(echo "$AGENT_OUTPUT" | head -30 | tr '\n' ' ')
        complete_task "$task_id" "$findings"
        send_chat "COMPLETED" "Finished task $task_id"
        update_status "idle" ""
        return 0
    else
        if echo "$AGENT_OUTPUT" | grep -qiE 'session id .*already in use'; then
            send_chat "ERROR" "qwen session already in use; rotating session id and retrying once"

            local new_session_id=""
            if command -v uuidgen >/dev/null 2>&1; then
                new_session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
            elif command -v python3 >/dev/null 2>&1; then
                new_session_id=$(python3 -c 'import uuid; print(str(uuid.uuid4()))' 2>/dev/null || true)
            elif command -v node >/dev/null 2>&1; then
                new_session_id=$(node -e 'console.log(require("crypto").randomUUID())' 2>/dev/null || true)
            fi

            if [ -n "$new_session_id" ]; then
                session_id="$new_session_id"
                printf "%s" "$session_id" > "$session_id_file"

                if AGENT_OUTPUT=$(qwen --session-id "$session_id" --approval-mode yolo -p "$prompt" 2>&1); then
                    local findings=$(echo "$AGENT_OUTPUT" | head -30 | tr '\n' ' ')
                    complete_task "$task_id" "$findings"
                    send_chat "COMPLETED" "Finished task $task_id"
                    update_status "idle" ""
                    return 0
                fi
            fi
        fi

        local error=$(echo "$AGENT_OUTPUT" | head -5 | tr '\n' ' ')
        fail_task "$task_id" "Agent execution failed: $error"
        send_chat "FAILED" "Task $task_id failed: $error"
        update_status "idle" ""
        return 1
    fi
}

# Mark task as completed
complete_task() {
    local task_id=$1
    local findings=$2
    
    (
        flock -n 200 || return 1
        jq --arg tid "$task_id" --arg fid "$findings" \
           '.tasks |= map(if .id == $tid then .status = "completed" | .completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .findings = $fid else . end)' \
           .ralph/work-queue.json > .ralph/work-queue.json.tmp
        mv .ralph/work-queue.json.tmp .ralph/work-queue.json
        
        jq --arg fid "$findings" '.findings += [$fid]' .ralph/results.json > .ralph/results.json.tmp
        mv .ralph/results.json.tmp .ralph/results.json
    ) 200>.ralph/.lock
    
    update_status "idle" ""
    echo -e "${GREEN}[Agent $WORKER_ID]${NC} Task completed: $task_id"
}

# Mark task as failed
fail_task() {
    local task_id=$1
    local error=$2
    
    (
        flock -n 200 || return 1
        jq --arg tid "$task_id" --arg err "$error" \
           '.tasks |= map(if .id == $tid then .status = "failed" | .failed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .error = $err else . end)' \
           .ralph/work-queue.json > .ralph/work-queue.json.tmp
        mv .ralph/work-queue.json.tmp .ralph/work-queue.json
        
        jq --arg err "Agent $WORKER_ID: $error" '.issues += [$err]' .ralph/results.json > .ralph/results.json.tmp
        mv .ralph/results.json.tmp .ralph/results.json
    ) 200>.ralph/.lock
    
    echo -e "${RED}[Agent $WORKER_ID]${NC} Task failed: $task_id - $error"
}

# Main agent loop
main_loop() {
    local iteration=0
    local max_iterations=100
    
    # Start chat listener in background
    chat_listener &
    local chat_pid=$!
    
    while [ $iteration -lt $max_iterations ]; do
        iteration=$((iteration + 1))
        
        # Check if we have an assigned task
        if [ -n "$ASSIGNED_TASK" ]; then
            execute_task "$ASSIGNED_TASK"
            ASSIGNED_TASK=""
        else
            # Try to claim a task
            local task_id
            if task_id=$(claim_task); then
                echo -e "${GREEN}[Agent $WORKER_ID]${NC} Claimed task: $task_id"
                execute_task "$task_id"
            else
                # No work available
                sleep 3
            fi
        fi
        
        # Heartbeat
        jq '.last_heartbeat = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .iteration = '$iteration \
            ".ralph/sessions/worker-$WORKER_ID.session" > ".ralph/sessions/worker-$WORKER_ID.session.tmp"
        mv ".ralph/sessions/worker-$WORKER_ID.session.tmp" ".ralph/sessions/worker-$WORKER_ID.session"
    done
    
    # Cleanup
    kill $chat_pid 2>/dev/null || true
    send_chat "LEFT" "Worker $WORKER_ID signing off"
}

# Cleanup on exit
cleanup() {
    update_status "offline"
    rm -f ".ralph/sessions/worker-$WORKER_ID.session" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run
register
main_loop
