#!/bin/bash
# Queue monitor - displays live task queue status

echo -e "\033[1;33m$(date '+%H:%M:%S')\033[0m"
echo ""

if [ ! -f ".ralph/work-queue.json" ]; then
    echo "Queue not initialized"
    exit 0
fi

# Get counts
total=$(jq '.tasks | length' .ralph/work-queue.json 2>/dev/null || echo "0")
pending=$(jq '[.tasks[] | select(.status == "pending")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
claimed=$(jq '[.tasks[] | select(.status == "claimed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
completed=$(jq '[.tasks[] | select(.status == "completed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")
failed=$(jq '[.tasks[] | select(.status == "failed")] | length' .ralph/work-queue.json 2>/dev/null || echo "0")

# Summary
echo -e "\033[1mQueue Summary:\033[0m"
echo -e "  Total:     $total"
echo -e "  \033[0;34mPending:   $pending\033[0m"
echo -e "  \033[0;33mClaimed:   $claimed\033[0m"
echo -e "  \033[0;32mCompleted: $completed\033[0m"
echo -e "  \033[0;31mFailed:    $failed\033[0m"
echo ""

# Recent tasks
echo -e "\033[1mRecent Tasks:\033[0m"
printf "%-20s %-10s %-8s %s\n" "TASK ID" "STATUS" "WORKER" "DESCRIPTION"
echo "-------------------- ---------- -------- --------------------"

jq -r '.tasks | sort_by(.created_at) | reverse | .[0:10] | .[] | 
    [.id[0:18], .status, (.worker_id // "-"), (.data.description // .data.plan.prd_item_title // "")[0:25]] | 
    @tsv' .ralph/work-queue.json 2>/dev/null | while IFS=$'\t' read -r id status worker desc; do
    
    # Color by status
    case "$status" in
        pending) color="\033[0;34m" ;;   # Blue
        claimed) color="\033[0;33m" ;;   # Yellow
        completed) color="\033[0;32m" ;; # Green
        failed) color="\033[0;31m" ;;   # Red
        *) color="\033[0m" ;;
    esac
    
    printf "${color}%-20s %-10s\033[0m %-8s %s\n" "$id" "$status" "$worker" "$desc"
done

# Show progress bar if there are tasks
if [ "$total" -gt 0 ]; then
    echo ""
    completed_pct=$((completed * 100 / total))
    failed_pct=$((failed * 100 / total))
    claimed_pct=$((claimed * 100 / total))
    
    printf "Progress: ["
    for ((i=0; i<completed_pct/5; i++)); do printf "\033[0;32m#\033[0m"; done
    for ((i=0; i<claimed_pct/5; i++)); do printf "\033[0;33m#\033[0m"; done
    for ((i=0; i<failed_pct/5; i++)); do printf "\033[0;31m#\033[0m"; done
    for ((i=(completed_pct+claimed_pct+failed_pct)/5; i<20; i++)); do printf "-"; done
    printf "] %d%% done\n" "$completed_pct"
fi
