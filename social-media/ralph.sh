#!/bin/bash

# Ralph - Autonomous Development Loop for SocialHub
# Enhanced with validation mode for code health checks
# Usage: ./ralph.sh <iterations> [session-id] [--validate-every N] [--critic|--critic-only]
# Examples: 
#   ./ralph.sh 10                                              # New session per iteration
#   ./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06       # Use persistent session
#   ./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06 --validate-every 3
#   ./ralph.sh 10 --validate-every 0                          # New session, no validation
#   ./ralph.sh 1 --critic-only                                 # Run critic scan and exit
#   ./ralph.sh 5 --critic                                      # Run critic scan, then run 5 iterations

set -e
set -o pipefail

# Color codes (must be defined before argument parsing)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ITERATIONS=${1:-1}
VALIDATE_EVERY=2  # Default: validate every 2 iterations
SESSION_ID=""  # Optional; parsed from args (must not start with --)
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
PROGRESS_FILE="$WORKSPACE_DIR/progress.md"
VALIDATOR_SCRIPT="$WORKSPACE_DIR/ralph-validator.sh"
CRITIC_SCRIPT="$WORKSPACE_DIR/ralph-critic.sh"
CHAT_SCRIPT="$WORKSPACE_DIR/ralph-chat.sh"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
PLAN_ROOT_DEFAULT="$WORKSPACE_DIR/docs/PLAN"

# Flags
RUN_CRITIC=0
CRITIC_ONLY=0
CRITIC_SESSION_ID=""
VALIDATOR_SESSION_ID=""
CRITIC_BEFORE=0
CRITIC_EVERY=0

# Parse args after iterations
ARGS=("${@:2}")
idx=0
while [ $idx -lt ${#ARGS[@]} ]; do
    arg="${ARGS[$idx]}"
    case "$arg" in
        --validate-every)
            next_idx=$((idx + 1))
            if [ $next_idx -ge ${#ARGS[@]} ]; then
                echo -e "${RED}Error: --validate-every requires a value${NC}"
                exit 1
            fi
            VALIDATE_EVERY="${ARGS[$next_idx]}"
            idx=$((idx + 2))
            continue
            ;;
        --critic-session-id)
            next_idx=$((idx + 1))
            if [ $next_idx -ge ${#ARGS[@]} ]; then
                echo -e "${RED}Error: --critic-session-id requires a value${NC}"
                exit 1
            fi
            CRITIC_SESSION_ID="${ARGS[$next_idx]}"
            idx=$((idx + 2))
            continue
            ;;
        --validator-session-id)
            next_idx=$((idx + 1))
            if [ $next_idx -ge ${#ARGS[@]} ]; then
                echo -e "${RED}Error: --validator-session-id requires a value${NC}"
                exit 1
            fi
            VALIDATOR_SESSION_ID="${ARGS[$next_idx]}"
            idx=$((idx + 2))
            continue
            ;;
        --critic)
            RUN_CRITIC=1
            idx=$((idx + 1))
            continue
            ;;
        --critic-before)
            RUN_CRITIC=1
            CRITIC_BEFORE=1
            idx=$((idx + 1))
            continue
            ;;
        --critic-every)
            next_idx=$((idx + 1))
            if [ $next_idx -ge ${#ARGS[@]} ]; then
                echo -e "${RED}Error: --critic-every requires a value${NC}"
                exit 1
            fi
            CRITIC_EVERY="${ARGS[$next_idx]}"
            RUN_CRITIC=1
            idx=$((idx + 2))
            continue
            ;;
        --critic-only)
            RUN_CRITIC=1
            CRITIC_ONLY=1
            idx=$((idx + 1))
            continue
            ;;
        --*)
            # Unknown flag will be handled later / ignored
            idx=$((idx + 1))
            continue
            ;;
        *)
            # First non-flag token after iterations is treated as session id
            if [ -z "$SESSION_ID" ]; then
                SESSION_ID="$arg"
            fi
            idx=$((idx + 1))
            continue
            ;;
    esac
done

# Determine session mode
SESSION_MODE="new"
if [ -n "$SESSION_ID" ]; then
    SESSION_MODE="persistent"
    # Validate it looks like a UUID or valid session format
    if ! [[ "$SESSION_ID" =~ ^[a-f0-9-]+$ ]]; then
        echo -e "${RED}Error: Invalid session ID format${NC}"
        exit 1
    fi
fi

# Validation
if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
    echo -e "${RED}Error: Please provide a valid number of iterations${NC}"
    echo "Usage: $0 <iterations> [session-id] [--validate-every N]"
    exit 1
fi

# Initialize progress file
if [ ! -f "$PROGRESS_FILE" ]; then
    cat > "$PROGRESS_FILE" << 'EOF'
# SocialHub Development Progress

Automated development iterations for SocialHub Angular Social Media Application.
With Go Backend and Angular Frontend.

## Iterations

EOF
fi

# Check validator script exists
if [ ! -f "$VALIDATOR_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Warning: Validator script not found at $VALIDATOR_SCRIPT${NC}"
    VALIDATE_EVERY=0
fi

# Check chat helper exists
if [ ! -f "$CHAT_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Warning: Chat script not found at $CHAT_SCRIPT${NC}"
fi

post_chat() {
  local role="$1"
  shift
  local msg="$*"

  if [ -f "$CHAT_SCRIPT" ]; then
    bash "$CHAT_SCRIPT" post "$role" "$msg" || true
  fi
}

tail_chat() {
  local n="${1:-60}"
  if [ -f "$CHAT_SCRIPT" ]; then
    bash "$CHAT_SCRIPT" tail "$n" || true
  fi
}

run_critic() {
    if [ ! -f "$CRITIC_SCRIPT" ]; then
        echo -e "${YELLOW}⚠️  Warning: Critic script not found at $CRITIC_SCRIPT${NC}"
        return 0
    fi

    echo ""
    echo -e "${MAGENTA}🧪 Running critic scan (mock/stub/TODO -> PLAN backlog)...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Critic runs as an agent by default (it will create/update docs/PLAN and post to .ralph/chat.log).
    if [ -n "$CRITIC_SESSION_ID" ]; then
        bash "$CRITIC_SCRIPT" --session-id "${CRITIC_SESSION_ID}" --agent
    else
        bash "$CRITIC_SCRIPT" --agent
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${MAGENTA}🧪 Critic scan completed${NC}"
}

log_critic_result() {
  local iter="$1"
  local status="$2"

  {
    echo ""
    echo "#### Critic Result (Iteration $iter): $status"
    echo ""
  } >> "$PROGRESS_FILE"
}

# Critic-only: run critic and exit
if [ $CRITIC_ONLY -eq 1 ]; then
    run_critic
    echo ""
    echo -e "${BLUE}Exiting due to --critic-only${NC}"
    exit 0
fi

# Optional: run critic before main loop (legacy behavior)
if [ $RUN_CRITIC -eq 1 ] && [ $CRITIC_BEFORE -eq 1 ]; then
    run_critic
fi

# Header
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Ralph Development Loop${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "📊 Iterations: $ITERATIONS"
echo "📁 Workspace: $WORKSPACE_DIR"
echo "📝 Progress: $PROGRESS_FILE"
if [ "$SESSION_MODE" = "persistent" ]; then
    echo -e "${CYAN}🔗 Session: $SESSION_ID (persistent context)${NC}"
else
    echo -e "${CYAN}🔗 Session: New session per iteration${NC}"
fi
if [ "$VALIDATE_EVERY" -gt 0 ]; then
    echo "🔍 Validation: Every $VALIDATE_EVERY iterations"
else
    echo "🔍 Validation: Disabled"
fi
if [ "$CRITIC_EVERY" -gt 0 ]; then
    echo "🧪 Critic: Every $CRITIC_EVERY iterations"
elif [ $RUN_CRITIC -eq 1 ]; then
    echo "🧪 Critic: Enabled"
else
    echo "🧪 Critic: Disabled"
fi
echo ""

# Main loop
for ((i=1; i<=ITERATIONS; i++)); do
  ITER_START=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Generate session ID if using new-per-iteration mode
  if [ "$SESSION_MODE" = "new" ]; then
    if command -v uuidgen >/dev/null 2>&1; then
      ITER_SESSION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    elif command -v python3 >/dev/null 2>&1; then
      ITER_SESSION_ID="$(python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || true)"
    else
      ITER_SESSION_ID="$(date +%s)-$i-$(od -An -N4 -tu4 /dev/urandom 2>/dev/null | tr -d ' ' || echo 0)"
    fi
  else
    ITER_SESSION_ID="$SESSION_ID"
  fi
  
  echo -e "${YELLOW}🔄 Iteration $i/$ITERATIONS${NC} - $ITER_START"
  if [ "$SESSION_MODE" = "new" ]; then
    echo -e "${CYAN}   Session: $ITER_SESSION_ID (new)${NC}"
  else
    echo -e "${CYAN}   Session: $ITER_SESSION_ID (persistent)${NC}"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  CHAT_CONTEXT="$(tail_chat 60)"

  # Prompt for qwen
  PROMPT="Follow the repo workflow: /execute

You are implementing exactly one next PRD item driven by the plan folder.

PLAN ROOT:
- $PLAN_ROOT_DEFAULT

TASK:
1. Read $PLAN_ROOT_DEFAULT to find the next milestone/task that is not done.
2. Enter the chosen milestone folder and follow social-media/workflow/execute.md in Milestone mode:
   - Read README.md, tasks.md, prd.json, Progress.md
   - Pick the next prd.json item top-to-bottom where passes=false
   - Implement it end-to-end (no placeholders)
   - Update the milestone's Progress.md and mark the implemented prd.json item passes=true
3. Run the smallest relevant checks (and repo defaults if applicable).
4. Summarize what you did.

NOTE:
- $PROGRESS_FILE is a run log written by ralph.sh. Do not treat it as milestone bookkeeping.

AGENT CHAT (last 60 lines):
$CHAT_CONTEXT

OUTPUT FORMAT:
---
COMPLETED: [brief description]
MILESTONE: [path]
PRD_ITEM: [identifier or description]
FILES_MODIFIED: [file list]
STATUS: [success/failed]
---"

  echo -e "${BLUE}📋 Running qwen...${NC}"
  
  # Run qwen with appropriate session
  if [ "$SESSION_MODE" = "persistent" ]; then
    QWEN_CMD=(qwen --resume "$ITER_SESSION_ID" --yolo -p "$PROMPT")
  else
    QWEN_CMD=(qwen --session-id "$ITER_SESSION_ID" --yolo -p "$PROMPT")
  fi

  if OUTPUT=$("${QWEN_CMD[@]}" 2>&1); then
    ITER_END=$(date '+%Y-%m-%d %H:%M:%S')
    STATUS="✅ SUCCESS"
    
    # Extract summary
    SUMMARY=$(echo "$OUTPUT" | tail -30)
  else
    ITER_END=$(date '+%Y-%m-%d %H:%M:%S')
    STATUS="❌ FAILED"
    SUMMARY="Qwen execution error: Check logs"
  fi
  
  # Log to progress.md
  {
    echo ""
    echo "### Iteration $i"
    echo "- **Date**: $ITER_START → $ITER_END"
    echo "- **Status**: $STATUS"
    echo ""
    echo '```'
    echo "$SUMMARY"
    echo '```'
    echo ""
  } >> "$PROGRESS_FILE"
  
  echo -e "${GREEN}✅ Iteration $i completed${NC}"
  echo -e "${GREEN}📝 Logged to progress.md${NC}"

  post_chat "MAIN" "Iteration $i completed. Status=$STATUS. Summary: $(echo "$SUMMARY" | tr '\n' ' ' | head -c 240)"
  
  # Check if validation should run
  SHOULD_VALIDATE=0
  if [ "$VALIDATE_EVERY" -gt 0 ] && [ $((i % VALIDATE_EVERY)) -eq 0 ]; then
    SHOULD_VALIDATE=1
  fi
  
  if [ $SHOULD_VALIDATE -eq 1 ]; then
    echo ""
    echo -e "${MAGENTA}🔍 Running validation check...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Validator runs in its own session by default.
    # We pass the main session id as reference metadata for reporting/prompting.
    VALIDATOR_ARGS=("$ITER_SESSION_ID" "$i")
    if [ -n "$VALIDATOR_SESSION_ID" ]; then
        # If user pins a validator session id, pass it through exactly.
        VALIDATOR_ARGS=("--session-id" "$VALIDATOR_SESSION_ID" "--ref-session-id" "$ITER_SESSION_ID" "$i")
    fi

    if bash "$VALIDATOR_SCRIPT" "${VALIDATOR_ARGS[@]}" 2>&1 | tee -a "$PROGRESS_FILE"; then
      VALIDATOR_STATUS="✅ PASSED"
      echo -e "${GREEN}✅ Validation passed${NC}"
    else
      VALIDATOR_STATUS="⚠️  ISSUES_FOUND"
      echo -e "${YELLOW}⚠️  Validation found issues - review .validator-report.md${NC}"
    fi
    
    # Log validation result
    {
      echo ""
      echo "#### Validation Result: $VALIDATOR_STATUS"
      echo "See \`.validator-report.md\` for details"
      echo ""
    } >> "$PROGRESS_FILE"
    
    echo ""
    echo -e "${BLUE}📌 Validator is now aware of iteration $i status${NC}"
    echo -e "${BLUE}📌 Main session will continue with next iteration${NC}"
    echo ""
  fi

  # Critic inside loop (after validator)
  SHOULD_CRITIC=0
  if [ "$CRITIC_EVERY" -gt 0 ] && [ $((i % CRITIC_EVERY)) -eq 0 ]; then
    SHOULD_CRITIC=1
  fi

  if [ $SHOULD_CRITIC -eq 1 ]; then
    echo -e "${MAGENTA}🧪 Running critic scan...${NC}"
    if run_critic; then
      log_critic_result "$i" "✅ PASSED"
    else
      log_critic_result "$i" "⚠️  FAILED"
    fi
    echo ""
  fi
  
  # Wait before next
  if [ $i -lt $ITERATIONS ]; then
    echo -e "${YELLOW}⏳ Waiting 2s before next iteration...${NC}"
    sleep 2
  fi
  
  echo ""
done

# Default behavior: if --critic is provided, run it after the main loop.
# If --critic-every is set, the critic already ran inside the loop.
if [ $RUN_CRITIC -eq 1 ] && [ $CRITIC_BEFORE -eq 0 ] && [ "$CRITIC_EVERY" -eq 0 ]; then
  run_critic
fi

# Footer
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Ralph Loop Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Finished:"
echo "   Iterations: $ITERATIONS"
echo "   Progress: $PROGRESS_FILE"
if [ "$SESSION_MODE" = "persistent" ]; then
    echo -e "   ${CYAN}Session Mode: Persistent ($SESSION_ID)${NC}"
else
    echo -e "   ${CYAN}Session Mode: New per iteration${NC}"
fi
if [ "$VALIDATE_EVERY" -gt 0 ]; then
    echo "   Validations: $(((ITERATIONS + VALIDATE_EVERY - 1) / VALIDATE_EVERY))"
fi
echo ""
echo "📖 View progress with:"
echo "   cat progress.md"
if [ -f ".validator-report.md" ]; then
    echo "   cat .validator-report.md"
fi
