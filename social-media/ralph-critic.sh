#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_ROOT_DEFAULT="$WORKSPACE_DIR/docs/PLAN"

SESSION_ID=""
REF_SESSION_ID=""
PLAN_ROOT="$PLAN_ROOT_DEFAULT"
MAX_ITEMS=200

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
    -h|--help)
      cat <<EOF
Usage:
  ./ralph-critic.sh [session-id] [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --session-id <id> [--plan-root PATH] [--max-items N]
  ./ralph-critic.sh --ref-session-id <id> [--plan-root PATH] [--max-items N]

Behavior:
- Scans the repo for mocked/stubbed implementations (TODO/FIXME/placeholder/etc.)
- Writes a backlog milestone under docs/PLAN so ralph iterations can implement items

Notes:
- session-id is accepted but not required (scan is static).
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

python3 - <<'PY'
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

# Exclude the critic script itself to avoid false positives from its own regex patterns.
exclude_files = {"ralph-critic.sh"}

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
    ("todo", re.compile(r"\\bTODO\\b", re.IGNORECASE)),
    ("fixme", re.compile(r"\\bFIXME\\b", re.IGNORECASE)),
    ("xxx", re.compile(r"\\bXXX\\b", re.IGNORECASE)),
    ("mock", re.compile(r"\\bmock\\b", re.IGNORECASE)),
    ("stub", re.compile(r"\\bstub\\b", re.IGNORECASE)),
    ("placeholder", re.compile(r"\\bplaceholder\\b", re.IGNORECASE)),
    ("not_implemented", re.compile(r"not\\s+implemented|unimplemented", re.IGNORECASE)),
    ("in_real_impl", re.compile(r"in\\s+real\\s+implementation", re.IGNORECASE)),
]

# Extra heuristics for TS/JS.
extra_ts_patterns = [
    ("throw_not_impl", re.compile(r"throw\\s+new\\s+Error\\(.*not\\s+implemented.*\\)", re.IGNORECASE)),
    ("return_empty", re.compile(r"return\\s+(of\\(\\s*\\[\\s*\\]\\s*\\)|\\[\\s*\\]\\s*;|null\\s*;|undefined\\s*;)", re.IGNORECASE)),
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
