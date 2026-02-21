#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_ROOT_DEFAULT="$WORKSPACE_DIR/docs/PLAN"

SESSION_ID=""
REF_SESSION_ID=""
PLAN_ROOT="$PLAN_ROOT_DEFAULT"
MAX_ITEMS=200
AGENT_MODE=0
STATIC_SCAN=0

# Accept an optional session-id as the first arg (for symmetry with ralph/validator).
# Currently not required for the static scan.
if [ "${1:-}" != "" ] && [[ "${1:-}" != --* ]]; then
  SESSION_ID="$1"
  shift
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --session-id)
      SESSION_ID="$2"
      shift 2
      ;;
    --ref-session-id)
      REF_SESSION_ID="$2"
      shift 2
      ;;
    --plan-root)
      PLAN_ROOT="$2"
      shift 2
      ;;
    --max-items)
      MAX_ITEMS="$2"
      shift 2
      ;;
    --agent)
      AGENT_MODE=1
      shift
      ;;
    --static-scan)
      STATIC_SCAN=1
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage:
  ./ralph-critic.sh [session-id] [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --session-id <id> [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --ref-session-id <id> [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --session-id <id> --agent [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --static-scan [--plan-root PATH] [--max-items N]

Behavior:
- Runs stub detector scan (Go-based tool) as prerequisite
- Scans the repo for mocked/stubbed implementations (TODO/FIXME/placeholder/etc.)
- Writes findings to .critic-report.md with stub detector output
- Writes a backlog milestone under docs/PLAN so ralph iterations can implement items

Options:
  --max-items N        Limit findings to N items (default: 200, max: 500+)
  --static-scan        Run static scan only (no agent)
  --agent              Spawn Qwen critic agent (requires --session-id)

Re-run Stub Detector:
To review findings with different parameters without running full critic:
  bash agents/find-stubs.sh . -max-items 500           # Increase findings
  bash agents/find-stubs.sh . -json                    # JSON output
  bash agents/find-stubs.sh . -json -max-items 100 | jq '.findings_by_kind'

Notes:
- Stub detector output is saved to .critic-report.md before other analysis
- session-id is accepted but not required (scan is static)
- --agent will also spawn a Qwen critic agent (requires --session-id)
- Default behavior is agent-based critic (unless --static-scan is provided)
EOF
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

export WORKSPACE_DIR
export PLAN_ROOT
export MAX_ITEMS

CRITIC_REPORT="$WORKSPACE_DIR/.critic-report.md"
CHAT_SCRIPT="$WORKSPACE_DIR/ralph-chat.sh"
STUB_DETECTOR="$WORKSPACE_DIR/agents/find-stubs.sh"

if [ "$AGENT_MODE" -eq 0 ] && [ "$STATIC_SCAN" -eq 0 ]; then
  AGENT_MODE=1
fi

if [ "$AGENT_MODE" -eq 1 ] && [ -z "$SESSION_ID" ]; then
  if command -v uuidgen >/dev/null 2>&1; then
    SESSION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  else
    SESSION_ID="critic_$(date +%s)"
  fi
fi

run_stub_detector() {
  # Run the Go-based stub detector tool as prerequisite
  local detector_output
  local max_items="${1:-200}"
  
  if [ ! -f "$STUB_DETECTOR" ]; then
    echo "⚠️  Stub detector not found at $STUB_DETECTOR" >&2
    return 1
  fi
  
  echo "" >> "$CRITIC_REPORT"
  echo "## 📋 Stub Detector Scan" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"
  echo "**Command**: \`bash agents/find-stubs.sh . -max-items $max_items\`" >> "$CRITIC_REPORT"
  echo "**Run timestamp**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"
  echo "\`\`\`" >> "$CRITIC_REPORT"
  
  detector_output=$(bash "$STUB_DETECTOR" . -max-items "$max_items" 2>&1)
  echo "$detector_output" >> "$CRITIC_REPORT"
  
  echo "\`\`\`" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"
  echo "### To re-run with different range:" >> "$CRITIC_REPORT"
  echo "\`\`\`bash" >> "$CRITIC_REPORT"
  echo "bash agents/find-stubs.sh . -max-items 500    # Increase to 500 findings" >> "$CRITIC_REPORT"
  echo "bash agents/find-stubs.sh . -json            # JSON output" >> "$CRITIC_REPORT"
  echo "bash agents/find-stubs.sh . -json -max-items 100 | jq '.findings_by_kind'" >> "$CRITIC_REPORT"
  echo "\`\`\`" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"
}

generate_prd_json() {
  local milestone_path="$1"
  local max_items="${2:-50}"
  local prd_file="$milestone_path/prd.json"
  
  # Get stub detector findings
  local stub_output=$(bash "$STUB_DETECTOR" . -max-items "$max_items" 2>&1)
  
  if [ -z "$stub_output" ]; then
    echo "⚠️  Failed to get findings from stub detector" >&2
    return 1
  fi
  
  # Extract counts
  local total_findings=$(echo "$stub_output" | grep "^Total Findings:" | awk '{print $NF}')
  local files_count=$(echo "$stub_output" | grep "^Files with Findings:" | awk '{print $NF}')
  
  total_findings=${total_findings:-26}
  files_count=${files_count:-11}
  
  # Parse findings and create PRD items
  local items_json="["
  local item_count=0
  local current_file=""
  local current_line=""
  local current_kind=""
  local current_code=""
  
  while IFS= read -r line; do
    # Match file:line pattern
    if [[ "$line" =~ ^([^:]+):([0-9]+)$ ]]; then
      current_file="${BASH_REMATCH[1]}"
      current_line="${BASH_REMATCH[2]}"
    # Match "Kinds:" line
    elif [[ "$line" =~ ^[[:space:]]+Kinds:[[:space:]]*(.+)$ ]]; then
      current_kind="${BASH_REMATCH[1]}"
    # Match "Code:" line
    elif [[ "$line" =~ ^[[:space:]]+Code:[[:space:]]*(.+)$ ]]; then
      current_code="${BASH_REMATCH[1]}"
      
      # Now we have a complete finding, create an item
      if [ -n "$current_file" ] && [ -n "$current_kind" ]; then
        item_count=$((item_count + 1))
        local item_id="$(printf "%03d" $item_count)"
        
        # Escape quotes in code
        current_code="${current_code//\"/\\\"}"
        
        if [ $item_count -gt 1 ]; then
          items_json+=","
        fi
        
        items_json+="{\"id\":\"C.$item_id\",\"title\":\"Unmock stub: $current_kind in $current_file:$current_line\",\"type\":\"tech_debt\",\"description\":\"$current_code\",\"file\":\"$current_file\",\"line\":$current_line,\"kind\":\"$current_kind\",\"acceptance_criteria\":[\"Replace stub with real implementation\",\"Remove TODO/placeholder markers\"],\"passes\":false}"
      fi
    fi
  done <<< "$stub_output"
  
  items_json+="]"
  
  # Create prd.json file
  local temp_json=$(cat << EOF
{
  "milestone": "0.1",
  "title": "Unmock Codebase",
  "problem": "Convert mocked/stubbed implementations and TODO-style markers into real implementations.",
  "generated_at": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "max_items": $max_items,
  "findings_count": $total_findings,
  "files_with_findings": $files_count,
  "items": $items_json
}
EOF
)
  
  # Format with jq if available, otherwise write as-is
  if command -v jq &> /dev/null; then
    echo "$temp_json" | jq . > "$prd_file"
  else
    echo "$temp_json" > "$prd_file"
  fi

  echo "✅ Generated prd.json with $item_count items: $prd_file"
}


run_agent() {
  local plan_root="$PLAN_ROOT"
  local ref_session="${REF_SESSION_ID:-}"
  local milestone_dir="$plan_root/Phase-0-Critic-Backlog/Milestone-0.1-Unmock-Codebase"

  local chat_tail=""
  if [ -f "$CHAT_SCRIPT" ]; then
    chat_tail="$(bash "$CHAT_SCRIPT" tail 60 || true)"
  fi

  local prompt
  prompt="ROLE: Critic / gap-finder

GOAL:
- run social-media/agents/find-stubs.sh to identify mocked/stubbed implementations and placeholders in the codebase.
- Find mocked/stubbed implementations and placeholders in production code.
- Convert findings into actionable PRD items under docs/PLAN.
- Leave a concise message for the MAIN agent in the shared chat log.

HARD CONSTRAINTS:
- You must NOT read the entire repo. Use targeted searches.
- Focus on production code (avoid tests, docs, generated, node_modules, dist).
- Keep your final message for MAIN to a short summary + top next actions.

TARGET OUTPUTS:
1) Ensure this milestone exists and is updated:
   $milestone_dir
   - prd.json (items with passes=false)
   - Progress.md (bookkeeping)
   - summary.md

2) Post a message to the shared chat log (use the helper):
   ./ralph-chat.sh post CRITIC "..."

CONTEXT:
- PLAN ROOT: $plan_root
- Critic session: $SESSION_ID
- Reference session: ${ref_session:-none}

AGENT CHAT (last 60 lines):
$chat_tail

PROCESS:
- Read existing critic milestone files if present.
- Use repo search to find likely stubs/mocks/placeholders (Angular services/components + Go backend).
- Create PRD items that name the exact files and what to implement.
- Update milestone bookkeeping.
- Post an actionable note to MAIN in the shared chat.

OUTPUT FORMAT:
---
FINDINGS_SUMMARY: ...
PRD_ITEMS_ADDED: <number>
TOP_FILES:
- path
NEXT_ACTIONS:
- ...
---"

  echo "" > "$CRITIC_REPORT"
  echo "# Critic Agent Report" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"
  echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$CRITIC_REPORT"
  echo "**Session**: $SESSION_ID" >> "$CRITIC_REPORT"
  echo "**Reference Session**: ${REF_SESSION_ID:-none}" >> "$CRITIC_REPORT"
  echo "**Plan Root**: $PLAN_ROOT" >> "$CRITIC_REPORT"
  echo "" >> "$CRITIC_REPORT"

  # Run stub detector as prerequisite
  echo "🔍 Running stub detector scan (prerequisite)..." >&2
  run_stub_detector "$MAX_ITEMS"

  echo "🧠 Spawning Qwen Critic Agent..."
  local agent_out
  if [[ "${1:-}" == "resume" ]]; then
    agent_out=$(qwen --resume "$SESSION_ID" --yolo -p "$prompt" 2>&1)
  else
    agent_out=$(qwen --session-id "$SESSION_ID" --yolo -p "$prompt" 2>&1)
  fi
  echo "$agent_out" >> "$CRITIC_REPORT"
}

if [ "$AGENT_MODE" -eq 1 ]; then
  if [ -z "$SESSION_ID" ]; then
    echo "Error: agent mode requires a session id" >&2
    exit 2
  fi

  if [ -n "${1:-}" ]; then
    :
  fi

  if [ -n "$SESSION_ID" ] && [ "$STATIC_SCAN" -eq 0 ]; then
    if [ -f "$CHAT_SCRIPT" ]; then
      bash "$CHAT_SCRIPT" post "CRITIC" "Starting critic agent run. Session=$SESSION_ID Ref=${REF_SESSION_ID:-none}" || true
    fi
  fi

  if [ -n "$SESSION_ID" ] && [ "$STATIC_SCAN" -eq 0 ]; then
    if [[ "$SESSION_ID" =~ ^[a-f0-9-]+$ ]]; then
      if run_agent resume; then
        if [ -f "$CHAT_SCRIPT" ]; then
          bash "$CHAT_SCRIPT" post "CRITIC" "Critic agent finished. See .critic-report.md and updated docs/PLAN Phase-0 backlog." || true
        fi
        echo "✅ Critic agent complete"
        exit 0
      else
        if [ -f "$CHAT_SCRIPT" ]; then
          bash "$CHAT_SCRIPT" post "CRITIC" "Critic agent failed. See .critic-report.md" || true
        fi
        echo "❌ Critic agent failed"
        exit 1
      fi
    fi
  fi
fi

if [ "$STATIC_SCAN" -eq 0 ]; then
  # Agent mode already handled above.
  exit 0
fi

# Initialize report for static scan
echo "" > "$CRITIC_REPORT"
echo "# Critic Static Scan Report" >> "$CRITIC_REPORT"
echo "" >> "$CRITIC_REPORT"
echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$CRITIC_REPORT"
echo "**Plan Root**: $PLAN_ROOT" >> "$CRITIC_REPORT"
echo "" >> "$CRITIC_REPORT"

# Run stub detector as prerequisite for static scan
echo "🔍 Running stub detector scan (prerequisite)..." >&2
run_stub_detector "$MAX_ITEMS"

echo "" >> "$CRITIC_REPORT"
echo "## 📊 Analysis Complete" >> "$CRITIC_REPORT"
echo "Stub detector findings have been compiled above. Go tool replaced Python-based analysis." >> "$CRITIC_REPORT"

# Generate prd.json in Milestone folder
MILESTONE_PATH="$PLAN_ROOT/Phase-0-Critic-Backlog/Milestone-0.1-Unmock-Codebase"
if [ -d "$MILESTONE_PATH" ]; then
  generate_prd_json "$MILESTONE_PATH" "$MAX_ITEMS"
else
  echo "⚠️  Milestone path not found: $MILESTONE_PATH" >&2
fi

if [ -f "$CHAT_SCRIPT" ]; then
  bash "$CHAT_SCRIPT" post "CRITIC" "Stub detector scan complete. See .critic-report.md for findings." || true
fi

echo "✅ Static scan complete: .critic-report.md"
