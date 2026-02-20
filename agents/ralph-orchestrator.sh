#!/bin/bash

# Ralph Orchestrator - Master coordinator for multi-agent development
# Spawns N workers and coordinates work distribution

set -e

NUM_WORKERS=${1:-3}
TASKS_FILE=${2:-docs/PLAN}
ORCHESTRATOR_SESSION="orchestrator-$(date +%s)"

# Source communications layer
source ./ralph-comms.sh

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

banner() {
    echo -e "${MAGENTA}"
    echo "╔════════════════════════════════════════════╗"
    echo "║   Ralph Multi-Agent Orchestrator            ║"
    echo "║   Autonomous Development System v2.0         ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Initialize coordination
orchestrator_init() {
    echo -e "${BLUE}[Orchestrator] Initializing coordination layer...${NC}"
    
    comms_init
    comms_reset_state

    if [ -z "$TASKS_FILE" ]; then
        TASKS_FILE="docs/PLAN"
    fi

    if [ -d "$TASKS_FILE" ]; then
        echo -e "${BLUE}[Orchestrator] Generating tasks from plan directory: $TASKS_FILE...${NC}"
        local generated_tasks_file
        generated_tasks_file=".ralph/generated-tasks.json"

        if ! command -v node >/dev/null 2>&1; then
            echo -e "${RED}[Orchestrator] node is required to generate tasks from plan directory.${NC}"
            echo -e "${YELLOW}Either install node or pass an explicit tasks.json file.${NC}"
            return 1
        fi

        if [ ! -f "tools/plan-to-tasks.js" ]; then
            echo -e "${RED}[Orchestrator] Missing generator script: tools/plan-to-tasks.js${NC}"
            return 1
        fi

        node tools/plan-to-tasks.js "$TASKS_FILE" "$generated_tasks_file" >/dev/null
        TASKS_FILE="$generated_tasks_file"
    fi

    if [ ! -f "$TASKS_FILE" ]; then
        echo -e "${RED}[Orchestrator] Tasks file not found: $TASKS_FILE${NC}"
        echo -e "${YELLOW}Usage:${NC} ./ralph-orchestrator.sh <num-workers> <tasks.json|plan-dir>"
        return 1
    fi

    local task_count
    task_count=$(jq '.tasks | length' "$TASKS_FILE" 2>/dev/null || echo "")
    if [ -z "$task_count" ]; then
        echo -e "${RED}[Orchestrator] Invalid tasks file (expected JSON with a tasks array): $TASKS_FILE${NC}"
        return 1
    fi

    echo -e "${BLUE}[Orchestrator] Loading $task_count tasks from $TASKS_FILE...${NC}"

    local i
    for ((i=0; i<task_count; i++)); do
        local id
        local type
        local data
        id=$(jq -r ".tasks[$i].id" "$TASKS_FILE")
        type=$(jq -r ".tasks[$i].type" "$TASKS_FILE")
        data=$(jq -c ".tasks[$i].data // {}" "$TASKS_FILE")

        if [ -z "$id" ] || [ "$id" == "null" ] || [ -z "$type" ] || [ "$type" == "null" ]; then
            echo -e "${RED}[Orchestrator] Task at index $i missing required fields (id,type).${NC}"
            return 1
        fi

        comms_enqueue_task "$id" "$type" "$data"
    done

    echo -e "${GREEN}[Orchestrator] Work queue initialized with $task_count tasks${NC}"
}

# Spawn workers
orchestrator_spawn_workers() {
    local worker_pids=()
    
    echo -e "${BLUE}[Orchestrator] Spawning $NUM_WORKERS workers...${NC}"
    
    for ((i=1; i<=NUM_WORKERS; i++)); do
        echo -e "${YELLOW}[Orchestrator] Starting Worker #$i${NC}"
        
        # Start worker in background
        bash ./ralph-worker.sh "$i" "$ORCHESTRATOR_SESSION" >> ".ralph/worker-$i.log" 2>&1 &
        local worker_pid=$!
        worker_pids+=($worker_pid)
        
        echo -e "${GREEN}[Orchestrator] Worker #$i started (PID: $worker_pid)${NC}"
        
        sleep 1
    done
    
    # Save PIDs
    echo "${worker_pids[@]}" > .ralph/worker-pids.txt
    
    echo -e "${GREEN}[Orchestrator] All workers spawned${NC}"
}

# Monitor workers
orchestrator_monitor() {
    local timeout=${1:-300}
    local elapsed=0
    local poll_interval=5
    
    echo -e "${BLUE}[Orchestrator] Monitoring worker progress (timeout: ${timeout}s)...${NC}\n"
    
    while [ $elapsed -lt $timeout ]; do
        local status=""
        if [ "${RALPH_MONITOR_RAW:-}" == "1" ]; then
            status=$(comms_queue_status 2>/dev/null || echo "")
            echo -e "${YELLOW}[Orchestrator @ ${elapsed}s] Queue Status (raw):${NC}"
            echo "$status" | sed 's/^/  /'
        else
            status=$(comms_queue_summary 2>/dev/null || echo "")
            echo -e "${YELLOW}[Orchestrator @ ${elapsed}s] Queue Status:${NC}"
            echo "$status" | sed 's/^/  /'
        fi

        # Check if all done
        local remaining
        remaining=$(jq '[.tasks[] | select(.status == "pending" or .status == "claimed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
        
        if [ "$remaining" -eq 0 ]; then
            echo -e "${GREEN}[Orchestrator] All work completed!${NC}"
            break
        fi
        
        sleep $poll_interval
        elapsed=$((elapsed + poll_interval))
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo -e "${YELLOW}[Orchestrator] Timeout reached, but continuing...${NC}"
    fi
}

# Collect results
orchestrator_collect_results() {
    echo -e "\n${BLUE}[Orchestrator] Collecting results...${NC}\n"

    # Get aggregated results
    local results=$(comms_get_results 2>/dev/null || echo "")

    # Create summary report
    cat > .ralph/ORCHESTRATOR-REPORT.md <<EOF
# Ralph Multi-Agent Orchestration Report

**Generated**: $(date)
**Orchestrator Session**: $ORCHESTRATOR_SESSION
**Workers Spawned**: $NUM_WORKERS

## Execution Summary

EOF

    # Add task summary from work queue
    if [ -f ".ralph/work-queue.json" ]; then
        local total_tasks completed_tasks failed_tasks
        total_tasks=$(jq '.tasks | length' ".ralph/work-queue.json" 2>/dev/null || echo "0")
        completed_tasks=$(jq '[.tasks[] | select(.status == "completed")] | length' ".ralph/work-queue.json" 2>/dev/null || echo "0")
        failed_tasks=$(jq '[.tasks[] | select(.status == "failed")] | length' ".ralph/work-queue.json" 2>/dev/null || echo "0")

        cat >> .ralph/ORCHESTRATOR-REPORT.md <<EOF
### Task Overview
- **Total Tasks**: $total_tasks
- **Completed**: $completed_tasks
- **Failed**: $failed_tasks

## Per-Worker Results

EOF

        # Add per-worker sections with task mappings
        for ((i=1; i<=NUM_WORKERS; i++)); do
            if [ -f ".ralph/sessions/worker-$i.session" ]; then
                echo "### Worker #$i" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "" >> .ralph/ORCHESTRATOR-REPORT.md

                # Get worker session data
                local worker_session
                worker_session=$(cat ".ralph/sessions/worker-$i.session" 2>/dev/null)

                # Extract worker info
                local worker_status registered heartbeat
                worker_status=$(echo "$worker_session" | jq -r '.status // "unknown"' 2>/dev/null)
                registered=$(echo "$worker_session" | jq -r '.registered // "N/A"' 2>/dev/null)
                heartbeat=$(echo "$worker_session" | jq -r '.last_heartbeat // "N/A"' 2>/dev/null)

                echo "**Status**: $worker_status" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "**Registered**: $registered" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "**Last Heartbeat**: $heartbeat" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "" >> .ralph/ORCHESTRATOR-REPORT.md

                # Get tasks completed by this worker from work queue
                local worker_tasks
                worker_tasks=$(jq -c --arg worker_id "$i" '.tasks[] | select(.worker_id == $worker_id)' ".ralph/work-queue.json" 2>/dev/null || echo "")

                if [ -n "$worker_tasks" ]; then
                    echo "**Tasks Executed**:" >> .ralph/ORCHESTRATOR-REPORT.md
                    echo "" >> .ralph/ORCHESTRATOR-REPORT.md

                    echo "$worker_tasks" | while IFS= read -r task; do
                        local task_id task_type task_status task_completed_at
                        task_id=$(echo "$task" | jq -r '.id' 2>/dev/null)
                        task_type=$(echo "$task" | jq -r '.type' 2>/dev/null)
                        task_status=$(echo "$task" | jq -r '.status' 2>/dev/null)
                        task_completed_at=$(echo "$task" | jq -r '.completed_at // .failed_at // "N/A"' 2>/dev/null)

                        echo "- **Task ID**: $task_id" >> .ralph/ORCHESTRATOR-REPORT.md
                        echo "  - Type: $task_type" >> .ralph/ORCHESTRATOR-REPORT.md
                        echo "  - Status: $task_status" >> .ralph/ORCHESTRATOR-REPORT.md
                        echo "  - Completed At: $task_completed_at" >> .ralph/ORCHESTRATOR-REPORT.md

                        # Get task-specific findings from results.json
                        local task_finding
                        task_finding=$(jq -r --arg task_id "$task_id" '.findings[] | select(.task_id == $task_id) | .finding' ".ralph/results.json" 2>/dev/null || echo "")

                        if [ -n "$task_finding" ]; then
                            echo "  - **Finding for this task**:" >> .ralph/ORCHESTRATOR-REPORT.md
                            echo "$task_finding" | while IFS= read -r finding; do
                                if [ -n "$finding" ]; then
                                    echo "    - $finding" >> .ralph/ORCHESTRATOR-REPORT.md
                                fi
                            done
                        fi
                        echo "" >> .ralph/ORCHESTRATOR-REPORT.md
                    done
                else
                    echo "_No tasks completed by this worker_" >> .ralph/ORCHESTRATOR-REPORT.md
                    echo "" >> .ralph/ORCHESTRATOR-REPORT.md
                fi

                # Show worker findings from session (task-mapped)
                local worker_findings_count
                worker_findings_count=$(jq '.findings | length' ".ralph/sessions/worker-$i.session" 2>/dev/null || echo "0")
                if [ "$worker_findings_count" -gt 0 ]; then
                    echo "**Worker Findings (by Task)**:" >> .ralph/ORCHESTRATOR-REPORT.md
                    echo "" >> .ralph/ORCHESTRATOR-REPORT.md
                    jq -r '.findings[] | "- **Task \(.task_id)**: \(.finding)"' ".ralph/sessions/worker-$i.session" 2>/dev/null >> .ralph/ORCHESTRATOR-REPORT.md || true
                    echo "" >> .ralph/ORCHESTRATOR-REPORT.md
                fi

                echo "---" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "" >> .ralph/ORCHESTRATOR-REPORT.md
            fi
        done

        # Add completed tasks detail section
        cat >> .ralph/ORCHESTRATOR-REPORT.md <<EOF
## Completed Tasks Detail

EOF

        local completed_tasks_json
        completed_tasks_json=$(jq -c '.tasks[] | select(.status == "completed")' ".ralph/work-queue.json" 2>/dev/null || echo "")

        if [ -n "$completed_tasks_json" ]; then
            echo "$completed_tasks_json" | while IFS= read -r task; do
                local task_id task_type worker_id completed_at
                task_id=$(echo "$task" | jq -r '.id' 2>/dev/null)
                task_type=$(echo "$task" | jq -r '.type' 2>/dev/null)
                worker_id=$(echo "$task" | jq -r '.worker_id' 2>/dev/null)
                completed_at=$(echo "$task" | jq -r '.completed_at' 2>/dev/null)

                echo "### Task: $task_id" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "- **Type**: $task_type" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "- **Worker**: #$worker_id" >> .ralph/ORCHESTRATOR-REPORT.md
                echo "- **Completed At**: $completed_at" >> .ralph/ORCHESTRATOR-REPORT.md

                # Show task-specific finding from results.json
                local task_finding
                task_finding=$(jq -r --arg task_id "$task_id" --arg worker_id "$worker_id" '.findings[] | select(.task_id == $task_id and .worker_id == $worker_id) | .finding' ".ralph/results.json" 2>/dev/null || echo "")

                if [ -n "$task_finding" ]; then
                    echo "- **Finding**:" >> .ralph/ORCHESTRATOR-REPORT.md
                    echo "  - $task_finding" >> .ralph/ORCHESTRATOR-REPORT.md
                else
                    echo "- **Finding**: _No specific finding recorded_" >> .ralph/ORCHESTRATOR-REPORT.md
                fi
                echo "" >> .ralph/ORCHESTRATOR-REPORT.md
            done
        else
            echo "_No tasks completed yet_" >> .ralph/ORCHESTRATOR-REPORT.md
            echo "" >> .ralph/ORCHESTRATOR-REPORT.md
        fi
    fi

    echo -e "${GREEN}[Orchestrator] Report generated: .ralph/ORCHESTRATOR-REPORT.md${NC}"
}

# Shutdown workers
orchestrator_shutdown() {
    echo -e "\n${BLUE}[Orchestrator] Shutting down workers...${NC}"
    
    if [ -f .ralph/worker-pids.txt ]; then
        local pids=$(cat .ralph/worker-pids.txt)
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}[Orchestrator] Terminating PID $pid${NC}"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
        
        # Wait a bit for graceful shutdown
        sleep 2
        
        # Force kill any remaining
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        done
    fi
    
    echo -e "${GREEN}[Orchestrator] All workers terminated${NC}"
}

# Main orchestration flow
main() {
    banner
    
    orchestrator_init
    orchestrator_spawn_workers
    orchestrator_monitor 300
    orchestrator_collect_results
    orchestrator_shutdown
    
    echo -e "\n${MAGENTA}╔════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║   Orchestration Complete                    ║${NC}"
    echo -e "${MAGENTA}║   Check .ralph/ORCHESTRATOR-REPORT.md       ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════╝${NC}\n"
}

# Trap cleanup on interrupt
trap 'echo ""; echo "Orchestrator interrupted, cleaning up..."; orchestrator_shutdown; exit 1' SIGTERM SIGINT

# Run orchestration
main "$@"
