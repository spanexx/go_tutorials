#!/bin/bash
# Worker monitor - displays live worker status

echo -e "\033[1;36m$(date '+%H:%M:%S')\033[0m"
echo ""

if [ ! -d ".ralph/sessions" ]; then
    echo "No workers registered yet"
    exit 0
fi

shopt -s nullglob

# Header
printf "%-8s %-12s %-20s %-10s %s\n" "WORKER" "STATUS" "TASK" "HEARTBEAT" "PID"
echo "-------- ------------ -------------------- ---------- ------"

# List all workers
for session in .ralph/sessions/worker-*.session; do
    [ -f "$session" ] || continue
    
    worker_id=$(basename "$session" .session | sed 's/worker-//')
    status=$(jq -r '.status // "unknown"' "$session" 2>/dev/null)
    task=$(jq -r '.task // "-"' "$session" 2>/dev/null)
    heartbeat=$(jq -r '.last_heartbeat // "never"' "$session" 2>/dev/null)
    iteration=$(jq -r '.iteration // 0' "$session" 2>/dev/null)
    
    # Calculate heartbeat age
    if [ "$heartbeat" != "never" ] && [ "$heartbeat" != "null" ]; then
        heartbeat_epoch=$(date -d "$heartbeat" +%s 2>/dev/null || echo "0")
        now_epoch=$(date +%s)
        age=$((now_epoch - heartbeat_epoch))
        
        if [ $age -lt 60 ]; then
            heartbeat_str="${age}s ago"
        elif [ $age -lt 3600 ]; then
            heartbeat_str="$((age / 60))m ago"
        else
            heartbeat_str="$((age / 3600))h ago"
        fi
    else
        heartbeat_str="never"
    fi
    
    # Color code status
    case "$status" in
        idle) status_color="\033[0;32m" ;;      # Green
        working) status_color="\033[0;33m" ;;   # Yellow
        offline) status_color="\033[0;31m" ;;  # Red
        *) status_color="\033[0;37m" ;;        # White
    esac
    
    # Truncate task if too long
    if [ "${#task}" -gt 18 ]; then
        task="${task:0:15}..."
    fi
    
    printf "%-8s ${status_color}%-12s\033[0m %-20s %-10s iter:%s\n" \
        "#$worker_id" "$status" "$task" "$heartbeat_str" "$iteration"
done

shopt -u nullglob

echo ""
echo "Total workers: $(ls .ralph/sessions/worker-*.session 2>/dev/null | wc -l)"
