#!/bin/bash

# Ralph Validator - Spawns Qwen Agent for Code Health Analysis
# Validates implementations by running intelligent agent analysis
# Usage:
#   ./ralph-validator.sh <iteration>                      # Isolated (validator uses its own session)
#   ./ralph-validator.sh <reference-session-id> <iteration>   # Reference (metadata only; validator uses its own session)
#   ./ralph-validator.sh --session-id <id> <iteration>         # Override validator session id
#   ./ralph-validator.sh --ref-session-id <id> <iteration>     # Set reference session id (metadata)

set -e

# Inputs
MAIN_ITERATION=""
REF_SESSION_ID=""
VALIDATOR_SESSION_ID_OVERRIDE=""

# Parse args
ARGS=("$@")
idx=0
while [ $idx -lt ${#ARGS[@]} ]; do
    arg="${ARGS[$idx]}"
    case "$arg" in
        --session-id)
            next=$((idx + 1))
            if [ $next -ge ${#ARGS[@]} ]; then
                echo "Error: --session-id requires a value" >&2
                exit 1
            fi
            VALIDATOR_SESSION_ID_OVERRIDE="${ARGS[$next]}"
            idx=$((idx + 2))
            ;;
        --ref-session-id)
            next=$((idx + 1))
            if [ $next -ge ${#ARGS[@]} ]; then
                echo "Error: --ref-session-id requires a value" >&2
                exit 1
            fi
            REF_SESSION_ID="${ARGS[$next]}"
            idx=$((idx + 2))
            ;;
        -h|--help)
            cat <<EOF
Usage:
  ./ralph-validator.sh <iteration>
  ./ralph-validator.sh <reference-session-id> <iteration>
  ./ralph-validator.sh --session-id <id> <iteration>
  ./ralph-validator.sh --ref-session-id <id> <iteration>

Notes:
- Validator runs in its own Qwen session by default.
- Use --session-id to force a specific validator session id.
- Use --ref-session-id to attach metadata about the main Ralph session.
EOF
            exit 0
            ;;
        *)
            # Backward compatible positional mode:
            # - One numeric arg => iteration
            # - Two args: <ref-session-id> <iteration>
            if [[ "$arg" =~ ^[0-9]+$ ]]; then
                MAIN_ITERATION="$arg"
            else
                if [ -z "$REF_SESSION_ID" ]; then
                    REF_SESSION_ID="$arg"
                fi
            fi
            idx=$((idx + 1))
            ;;
    esac
done

# Validate iteration provided
if [ -z "$MAIN_ITERATION" ]; then
    echo -e "${RED}Error: Iteration number required${NC}"
    echo "Usage:"
    echo "  ./ralph-validator.sh <iteration>                    # Isolated session"
    echo "  ./ralph-validator.sh <session-id> <iteration>       # Reference session"
    exit 1
fi

# Setup session
SESSION_MODE="isolated"
if [ -n "$REF_SESSION_ID" ]; then
    SESSION_MODE="reference"
fi

# Validator always runs in its own qwen session (never reuse the main Ralph session).
if [ -n "$VALIDATOR_SESSION_ID_OVERRIDE" ]; then
    VALIDATOR_SESSION_ID="$VALIDATOR_SESSION_ID_OVERRIDE"
else
    if command -v uuidgen >/dev/null 2>&1; then
        VALIDATOR_SESSION_ID="validator_$(uuidgen | tr '[:upper:]' '[:lower:]')_iter_${MAIN_ITERATION}"
    elif command -v python3 >/dev/null 2>&1; then
        VALIDATOR_SESSION_ID="validator_$(python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || echo $(date +%s))_iter_${MAIN_ITERATION}"
    else
        VALIDATOR_SESSION_ID="validator_$(date +%s)_iter_${MAIN_ITERATION}"
    fi
fi

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$WORKSPACE_DIR/progress.md"
VALIDATOR_REPORT="$WORKSPACE_DIR/.validator-report.md"
PLAN_ROOT_DEFAULT="$WORKSPACE_DIR/docs/PLAN"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔍 Ralph Validator - Spawning Agent${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$SESSION_MODE" = "isolated" ]; then
    echo -e "${CYAN}🔓 Session Mode: Isolated (Fresh Session)${NC}"
    echo "🔎 Validator Session: $VALIDATOR_SESSION_ID"
else
    echo -e "${CYAN}🔗 Session Mode: Reference${NC}"
    echo "📊 Reference Session: $REF_SESSION_ID"
    echo "🔎 Validator Session: $VALIDATOR_SESSION_ID"
fi
echo "📍 Iteration: $MAIN_ITERATION"
echo "📝 Workspace: $WORKSPACE_DIR"
echo ""

# Step 1: Build check (local)
echo -e "${BLUE}[1/3]${NC} ${YELLOW}Build Status Check...${NC}"
cd "$WORKSPACE_DIR"
if npm run build 2>&1 | tail -10 > /tmp/build.log; then
    BUILD_STATUS="✅ PASS"
    BUILD_ERROR=""
else
    BUILD_STATUS="❌ FAIL"
    BUILD_ERROR=$(tail -3 /tmp/build.log)
fi
echo "$BUILD_STATUS"

# Step 2: Component Validation with Playwright
echo ""
echo -e "${BLUE}[2/4]${NC} ${YELLOW}Checking Components with Playwright...${NC}"

if command -v playwright-cli &> /dev/null; then
    if PLAYWRIGHT_OUTPUT=$(playwright-cli -h 2>&1); then
        PLAYWRIGHT_STATUS="✅ Playwright ready"
        PLAYWRIGHT_CHECK=$(echo "$PLAYWRIGHT_OUTPUT" | head -3)
    else
        PLAYWRIGHT_STATUS="⚠️  Playwright check inconclusive"
        PLAYWRIGHT_CHECK="Check playwright-cli manually"
    fi
else
    PLAYWRIGHT_STATUS="⚠️  Playwright not available"
    PLAYWRIGHT_CHECK="Install: npm install -D @playwright/test"
fi
echo "$PLAYWRIGHT_STATUS"

# Step 3: Load project standards
echo ""
echo -e "${BLUE}[3/4]${NC} ${YELLOW}Loading Project Standards...${NC}"

STANDARDS_DOC=""
if [ -f ".github/copilot-instructions.md" ]; then
    STANDARDS_DOC=$(cat .github/copilot-instructions.md)
    echo "✅ Loaded Angular standards"
else
    echo "⚠️  Standards doc not found"
fi

# Step 4: Spawn Qwen Agent for Validation
echo ""
echo -e "${BLUE}[4/5]${NC} ${YELLOW}Spawning Qwen Validation Agent...${NC}"

VALIDATION_PROMPT="Follow the repo workflow: social-media/workflow/audit-execute.md

You are the validator for an agentic execution loop. Your job is to audit the last implementation and bookkeeping.

PLAN ROOT:
- $PLAN_ROOT_DEFAULT

PROJECT STANDARDS:

\`\`\`
$STANDARDS_DOC
\`\`\`

DO NOT:
- Provide generic advice
- Focus on minor style issues
- Get distracted by non-code files
- Make assumptions without evidence, actually check the code
- Be vague, be specific and actionable,

AUDIT TASK (social-media/workflow/audit-execute.md):
1. Identify the milestone folder in $PLAN_ROOT_DEFAULT that was most likely worked on recently.
2. Verify social-media/workflow/execute.md bookkeeping is correct in that milestone:
   - Progress.md updated
   - prd.json updated (next item passes=true only if fully done)
   - summary.md created/updated if milestone complete
3. Audit code changes for correctness and completeness (no stubs/placeholders).
4. Ensure acceptance criteria for the PRD item are met.
5. Ensure tests/build pass signals are meaningful (if build failed, treat as blocker).


Just because it works doesn't mean it's good. It might be stubbed, incomplete, or not follow best practices. Be critical and thorough.

OUTPUT FORMAT (concise):
---
ITERATION: $MAIN_ITERATION
CODE_HEALTH: [excellent/good/fair/poor]
BUILD_STATUS: $BUILD_STATUS
PLAYWRIGHT: $PLAYWRIGHT_STATUS
STANDARDS_ADHERENCE: [%]
ISSUES: [count]
BLOCKERS: [yes/no]

## Key Findings
- [finding 1]
- [finding 2]  
- [finding 3]

## Standards Violations (if any)
- [violation 1]

## Recommendations
1. [action]
2. [action]
---

Be direct and actionable. Focus on what matters."

AGENT_OK=0
AGENT_ERROR=""

run_qwen_validation() {
    if [ -n "$VALIDATOR_SESSION_ID_OVERRIDE" ]; then
        qwen --resume "$1" --yolo -p "$VALIDATION_PROMPT" 2>&1
    else
        qwen --session-id "$1" --yolo -p "$VALIDATION_PROMPT" 2>&1
    fi
}

if AGENT_OUTPUT=$(run_qwen_validation "$VALIDATOR_SESSION_ID"); then
    echo -e "${GREEN}✅ Agent Analysis Complete${NC}"
    AGENT_OK=1
    AGENT_RESULT="$AGENT_OUTPUT"
else
    # Common failure mode: session lock/collision. Retry once with a fresh session id.
    if echo "$AGENT_OUTPUT" | grep -qi "session id .* is already in use"; then
        echo -e "${YELLOW}⚠️  Validator session is already in use; retrying with a fresh session...${NC}"
        if command -v uuidgen >/dev/null 2>&1; then
            VALIDATOR_SESSION_ID="validator_retry_$(uuidgen | tr '[:upper:]' '[:lower:]')_iter_${MAIN_ITERATION}"
        elif command -v python3 >/dev/null 2>&1; then
            VALIDATOR_SESSION_ID="validator_retry_$(python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || echo $(date +%s))_iter_${MAIN_ITERATION}"
        else
            VALIDATOR_SESSION_ID="validator_retry_$(date +%s)_iter_${MAIN_ITERATION}"
        fi

        if AGENT_OUTPUT_2=$(run_qwen_validation "$VALIDATOR_SESSION_ID"); then
            echo -e "${GREEN}✅ Agent Analysis Complete${NC}"
            AGENT_OK=1
            AGENT_RESULT="$AGENT_OUTPUT_2"
        else
            echo -e "${RED}❌ Agent Analysis Failed${NC}"
            AGENT_OK=0
            AGENT_ERROR="$AGENT_OUTPUT_2"
            AGENT_RESULT="Agent analysis failed"
        fi
    else
        echo -e "${RED}❌ Agent Analysis Failed${NC}"
        AGENT_OK=0
        AGENT_ERROR="$AGENT_OUTPUT"
        AGENT_RESULT="Agent analysis failed"
    fi
fi

# Step 4: Generate Clean Report
echo ""
echo -e "${BLUE}[4/4]${NC} ${YELLOW}Generating Report...${NC}"

cat > "$VALIDATOR_REPORT" << EOF
# Validator Report - Iteration $MAIN_ITERATION

**Validated**: $(date '+%Y-%m-%d %H:%M:%S')
**Session**: $VALIDATOR_SESSION_ID ($SESSION_MODE)
**Reference Session**: ${REF_SESSION_ID:-none}
**Build**: $BUILD_STATUS
**Playwright**: $PLAYWRIGHT_STATUS

## Agent Analysis

$AGENT_RESULT

## Agent Status

AGENT_OK: $AGENT_OK

EOF

if [ "$AGENT_OK" -ne 1 ]; then
cat >> "$VALIDATOR_REPORT" << EOF

## Agent Error Output (truncated)

\`\`\`
$(echo "$AGENT_ERROR" | tail -50)
\`\`\`
EOF
fi

# Check result
if [ "$AGENT_OK" -ne 1 ]; then
    REPORT_STATUS="❌ VALIDATOR AGENT FAILED"
    EXIT_CODE=1
elif [[ "$AGENT_RESULT" == *"BLOCKERS: yes"* ]]; then
    REPORT_STATUS="⚠️  BLOCKERS FOUND"
    EXIT_CODE=1
elif [[ "$BUILD_STATUS" == *"FAIL"* ]]; then
    REPORT_STATUS="❌ BUILD FAILED"
    EXIT_CODE=1
else
    REPORT_STATUS="✅ VALIDATION OK"
    EXIT_CODE=0
fi

echo -e "$REPORT_STATUS"

# Summary
echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Validation Complete${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Results:"
echo "   Build: $BUILD_STATUS"
echo "   Status: $REPORT_STATUS"
echo "   Report: .validator-report.md"
echo ""

exit $EXIT_CODE
