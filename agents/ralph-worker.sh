#!/bin/bash

# Ralph Worker - Individual agent instance for parallel development
# Sources ralph-comms.sh for IPC coordination

set -e

WORKER_ID=${1:-1}
MAIN_SESSION=${2:-}

# Source communications layer
source ./ralph-comms.sh

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Ralph Worker #$WORKER_ID${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Register worker
comms_register_worker "$WORKER_ID"

# Main work loop
worker_main_loop() {
    local iteration=0
    local max_iterations=5
    
    while [ $iteration -lt $max_iterations ]; do
        iteration=$((iteration + 1))
        
        echo -e "\n${YELLOW}[Worker $WORKER_ID] Iteration $iteration/$max_iterations${NC}"
        
        # Claim work
        local task_id=$(comms_claim_work "$WORKER_ID" 2>/dev/null || echo "")
        
        if [ -z "$task_id" ]; then
            echo -e "${YELLOW}[Worker $WORKER_ID] No pending work, checking again...${NC}"
            sleep 2
            continue
        fi
        
        echo -e "${GREEN}[Worker $WORKER_ID] Claimed task: $task_id${NC}"

        local task_type=""
        local task_data="{}"
        if [ -f ".ralph/work-queue.json" ]; then
            task_type=$(jq -r --arg task_id "$task_id" '.tasks[] | select(.id == $task_id) | .type' ".ralph/work-queue.json" 2>/dev/null || echo "")
            task_data=$(jq -c --arg task_id "$task_id" '.tasks[] | select(.id == $task_id) | .data // {}' ".ralph/work-queue.json" 2>/dev/null || echo "{}")
        fi

        local milestone_dir=""
        local prd_item_id=""
        if [ "$task_data" != "{}" ]; then
            milestone_dir=$(echo "$task_data" | jq -r '.plan.milestone_dir // ""' 2>/dev/null || echo "")
            prd_item_id=$(echo "$task_data" | jq -r '.plan.prd_item_id // ""' 2>/dev/null || echo "")
        fi
        
        # Execute development iteration
        # [STARTING AGENT] Clear structured log line with task id
        echo -e "${BLUE}[Worker $WORKER_ID] [STARTING AGENT] task_id=$task_id iteration=$iteration/$max_iterations${NC}"

        # Create session for this worker
        local worker_session=""
        if [ -n "$MAIN_SESSION" ]; then
            # Reference main session for context
            worker_session="$MAIN_SESSION"
        else
            # Use isolated session for this worker
            worker_session="worker-$WORKER_ID-$(date +%s)"
        fi

        # Run qwen with task context
        PROMPT="You are Ralph Worker #$WORKER_ID executing iteration $iteration.

Task: $task_id
Task Type: ${task_type}
Task Data (JSON): ${task_data}

If this task references a milestone plan folder, you MUST follow the /execute workflow:
- Milestone folder: ${milestone_dir}
- Target PRD item id (implement exactly this one): ${prd_item_id}

Execute in this order:
1) Read milestone docs: README.md, tasks.md, prd.json, Progress.md.
2) Implement exactly ONE PRD item end-to-end (no placeholders). If prd_item_id is provided, implement that item.
3) Update tracking docs:
   - Set passes=true for the implemented PRD item in prd.json
   - Append a short entry to Progress.md with what changed
4) Run the smallest relevant checks and then repo defaults (npm run build at minimum).

Execute ONE focused development task:
1. Analyze current codebase state
2. Identify ONE clear improvement
3. Implement the improvement
4. Validate with npm build
5. Report findings

Keep it focused and atomic. Report what you changed and why."

        if ! command -v qwen >/dev/null 2>&1; then
            # [AGENT FINISHED] Clear structured log line with failure status
            echo -e "${RED}[Worker $WORKER_ID] [AGENT FINISHED] task_id=$task_id status=FAILURE reason=qwen_not_found${NC}"
            comms_report_failure "$WORKER_ID" "$task_id" "qwen not found in PATH"
        else
            if AGENT_OUTPUT=$(qwen --resume "$worker_session" --yolo -p "$PROMPT" 2>&1); then
                # [AGENT FINISHED] Clear structured log line with success status
                echo -e "${GREEN}[Worker $WORKER_ID] [AGENT FINISHED] task_id=$task_id status=SUCCESS${NC}"

                # Report findings
                local findings=$(echo "$AGENT_OUTPUT" | head -20 | tr '\n' ' ')
                comms_report_result "$WORKER_ID" "$task_id" "$findings"
            else
                local err_line
                err_line=$(echo "$AGENT_OUTPUT" | head -1 | tr '\n' ' ')
                # [AGENT FINISHED] Clear structured log line with failure status
                echo -e "${RED}[Worker $WORKER_ID] [AGENT FINISHED] task_id=$task_id status=FAILURE reason=agent_error${NC}"
                comms_report_failure "$WORKER_ID" "$task_id" "agent failed: ${err_line}"
            fi
        fi
        
        # Heartbeat
        comms_heartbeat "$WORKER_ID"
        
        sleep 2
    done
    
    echo -e "${GREEN}[Worker $WORKER_ID] Completed all iterations${NC}"
}

# Trap cleanup
trap 'echo "Worker $WORKER_ID shutting down..."; exit 0' SIGTERM SIGINT

# Run worker
worker_main_loop

# Update final status
jq ".status = \"completed\"" ".ralph/sessions/worker-$WORKER_ID.session" > ".ralph/sessions/worker-$WORKER_ID.session.tmp"
mv ".ralph/sessions/worker-$WORKER_ID.session.tmp" ".ralph/sessions/worker-$WORKER_ID.session"

echo -e "${GREEN}Worker $WORKER_ID finished${NC}"
