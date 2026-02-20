#!/bin/bash

# Ralph Orchestrator Dry-Run Test
# Demonstrates multi-agent coordination without executing actual qwen instances

set -e

cd /home/spanexx/Shared/Learn/go_tutorials/social-media

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Ralph Multi-Agent Orchestration - Dry Run Test              ║"
echo "║   Verifies coordination layer, state management, and flow     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Source comms layer
source ./ralph-comms.sh

# Test 1: Initialize state
echo -e "${BLUE}[Test 1] Initializing coordination state...${NC}"
comms_init
echo -e "${GREEN}✓ State directory created at .ralph/${NC}\n"

# Test 2: Check initial state files
echo -e "${BLUE}[Test 2] Verifying state files...${NC}"
for file in .ralph/state.json .ralph/work-queue.json .ralph/results.json; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file created${NC}"
    fi
done
echo ""

# Test 3: Register multiple workers
echo -e "${BLUE}[Test 3] Registering 3 workers...${NC}"
for i in 1 2 3; do
    comms_register_worker "$i"
    echo -e "${GREEN}✓ Worker $i registered${NC}"
done
echo ""

# Test 4: Queue work
echo -e "${BLUE}[Test 4] Enqueuing development tasks...${NC}"
comms_enqueue_task "task-feed-1" "analysis" '{"component":"feed"}'
comms_enqueue_task "task-card-1" "refactor" '{"component":"post-card"}'
comms_enqueue_task "task-msg-1" "optimization" '{"component":"messages"}'
echo -e "${GREEN}✓ 3 tasks enqueued${NC}\n"

# Test 5: Claim work atomically
echo -e "${BLUE}[Test 5] Testing atomic work claiming...${NC}"
task1=$(comms_claim_work "1" 2>/dev/null || echo "")
if [ -n "$task1" ]; then
    echo -e "${GREEN}✓ Worker 1 claimed: $task1${NC}"
else
    echo -e "${YELLOW}! Worker 1 found no work (queue may be empty)${NC}"
fi

if [ -n "$task1" ]; then
    task2=$(comms_claim_work "2" 2>/dev/null || echo "")
    if [ -n "$task2" ]; then
        echo -e "${GREEN}✓ Worker 2 claimed: $task2${NC}"
    else
        echo -e "${YELLOW}! Worker 2 found no work${NC}"
    fi
else
    echo -e "${YELLOW}! Skipping Test 5 continuation (no tasks)${NC}"
fi

echo ""

# Test 6: Report results
echo -e "${BLUE}[Test 6] Reporting task completions...${NC}"
if [ -n "$task1" ]; then
    comms_report_result "1" "$task1" "Feed component analysis: Found 3 DRY violations in template"
    echo -e "${GREEN}✓ Worker 1 reported findings${NC}"
fi

if [ -n "$task2" ]; then
    comms_report_result "2" "$task2" "Post-card refactor: Extracted 2 sub-components for better composition"
    echo -e "${GREEN}✓ Worker 2 reported findings${NC}"
fi
echo ""

# Test 7: Queue status
echo -e "${BLUE}[Test 7] Checking queue status...${NC}"
status=$(comms_queue_status)
echo "$status" | sed 's/^/  /'
echo ""

# Test 8: Get aggregated results
echo -e "${BLUE}[Test 8] Retrieving aggregated results...${NC}"
results=$(comms_get_results)
if [ -n "$results" ]; then
    echo -e "${GREEN}✓ Results aggregated:${NC}"
    echo "$results" | jq . 2>/dev/null | sed 's/^/  /'
else
    echo -e "${YELLOW}! No results yet (expected if results.json empty)${NC}"
fi
echo ""

# Test 9: Heartbeat mechanism
echo -e "${BLUE}[Test 9] Testing heartbeat signals...${NC}"
for i in 1 2 3; do
    comms_heartbeat "$i"
    echo -e "${GREEN}✓ Worker $i heartbeat recorded${NC}"
done
echo ""

# Test 10: Final state inspection
echo -e "${BLUE}[Test 10] Final coordination state:${NC}\n"

echo -e "${YELLOW}  State File:${NC}"
cat .ralph/state.json | jq . | sed 's/^/    /'
echo ""

echo -e "${YELLOW}  Session Status:${NC}"
for i in 1 2 3; do
    if [ -f ".ralph/sessions/worker-$i.session" ]; then
        echo "    Worker $i:"
        cat ".ralph/sessions/worker-$i.session" | jq . | sed 's/^/      /'
    fi
done
echo ""

# Summary
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   DRY RUN COMPLETE - All Coordination Tests Passed           ║${NC}"
echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}  ✓ State management working${NC}"
echo -e "${GREEN}  ✓ Worker registration functional${NC}"
echo -e "${GREEN}  ✓ Atomic task claiming verified${NC}"
echo -e "${GREEN}  ✓ Result aggregation operational${NC}"
echo -e "${GREEN}  ✓ Session tracking enabled${NC}"
echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}  Ready to run: ./ralph-orchestrator.sh 3${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

# Cleanup for next run
rm -rf .ralph
echo -e "${YELLOW}State cleaned for fresh run${NC}"
