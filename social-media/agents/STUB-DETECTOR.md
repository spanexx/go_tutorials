# Stub Detector - Quick Start

A blazingly fast Go-based tool for finding stubbed, mocked, and placeholder implementations in your codebase.

## Installation

Already built! Located at: `agents/tools/stub-detector`

## Quick Usage

```bash
# Scan current directory (text output)
./agents/find-stubs.sh

# JSON output
./agents/find-stubs.sh . -json

# Limit results
./agents/find-stubs.sh . -max-items 100

# Specify workspace
./agents/find-stubs.sh /path/to/project
```

## What It Finds

### Core Patterns (All Languages)
- `TODO` - To-do comments
- `FIXME` - Fix-me comments  
- `XXX` - Code markers
- `mock` - Mock implementations
- `stub` - Stubbed code
- `placeholder` - Placeholder text
- `not implemented` / `unimplemented`
- `in real implementation` - Real impl markers
- `in full implementation` - Full impl markers
- `for now` - Temporary code

### TypeScript/Angular Specific
- `throw new Error("not implemented")`
- Empty returns (`null`, `undefined`, `[]`)
- Private mock variables
- Mock data comments
- Hardcoded test data

## What It Excludes

**Directories:**
- `.git`, `node_modules`, `dist`, `build`
- `.angular`, `.cache`, `.ralph`
- `coverage`, `test-results`
- `docs/` (including all `PLAN/` subdirectories)

**Files:**
- `ralph-critic.sh`, `progress.md`
- `package-lock.json`, `yarn.lock`
- Documentation markdown: `README.md`, `CHANGELOG.md`, `QWEN.md`, etc.

## Output Formats

### Text (Human-Readable)
```
🔍 STUB DETECTOR REPORT
======================================================================
Total Findings: 42
Files with Findings: 8

📊 FINDINGS BY KIND:
  todo: 18
  fixme: 5
  mock: 12
  stub: 7

📁 FINDINGS BY FILE:
----------------------------------------------------------------------
src/services/auth.service.ts:23
  Kinds: todo
  Code: // TODO: implement JWT validation
```

### JSON
```json
{
  "total_findings": 42,
  "unique_files": 8,
  "findings_by_kind": {
    "todo": 18,
    "fixme": 5
  },
  "findings_by_file": {
    "src/services/auth.service.ts": [...]
  }
}
```

## Integration with ralph-critic

Use before running the critic:

```bash
# Get a summary of stubs to address
bash agents/find-stubs.sh

# Export for automation
bash agents/find-stubs.sh -json > findings.json

# Integrate into CI/CD
bash agents/find-stubs.sh . -json | jq '.total_findings'
```

## Performance

- Scans 1000+ files in seconds
- Single-pass pattern matching
- Automatic deduplication
- Efficient directory pruning

## Troubleshooting

**Need to rebuild?**
```bash
cd agents/tools
go build -o stub-detector main.go
```

**Check available patterns:**
See `agents/tools/main.go` lines 29-56 for pattern definitions

**Add custom patterns:**
Edit `patterns` and `tsPatterns` arrays in `agents/tools/main.go`
