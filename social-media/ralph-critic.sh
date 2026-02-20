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
- Scans the repo for mocked/stubbed implementations (TODO/FIXME/placeholder/etc.)
- Writes a backlog milestone under docs/PLAN so ralph iterations can implement items

Notes:
- session-id is accepted but not required (scan is static).
- --agent will also spawn a Qwen critic agent (requires --session-id).
- Default behavior is agent-based critic (unless --static-scan is provided).
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

CRITIC_SCAN_OUTPUT=$(python3 - <<'PY'
import json
import os
import re
import sys
from datetime import datetime, timezone

workspace_dir = os.environ.get("WORKSPACE_DIR")
plan_root = os.environ.get("PLAN_ROOT")
max_items = int(os.environ.get("MAX_ITEMS", "200"))

if not workspace_dir:
    # fallback: assume current working directory is repo root
    workspace_dir = os.getcwd()
if not plan_root:
    plan_root = os.path.join(workspace_dir, "docs", "PLAN")

exclude_dirnames = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".angular",
    ".cache",
    ".ralph",
    "coverage",
    "playwright-report",
    "test-results",
    "docs",
}

# But we DO want to scan docs/PLAN? No, it will create self-referential findings.
exclude_paths_containing = [os.path.join("docs", "PLAN")]

# Exclude the critic script itself and progress.md to avoid false positives.
# - ralph-critic.sh: contains regex patterns that match its own detection logic
# - progress.md: iteration log that documents past fixes (may contain quoted patterns)
exclude_files = {"ralph-critic.sh", "progress.md"}

include_exts = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".go",
    ".html",
    ".scss",
    ".css",
    ".json",
    ".md",
    ".sh",
}

# Prefer signals that indicate mock/stub behavior.
patterns = [
    ("todo", re.compile(r"\bTODO\b", re.IGNORECASE)),
    ("fixme", re.compile(r"\bFIXME\b", re.IGNORECASE)),
    ("xxx", re.compile(r"\bXXX\b", re.IGNORECASE)),
    ("mock", re.compile(r"\bmock\b", re.IGNORECASE)),
    ("stub", re.compile(r"\bstub\b", re.IGNORECASE)),
    ("placeholder", re.compile(r"\bplaceholder\b", re.IGNORECASE)),
    ("not_implemented", re.compile(r"not\s+implemented|unimplemented", re.IGNORECASE)),
    ("in_real_impl", re.compile(r"in\s+real\s+implementation", re.IGNORECASE)),
]

# Extra heuristics for TS/JS (Angular/TypeScript specific).
extra_ts_patterns = [
    ("throw_not_impl", re.compile(r"throw\s+new\s+Error\(.*not\s+implemented.*\)", re.IGNORECASE)),
    ("return_empty", re.compile(r"return\s+(of\(\s*\[\s*\]\s*\)|\[\s*\]\s*;|null\s*;|undefined\s*;)", re.IGNORECASE)),
    # Angular/TypeScript mock patterns
    ("private_mock", re.compile(r"private\s+mock\w*\s*[:=]")),
    ("private_mock_array", re.compile(r"private\s+\w*Mock\w*\s*[:=]\s*\[")),
    ("mock_data_var", re.compile(r"(mockData|mockList|mockItems|mockResults)\s*[:=]")),
    ("simulate_api", re.compile(r"//\s*(Simulate|simulate)\s+(API|api|call)")),
    ("mock_comment", re.compile(r"//\s*Mock\s+data")),
    ("hardcoded_mock", re.compile(r"//\s*[Hh]ardcoded\s+(mock|test|dummy)")),
    ("setTimeout_mock", re.compile(r"setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*mock[^}]*\}")),
    ("random_mock_data", re.compile(r"Math\.random\(\).*mock|mock.*Math\.random\(\)")),
]

findings = []

for root, dirs, files in os.walk(workspace_dir):
    # prune excluded dirs
    dirs[:] = [d for d in dirs if d not in exclude_dirnames]

    rel_root = os.path.relpath(root, workspace_dir)
    if rel_root == ".":
        rel_root = ""

    # skip docs/PLAN completely
    rel_root_norm = rel_root.replace("\\", "/")
    if any(rel_root_norm.startswith(p.replace("\\", "/")) for p in exclude_paths_containing):
        continue

    for fname in files:
        _, ext = os.path.splitext(fname)
        if ext not in include_exts:
            continue

        # Skip excluded files (e.g., ralph-critic.sh to avoid false positives)
        if fname in exclude_files:
            continue

        path = os.path.join(root, fname)
        rel_path = os.path.relpath(path, workspace_dir).replace("\\", "/")
        if rel_path.startswith("docs/PLAN/"):
            continue

        # Avoid huge vendor-ish lockfiles
        if fname in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock"}:
            continue

        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for idx, line in enumerate(f, start=1):
                    hay = line.strip("\n")
                    if not hay.strip():
                        continue

                    matched = []
                    for kind, rx in patterns:
                        if rx.search(hay):
                            matched.append(kind)
                    if ext in {".ts", ".tsx", ".js", ".jsx"}:
                        for kind, rx in extra_ts_patterns:
                            if rx.search(hay):
                                matched.append(kind)

                    if matched:
                        findings.append({
                            "file": rel_path,
                            "line": idx,
                            "kinds": sorted(set(matched)),
                            "snippet": hay.strip(),
                        })
        except OSError:
            continue

# De-duplicate by (file,line,snippet)
seen = set()
deduped = []
for f in findings:
    key = (f["file"], f["line"], f["snippet"])
    if key in seen:
        continue
    seen.add(key)
    deduped.append(f)

# Cap to max_items but keep deterministic order
# Sort by file then line

deduped.sort(key=lambda x: (x["file"], x["line"]))
deduped = deduped[:max_items]

# Group by file to avoid creating an enormous item list.
by_file = {}
for f in deduped:
    by_file.setdefault(f["file"], []).append(f)

# Build PRD items: 1 per file.
items = []
for i, (file, fs) in enumerate(by_file.items(), start=1):
    # Stable IDs like C.001
    item_id = f"C.{i:03d}"

    # Build acceptance criteria listing the exact occurrences to remove/replace.
    ac = [
        "Replace mocked/stubbed logic with real implementation (no placeholders).",
        "Remove TODO/FIXME/placeholder markers tied to this behavior.",
        "Add/update minimal tests or checks appropriate for the touched area.",
        "Update docs/PLAN bookkeeping: Progress.md and mark this PRD item passes=true."
    ]

    occurrences = [f"{f['file']}:{f['line']} [{', '.join(f['kinds'])}] {f['snippet']}" for f in fs[:20]]
    if len(fs) > 20:
        occurrences.append(f"... and {len(fs) - 20} more occurrences in this file")

    items.append({
        "id": item_id,
        "title": f"Unmock / remove stubs in {file}",
        "type": "tech_debt",
        "description": "This file contains indicators of mocked/stubbed/placeholder logic that should be implemented properly.",
        "acceptance_criteria": ac + occurrences,
        "passes": False,
    })

# Option B: if the scan yields no actionable items, still generate one PRD item
# so Ralph has explicit work to do (audit scan coverage + tune patterns).
if not items:
    items.append({
        "id": "C.001",
        "title": "Audit codebase for stubs/mocks and tune critic scan patterns",
        "type": "tech_debt",
        "description": "The automatic critic scan produced 0 findings. Perform a targeted manual audit and improve the critic scanner so it reliably detects stub/mock/placeholder implementations in this repo.",
        "acceptance_criteria": [
            "Perform a manual sweep for stub/mock patterns in production code (Angular services/components, Go handlers/services).",
            "Update ralph-critic.sh patterns to catch this repo's conventions (add at least 3 additional patterns).",
            "Re-run ./ralph-critic.sh and confirm it produces actionable PRD items when stubs/mocks exist (or explicitly document why none exist).",
            "Update docs/PLAN bookkeeping: Progress.md and mark this PRD item passes=true."
        ],
        "passes": False,
    })

phase_dir = os.path.join(plan_root, "Phase-0-Critic-Backlog")
milestone_dir = os.path.join(phase_dir, "Milestone-0.1-Unmock-Codebase")
os.makedirs(milestone_dir, exist_ok=True)

# Phase README (only create if missing)
phase_readme = os.path.join(phase_dir, "README.md")
if not os.path.exists(phase_readme):
    with open(phase_readme, "w", encoding="utf-8") as f:
        f.write("# Phase 0: Critic Backlog\n\n")
        f.write("## Overview\n")
        f.write("This phase is automatically generated by ralph-critic.sh. It captures mocked/stubbed implementations and TODO-style markers that should be converted into real implementations.\n\n")
        f.write("## Milestones\n\n")
        f.write("### Milestone 0.1 - Unmock Codebase\n")
        f.write("Automated backlog for removing mocks/stubs/placeholders across the codebase.\n")

# Milestone README
with open(os.path.join(milestone_dir, "README.md"), "w", encoding="utf-8") as f:
    f.write("# Milestone 0.1 - Unmock Codebase\n\n")
    f.write("## Problem Statement\n")
    f.write("The codebase contains mocked/stubbed implementations and TODO-style markers that block production readiness and hide missing functionality.\n\n")
    f.write("## Source\n")
    f.write("Generated by `./ralph-critic.sh`.\n\n")
    f.write("## Rules\n")
    f.write("- Implement exactly one PRD item per iteration.\n")
    f.write("- Do required bookkeeping: update Progress.md and mark passes=true in prd.json.\n")

# prd.json
prd = {
    "milestone": "0.1",
    "title": "Unmock Codebase",
    "problem": "Convert mocked/stubbed implementations and TODO-style markers into real implementations.",
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "max_items": max_items,
    "findings_count": len(deduped),
    "files_with_findings": len(by_file),
    "items": items,
}
with open(os.path.join(milestone_dir, "prd.json"), "w", encoding="utf-8") as f:
    json.dump(prd, f, indent=2)
    f.write("\n")

# Progress.md
progress_path = os.path.join(milestone_dir, "Progress.md")
if not os.path.exists(progress_path):
    with open(progress_path, "w", encoding="utf-8") as f:
        f.write("# Milestone 0.1 - Unmock Codebase - Progress\n\n")
        f.write("## Status: 🔴 Not Started\n\n")
        f.write("## Notes\n")
        f.write("This milestone is auto-generated; rerun critic to refresh the backlog.\n")

# summary.md
with open(os.path.join(milestone_dir, "summary.md"), "w", encoding="utf-8") as f:
    f.write("# Milestone 0.1 - Unmock Codebase - Summary\n\n")
    f.write(f"## Generated\n- Findings: {len(deduped)}\n- Files: {len(by_file)}\n- PRD items: {len(items)}\n\n")
    f.write("## Next\nImplement items top-to-bottom, marking each as passes=true and updating Progress.md.\n")

print(f"critic: wrote backlog to {milestone_dir} (items={len(items)}, findings={len(deduped)})")
PY

)

echo "$CRITIC_SCAN_OUTPUT"

if [ -f "$CHAT_SCRIPT" ]; then
  bash "$CHAT_SCRIPT" post "CRITIC" "$CRITIC_SCAN_OUTPUT" || true
fi
