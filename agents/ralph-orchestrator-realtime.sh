#!/bin/bash
#
# Ralph Real-Time Orchestrator (RTO)
# A dynamic multi-agent system with tmux monitoring and inter-agent chat
#

set -e

# Configuration
ORCHESTRATOR_VERSION="3.0"
SESSION_NAME="ralph-orchestrator"
COMMS_BIN="./tools/comm/comm"
MAX_WORKERS=${RALPH_MAX_WORKERS:-10}

run_core() {
    RTO_MODE="core"
    ORCHESTRATOR_PID=$$
    init_comms

    echo "$ORCHESTRATOR_PID" > "$ORCH_PID_FILE"

    # Spawn baseline workers; orchestrator will auto-scale from queue workload
    local initial_workers=${RALPH_RTO_INITIAL_WORKERS:-$MIN_WORKERS}
    for ((i=1; i<=initial_workers; i++)); do
        spawn_worker "$i"
    done

    orchestration_loop
}
MIN_WORKERS=${RALPH_MIN_WORKERS:-1}
WORKER_TIMEOUT=${RALPH_WORKER_TIMEOUT:-300}
CHAT_CHANNEL="agent-chat"
COMM_CLI="./tools/comm/comm"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# State
declare -A WORKER_PIDS
declare -A WORKER_TASKS
declare -A WORKER_STATUS
ORCHESTRATOR_PID=$$
CONTROL_PIPE=".ralph/control.pipe"
CHAT_PIPE=".ralph/chat.pipe"
CONTROL_FD=""
ORCH_INBOX_PIPE=".ralph/orchestrator.inbox"
ORCH_INBOX_FD=""
ORCH_PID_FILE=".ralph/orchestrator.pid"
RTO_MODE="launcher"
CORE_LOG_FILE=".ralph/core.log"

is_pid_alive() {
    local pid="$1"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

PLAN_ROOT_DEFAULT="docs/PLAN"
TASKS_GENERATED_FILE=".ralph/generated-tasks.json"

# Initialize tmux session with dashboard
init_tmux_dashboard() {
    echo -e "${BLUE}[Orchestrator] Initializing tmux dashboard...${NC}"
    
    # Create pipes for control and chat (do NOT delete/recreate; it breaks open FDs)
    if [ ! -p "$CONTROL_PIPE" ]; then mkfifo "$CONTROL_PIPE" 2>/dev/null || true; fi
    if [ ! -p "$CHAT_PIPE" ]; then mkfifo "$CHAT_PIPE" 2>/dev/null || true; fi
    if [ ! -p "$ORCH_INBOX_PIPE" ]; then mkfifo "$ORCH_INBOX_PIPE" 2>/dev/null || true; fi
    
    # Kill existing session
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    sleep 1
    
    # Create new tmux session with main orchestrator window
    tmux new-session -d -s "$SESSION_NAME" -n "orchestrator" \
        "bash -c \"echo 'Ralph Orchestrator v$ORCHESTRATOR_VERSION'; echo; echo 'Type commands: status | spawn <n> | kill <worker> | chat <msg> | quit'; echo '(this pane is interactive)'; echo; while true; do read -rp '> ' cmd; [ -z \"\$cmd\" ] && continue; printf '%s\n' \"\$cmd\" > .ralph/control.pipe; done\""

    tmux set-option -t "$SESSION_NAME" -g mouse on
    tmux set-option -t "$SESSION_NAME" -g status on
    tmux set-option -t "$SESSION_NAME" -g status-interval 2
    tmux set-option -t "$SESSION_NAME" -g status-style "bg=colour234,fg=colour250"
    tmux set-option -t "$SESSION_NAME" -g status-left " #[fg=colour39]RTO#[default] #[fg=colour244]#S#[default] "
    tmux set-option -t "$SESSION_NAME" -g status-right "#[fg=colour244]%Y-%m-%d %H:%M:%S#[default]"
    tmux set-option -t "$SESSION_NAME" -g pane-border-status top
    tmux set-option -t "$SESSION_NAME" -g pane-border-format "#[fg=colour244]#{pane_index} #[fg=colour39]#{pane_title}#[default]"
    tmux set-option -t "$SESSION_NAME" -g pane-active-border-style "fg=colour39"
    tmux set-option -t "$SESSION_NAME" -g pane-border-style "fg=colour238"
    
    tmux select-pane -t "$SESSION_NAME:orchestrator.0" -T "Control"

    # Pane 1: Worker Monitor (top-left)
    tmux split-window -h -t "$SESSION_NAME:orchestrator" \
        "bash -c 'while true; do clear; echo -e \"${CYAN}=== WORKER STATUS ===${NC}\"; ./ralph-monitor-workers.sh; sleep 2; done'"

    tmux select-pane -t "$SESSION_NAME:orchestrator.1" -T "Workers"
    
    # Pane 2: Task Queue (top-right)
    tmux split-window -v -t "$SESSION_NAME:orchestrator.0" \
        "bash -c 'while true; do clear; echo -e \"${YELLOW}=== TASK QUEUE ===${NC}\"; ./ralph-monitor-queue.sh; sleep 2; done'"

    tmux select-pane -t "$SESSION_NAME:orchestrator.2" -T "Queue"
    
    # Pane 3: Agent Chat (bottom-left)
    tmux split-window -v -t "$SESSION_NAME:orchestrator.1" \
        "bash -c 'echo -e \"${MAGENTA}=== AGENT CHAT (filtered) ===${NC}\"; echo \"Showing: USER/ORCHESTRATOR and STARTED/COMPLETED/FAILED/ERROR/STATUS\"; echo; (tail -n 200 -f .ralph/chat.log 2>/dev/null || tail -f /dev/null) | stdbuf -oL grep -E \"<USER>|<ORCHESTRATOR>|:STARTED>|:COMPLETED>|:FAILED>|:ERROR>|:STATUS>\"'"

    tmux select-pane -t "$SESSION_NAME:orchestrator.3" -T "Chat"
    
    # Pane 4: System Logs (bottom-right)
    tmux split-window -h -t "$SESSION_NAME:orchestrator.3" \
        "bash -c 'echo -e \"${GREEN}=== SYSTEM LOGS ===${NC}\"; tail -f .ralph/orchestrator.log 2>/dev/null || tail -f /dev/null'"

    tmux select-pane -t "$SESSION_NAME:orchestrator.4" -T "Logs"
    
    # Set layout
    tmux select-layout -t "$SESSION_NAME:orchestrator" tiled

    # Comms window (history/live)
    tmux new-window -d -t "$SESSION_NAME" -n "comms" \
        "bash -lc 'printf '\''%s\n\n'\'' '\''=== COMMS (ORCHESTRATOR) ==='\''; if ./tools/comm/comm follow -h >/dev/null 2>&1; then exec ./tools/comm/comm follow --identity ORCHESTRATOR --interval-ms 1000; else while true; do clear; printf '\''%s\n\n'\'' '\''=== COMMS (ORCHESTRATOR) ==='\''; ./tools/comm/comm read-last --identity ORCHESTRATOR || true; sleep 1; done; fi'"
    
    echo -e "${GREEN}[Orchestrator] Dashboard ready. Attach with: tmux attach -t $SESSION_NAME${NC}"
}

# Initialize communication layer using comm binary
init_comms() {
    echo -e "${BLUE}[Orchestrator] Initializing comm system...${NC}"
    
    mkdir -p .ralph/{sessions,logs,chat}

    # Ensure FIFOs exist before opening them
    if [ "$RTO_MODE" = "launcher" ]; then
        rm -f "$CONTROL_PIPE" "$CHAT_PIPE" "$ORCH_INBOX_PIPE" 2>/dev/null || true
        mkfifo "$CONTROL_PIPE" 2>/dev/null || true
        mkfifo "$CHAT_PIPE" 2>/dev/null || true
        mkfifo "$ORCH_INBOX_PIPE" 2>/dev/null || true
    else
        if [ ! -p "$CONTROL_PIPE" ]; then mkfifo "$CONTROL_PIPE" 2>/dev/null || true; fi
        if [ ! -p "$CHAT_PIPE" ]; then mkfifo "$CHAT_PIPE" 2>/dev/null || true; fi
        if [ ! -p "$ORCH_INBOX_PIPE" ]; then mkfifo "$ORCH_INBOX_PIPE" 2>/dev/null || true; fi
    fi

    # Ensure runtime state exists; reset by default to avoid stale tasks.
    # IMPORTANT: Only the launcher should reset. The core must not wipe the queue/tasks.
    if [ "${RALPH_RTO_NO_RESET:-}" != "1" ] && [ "$RTO_MODE" = "launcher" ]; then
        rm -f .ralph/sessions/worker-*.session .ralph/sessions/worker-*.qwen-session 2>/dev/null || true
        cat > .ralph/work-queue.json << 'EOF'
{
  "tasks": [],
  "active": false,
  "worker_count": 0,
  "completed": 0
}
EOF
        echo '{"findings": [], "issues": [], "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > .ralph/results.json
    else
        # Ensure files exist
        if [ ! -f .ralph/work-queue.json ]; then
            cat > .ralph/work-queue.json << 'EOF'
{
  "tasks": [],
  "active": false,
  "worker_count": 0,
  "completed": 0
}
EOF
        fi
        if [ ! -f .ralph/results.json ]; then
            echo '{"findings": [], "issues": [], "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > .ralph/results.json
        fi
    fi
    
    # comm is a file-backed messenger CLI (write/read/follow). It's used for chat persistence.
    if [ -x "$COMMS_BIN" ]; then
        echo -e "${GREEN}[Orchestrator] Comm CLI available (chat persistence enabled).${NC}"
    else
        echo -e "${YELLOW}[Orchestrator] Comm CLI not found (chat persistence disabled).${NC}"
    fi
    
    # Initialize chat log
    echo "[$(date)] Chat system initialized" > .ralph/chat.log
    
    # Initialize control log
    echo "[$(date)] Orchestrator started (PID: $ORCHESTRATOR_PID)" > .ralph/orchestrator.log

    # Open the control pipe for read/write in the orchestrator process so writers don't block
    exec 9<>"$CONTROL_PIPE" || true
    CONTROL_FD=9

    # Open the orchestrator inbox for read/write (agent -> orchestrator messages)
    exec 10<>"$ORCH_INBOX_PIPE" || true
    ORCH_INBOX_FD=10
}

load_tasks_from_plan() {
    local plan_root="${RALPH_RTO_PLAN_ROOT:-$PLAN_ROOT_DEFAULT}"

    if [ "${RALPH_RTO_NO_TASK_LOAD:-}" = "1" ]; then
        log "Task autoload disabled (RALPH_RTO_NO_TASK_LOAD=1)"
        return 0
    fi

    if ! command -v node >/dev/null 2>&1; then
        log "node not found; cannot generate tasks from plan"
        return 1
    fi

    if [ ! -d "$plan_root" ]; then
        log "Plan directory not found: $plan_root"
        return 1
    fi

    log "Generating tasks from plan: $plan_root"
    node tools/plan-to-tasks.js "$plan_root" "$TASKS_GENERATED_FILE" >/dev/null

    if [ ! -f "$TASKS_GENERATED_FILE" ]; then
        log "Task generator did not produce $TASKS_GENERATED_FILE"
        return 1
    fi

    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Load into the queue with status fields
    jq --arg ts "$ts" '(
      .tasks
      | map(. + {status: "pending", created_at: $ts})
    ) as $tasks
    | {
      tasks: $tasks,
      active: true,
      worker_count: 0,
      completed: 0
    }' "$TASKS_GENERATED_FILE" > .ralph/work-queue.json.tmp
    mv .ralph/work-queue.json.tmp .ralph/work-queue.json

    log "Loaded $(jq '.tasks | length' .ralph/work-queue.json 2>/dev/null || echo "0") tasks into queue"
}

# Spawn a new worker
spawn_worker() {
    local worker_id=$1
    local task_id=${2:-""}
    
    if [ ${#WORKER_PIDS[@]} -ge $MAX_WORKERS ]; then
        log "Maximum workers reached ($MAX_WORKERS)"
        return 1
    fi
    
    local worker_name="worker-$worker_id"
    local log_file=".ralph/logs/$worker_name.log"

    mkdir -p ".ralph/xdg/worker-$worker_id/config" ".ralph/xdg/worker-$worker_id/state" ".ralph/xdg/worker-$worker_id/data"
    
    # Start worker in tmux window
    tmux new-window -d -t "$SESSION_NAME" -n "$worker_name" \
        "bash -lc \"XDG_CONFIG_HOME=.ralph/xdg/worker-$worker_id/config XDG_STATE_HOME=.ralph/xdg/worker-$worker_id/state XDG_DATA_HOME=.ralph/xdg/worker-$worker_id/data ./ralph-agent.sh \\\"$worker_id\\\" \\\"$task_id\\\" 2>&1 | tee -a \\\"$log_file\\\"\""
    
    # Get the PID
    sleep 0.5
    local pid=$(tmux list-panes -t "$SESSION_NAME:$worker_name" -F '#{pane_pid}' 2>/dev/null | head -1)
    
    WORKER_PIDS[$worker_id]=$pid
    WORKER_TASKS[$worker_id]=$task_id
    WORKER_STATUS[$worker_id]="idle"
    
    log "Spawned $worker_name (PID: $pid)"
    
    # Announce to chat
    broadcast_chat "ORCHESTRATOR" "Worker $worker_id joined the team"
    
    return 0
}

# Kill a worker
kill_worker() {
    local worker_id=$1
    local reason=${2:-"requested"}
    
    if [ -n "${WORKER_PIDS[$worker_id]}" ]; then
        local pid=${WORKER_PIDS[$worker_id]}
        
        # Kill the tmux window
        tmux kill-window -t "$SESSION_NAME:worker-$worker_id" 2>/dev/null || true
        
        # Clean kill if needed
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        broadcast_chat "ORCHESTRATOR" "Worker $worker_id left ($reason)"
        
        unset WORKER_PIDS[$worker_id]
        unset WORKER_TASKS[$worker_id]
        unset WORKER_STATUS[$worker_id]

        rm -f ".ralph/sessions/worker-$worker_id.session" ".ralph/sessions/worker-$worker_id.qwen-session" 2>/dev/null || true
        
        log "Killed worker-$worker_id ($reason)"
    fi
}

# Broadcast message to agent chat
broadcast_chat() {
    local sender=$1
    local message=$2
    local timestamp=$(date '+%H:%M:%S')
    
    # Add to chat log
    echo "[$timestamp] <$sender> $message" >> .ralph/chat.log

    if [ -x "$COMM_CLI" ]; then
        "$COMM_CLI" write --from "$sender" "$message" >/dev/null 2>&1 || true
    fi
    
    # Send via comm binary if available
    if [ -x "$COMMS_BIN" ] && [ -S ".ralph/comm.sock" ]; then
        "$COMMS_BIN" send --channel "$CHAT_CHANNEL" --message "$sender: $message" 2>/dev/null || true
    fi
}

# Claim next available task
claim_next_task() {
    if [ -f ".ralph/work-queue.json" ]; then
        local task=$(jq -c '.tasks | map(select(.status == "pending")) | .[0]' .ralph/work-queue.json 2>/dev/null)
        if [ -n "$task" ] && [ "$task" != "null" ]; then
            echo "$task" | jq -r '.id'
            return 0
        fi
    fi
    return 1
}

# Main orchestration loop
orchestration_loop() {
    log "Starting orchestration loop"
    
    while true; do
        # Check for control commands
        local cmd
        if [ -n "$CONTROL_FD" ]; then
            if read -t 0.1 -r cmd <&$CONTROL_FD 2>/dev/null; then
                [ -n "$cmd" ] && handle_command "$cmd"
            fi
        fi

        # Check for agent -> orchestrator messages
        local inbox_line
        if [ -n "$ORCH_INBOX_FD" ]; then
            if read -t 0.1 -r inbox_line <&$ORCH_INBOX_FD 2>/dev/null; then
                if [ -n "$inbox_line" ]; then
                    local from_id event msg
                    from_id=$(printf '%s' "$inbox_line" | cut -f1)
                    event=$(printf '%s' "$inbox_line" | cut -f2)
                    msg=$(printf '%s' "$inbox_line" | cut -f3-)
                    broadcast_chat "ORCHESTRATOR" "RX Agent-$from_id [$event]: $msg"
                fi
            fi
        fi
        
        # Monitor workers
        for worker_id in "${!WORKER_PIDS[@]}"; do
            local pid=${WORKER_PIDS[$worker_id]}
            if ! kill -0 "$pid" 2>/dev/null; then
                # Worker died
                log "Worker $worker_id died unexpectedly"
                kill_worker "$worker_id" "died"
                
                # Reclaim task if any
                local task_id=${WORKER_TASKS[$worker_id]}
                if [ -n "$task_id" ]; then
                    # Reset task to pending
                    jq --arg tid "$task_id" '.tasks |= map(if .id == $tid then .status = "pending" | del(.worker_id) | del(.claimed_at) else . end)' .ralph/work-queue.json > .ralph/work-queue.json.tmp
                    mv .ralph/work-queue.json.tmp .ralph/work-queue.json
                    log "Reclaimed task $task_id"
                fi
            fi
        done
        
        # Spawn workers if needed
        local pending_tasks=$(jq '[.tasks[] | select(.status == "pending")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
        local claimed_tasks=$(jq '[.tasks[] | select(.status == "claimed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
        local active_workers=${#WORKER_PIDS[@]}
        
        if [ "$pending_tasks" -gt "$active_workers" ] && [ "$active_workers" -lt "$MAX_WORKERS" ]; then
            local needed=$((pending_tasks - active_workers))
            [ $needed -gt $MAX_WORKERS ] && needed=$MAX_WORKERS
            
            for ((i=0; i<needed; i++)); do
                local next_id
                next_id=$(($(ls .ralph/sessions/worker-*.session 2>/dev/null | wc -l) + i + 1))
                spawn_worker "$next_id" ""
            done
        fi
        
        # Scale down only when there is no work at all (pending or claimed)
        if [ "$pending_tasks" -eq 0 ] && [ "$claimed_tasks" -eq 0 ] && [ "$active_workers" -gt "$MIN_WORKERS" ]; then
            local oldest_worker=$(get_oldest_idle_worker)
            if [ -n "$oldest_worker" ]; then
                kill_worker "$oldest_worker" "idle"
            fi
        fi
        
        sleep 2
    done
}

# Handle user command
handle_command() {
    local cmd="$1"
    log "Command: $cmd"
    
    case "$cmd" in
        status)
            local status_out
            status_out=$(show_status)
            broadcast_chat "ORCHESTRATOR" "$(echo "$status_out" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
            ;;
        spawn\ *)
            local n=$(echo "$cmd" | awk '{print $2}')
            spawn_worker "$n"
            broadcast_chat "ORCHESTRATOR" "Spawn requested: worker $n"
            ;;
        kill\ *)
            local wid=$(echo "$cmd" | awk '{print $2}')
            kill_worker "$wid"
            broadcast_chat "ORCHESTRATOR" "Kill requested: worker $wid"
            ;;
        chat\ *)
            local msg=$(echo "$cmd" | cut -d' ' -f2-)
            broadcast_chat "USER" "$msg"
            broadcast_chat "ORCHESTRATOR" "User message broadcast"
            ;;
        quit|exit)
            shutdown
            exit 0
            ;;
        *)
            broadcast_chat "ORCHESTRATOR" "Unknown command: $cmd"
            ;;
    esac
}

# Show orchestrator status
show_status() {
    echo "=== ORCHESTRATOR STATUS ==="
    echo "Version: $ORCHESTRATOR_VERSION"
    echo "PID: $ORCHESTRATOR_PID"
    echo "Workers: ${#WORKER_PIDS[@]} / $MAX_WORKERS"
    echo "Claimed: $(jq '[.tasks[] | select(.status == "claimed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")"
    echo "Pending: $(jq '[.tasks[] | select(.status == "pending")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")"
    echo "Completed: $(jq '[.tasks[] | select(.status == "completed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")"
    echo "Failed: $(jq '[.tasks[] | select(.status == "failed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")"
}

# Get oldest idle worker
get_oldest_idle_worker() {
    local oldest=""
    local oldest_time=9999999999
    
    for wid in "${!WORKER_STATUS[@]}"; do
        local session_file=".ralph/sessions/worker-$wid.session"
        local current_status="${WORKER_STATUS[$wid]}"

        if [ -f "$session_file" ]; then
            current_status=$(jq -r '.status // "idle"' "$session_file" 2>/dev/null || echo "idle")
            WORKER_STATUS[$wid]="$current_status"
        fi

        if [ "$current_status" = "idle" ]; then
            if [ -f "$session_file" ]; then
                local reg_time
                reg_time=$(jq -r '.registered // "9999-99-99"' "$session_file")
                local epoch
                epoch=$(date -d "$reg_time" +%s 2>/dev/null || echo "9999999999")
                if [ "$epoch" -lt "$oldest_time" ]; then
                    oldest_time=$epoch
                    oldest=$wid
                fi
            fi
        fi
    done
    
    echo "$oldest"
}

# Logging
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}[Orchestrator]${NC} $1"
    echo "$msg" >> .ralph/orchestrator.log
}

# Graceful shutdown
shutdown() {
    log "Shutting down..."
    
    # Kill all workers
    for wid in "${!WORKER_PIDS[@]}"; do
        kill_worker "$wid" "shutdown"
    done
    
    # Stop comm server
    if [ -f ".ralph/comm.pid" ]; then
        local comm_pid=$(cat .ralph/comm.pid)
        kill "$comm_pid" 2>/dev/null || true
        rm -f .ralph/comm.pid
    fi
    
    # Cleanup
    rm -f "$CONTROL_PIPE" "$CHAT_PIPE"
    rm -f "$ORCH_PID_FILE" 2>/dev/null || true
    
    # Kill tmux session
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    
    log "Orchestrator stopped"
}

# Main
main() {
    echo -e "${MAGENTA}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║   Ralph Real-Time Orchestrator v$ORCHESTRATOR_VERSION          ║${NC}"
    echo -e "${MAGENTA}║   Multi-Agent System with Chat & Monitoring     ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════╝${NC}"
    
    if [ "${1:-}" = "--core" ]; then
        run_core
        return
    fi

    RTO_MODE="launcher"

    # Singleton: if core already running, don't start another.
    if [ -f "$ORCH_PID_FILE" ]; then
        local existing_pid
        existing_pid=$(cat "$ORCH_PID_FILE" 2>/dev/null || true)
        if is_pid_alive "$existing_pid"; then
            echo -e "${GREEN}[Orchestrator] Already running (PID: $existing_pid).${NC}"
            echo -e "${GREEN}[Orchestrator] Attach with: tmux attach -t $SESSION_NAME${NC}"
            return
        fi
    fi

    init_comms
    load_tasks_from_plan || true
    init_tmux_dashboard

    # Start the orchestrator core in the background so the launcher terminal can exit.
    nohup "$0" --core >>"$CORE_LOG_FILE" 2>&1 &
    log "Core started in background (PID: $!)"
    echo -e "${GREEN}[Orchestrator] Attach with: tmux attach -t $SESSION_NAME${NC}"

    if [ "${RALPH_RTO_NO_ATTACH:-}" != "1" ] && [ -z "${TMUX:-}" ]; then
        exec tmux attach -t "$SESSION_NAME"
    fi
    return
}

# Handle signals
trap shutdown SIGINT SIGTERM

# Run
main "$@"
