# Ralph Critic Integration with Stub Detector

## Overview

`ralph-critic.sh` now uses the fast Go-based stub detector tool as a **prerequisite** before running any analysis. This provides immediate visibility into stubbed/mocked implementations in your codebase.

## How It Works

### 1. Default Usage (Agent Mode)
```bash
./ralph-critic.sh --session-id my-session
```

**Process:**
1. Initializes critic report
2. Runs Go stub detector (scans entire repo)
3. Appends findings to `.critic-report.md`
4. Spawns Qwen critic agent for analysis
5. Generates PRD items in `docs/PLAN`

### 2. Static Scan Only
```bash
./ralph-critic.sh --static-scan
```

**Process:**
1. Runs stub detector immediately
2. Appends Python-based critic analysis
3. Creates backlog without agent

### 3. Limit Results
```bash
./ralph-critic.sh --static-scan --max-items 100
./ralph-critic.sh --session-id id --max-items 500
```

## Output

All stub detector output is written to **`.critic-report.md`** in a dedicated section:

```markdown
## 📋 Stub Detector Scan

**Command**: `bash agents/find-stubs.sh . -max-items 200`
**Run timestamp**: 2026-02-21 05:58:13

```
🔍 STUB DETECTOR REPORT
======================================================================
Total Findings: 15
Files with Findings: 4
...
```

### To re-run with different range:
```bash
bash agents/find-stubs.sh . -max-items 500    # Increase to 500 findings
bash agents/find-stubs.sh . -json            # JSON output
```
```

## Re-Running Stub Detector

If you need to review findings with different parameters without running full critic:

```bash
# Increase findings limit
bash agents/find-stubs.sh . -max-items 500

# Get JSON output for automation
bash agents/find-stubs.sh . -json

# Filter by kind
bash agents/find-stubs.sh . -json -max-items 100 | jq '.findings_by_kind'

# Combine options
bash agents/find-stubs.sh . -json -max-items 300 | jq '.total_findings'
```

## Stub Detector vs Python Script

| Feature | Go Detector | Python Script |
|---------|-----------|---------------|
| Speed | ⚡ Fast single-pass | Moderate |
| Format | Text + JSON | JSON only |
| Real-time output | Yes | Async |
| Pattern matching | 19 patterns | 19 patterns |
| Exclusions | PLAN/, docs, etc. | docs only |

## Findings Structure

The stub detector identifies:

- **TODO/FIXME/XXX** - Common code markers
- **mock/stub** - Mocked implementations
- **placeholder** - Placeholder patterns
- **not_implemented** / **unimplemented** - Missing functionality
- **in_real_impl** / **in_full_impl** - Real implementation markers
- **for_now** - Temporary code
- **TS-specific patterns** - Error throws, mock data, etc.

## Example Workflow

```bash
# 1. Run critic with default settings (200 findings)
./ralph-critic.sh --static-scan

# 2. Review findings in .critic-report.md
cat .critic-report.md | grep "Total Findings"

# 3. Need more context? Re-run with larger scope
bash agents/find-stubs.sh . -max-items 500 -json | jq '.findings_by_file | keys'

# 4. Check what the critic backlog generated
cat docs/PLAN/Phase-0-Critic-Backlog/Milestone-0.1-Unmock-Codebase/prd.json | jq '.items[0]'

# 5. Start implementing items
vim docs/PLAN/Phase-0-Critic-Backlog/Milestone-0.1-Unmock-Codebase/Progress.md
```

## Troubleshooting

**"Stub detector not found"**
```bash
# Make sure it's built
cd agents/tools && go build -o stub-detector main.go
```

**Want to change findings limit?**
```bash
# Default is 200, edit MAX_ITEMS in ralph-critic.sh
MAX_ITEMS=500 ./ralph-critic.sh --static-scan
```

**Report too large?**
```bash
# Reduce the limit for next run
./ralph-critic.sh --static-scan --max-items 50
```

## Notes

- Stub detector runs automatically before any critic analysis
- Output is always appended to `.critic-report.md` for historical tracking
- PLAN/ directories and documentation files are excluded (no false positives)
- Each re-run updates the findings in the report
