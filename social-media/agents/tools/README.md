# Stub Detector Tool

A fast Go-based tool to scan your codebase for stubbed, mocked, and placeholder implementations.

## Overview

The stub detector scans your entire codebase (excluding vendor directories and test files) and identifies:

- TODO, FIXME, XXX comments
- Mock and stub patterns
- Placeholder implementations
- Hardcoded test data
- Unimplemented functions
- Common Angular/TypeScript mock patterns

## Building

```bash
cd tools
go build -o stub-detector main.go
```

Or use the provided scripts:

```bash
# Build only
bash tools/BUILD.sh

# Build and run
bash find-stubs.sh
```

## Usage

### Basic scan (human-readable output)
```bash
./find-stubs.sh
```

### JSON output
```bash
./find-stubs.sh -json
```

### Limit number of findings
```bash
./find-stubs.sh -max-items 100
```

### Scan specific directory
```bash
./find-stubs.sh /path/to/workspace
```

### All options
```bash
./tools/stub-detector -workspace . -json -max-items 200
```

## Patterns Detected

### Base Patterns
- `TODO` - Standard to-do comments
- `FIXME` - Fix-me comments
- `XXX` - Explicit code marker
- `mock` - Mock implementations
- `stub` - Stubbed code
- `placeholder` - Placeholder patterns
- `not implemented` / `unimplemented` - Missing implementations
- `in real implementation` - Code tagged for real impl
- `in full implementation` - Code tagged for full impl
- `for now` - Temporary code markers

### TypeScript/Angular Patterns
- Throw errors with "not implemented"
- Return empty arrays/null/undefined
- Private mock variables
- Mock data comments
- Hardcoded test data
- Simulated API calls
- Random mock data generation

### Go Patterns
- Shared base patterns (TODO, FIXME, etc.)
- panic() statements with "not implemented"
- Empty function bodies

## Output Format

### Text Output (default)
```
🔍 STUB DETECTOR REPORT
======================================================================
Total Findings: 42
Files with Findings: 8

📊 FINDINGS BY KIND:
  fixme: 5
  mock: 12
  todo: 18
  xxx: 7

📁 FINDINGS BY FILE:
----------------------------------------------------------------------
src/services/auth.service.ts:23
  Kinds: todo
  Code: // TODO: implement real JWT validation

...
```

### JSON Output
```json
{
  "total_findings": 42,
  "unique_files": 8,
  "findings_by_file": {
    "src/services/auth.service.ts": [
      {
        "file": "src/services/auth.service.ts",
        "line": 23,
        "kinds": ["todo"],
        "snippet": "// TODO: implement real JWT validation"
      }
    ]
  },
  "findings_by_kind": {
    "todo": 18,
    "fixme": 5,
    "mock": 12
  }
}
```

## Integration with ralph-critic.sh

You can integrate this tool into the critic workflow:

```bash
# Run before the critic agent
bash find-stubs.sh > /tmp/stubs-summary.txt

# Use JSON output for automation
bash find-stubs.sh -json | jq '.findings_by_kind'
```

## Excluded Directories

The tool automatically skips:
- `.git`, `node_modules`, `dist`, `build`
- `.angular`, `.cache`, `.next`, `.nuxt`
- `coverage`, `test-results`, `playwright-report`
- `docs` (to avoid self-referential findings)

## Excluded Files

- `ralph-critic.sh` (to avoid false positives from pattern definitions)
- `progress.md` (to avoid findings from documented fixes)
- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`

## Performance

- Single-pass scanning with regex patterns
- Efficient directory tree walking
- Deduplication of findings
- Suitable for large codebases (1000+ files)

## Examples

### Find all TODOs in your project
```bash
./find-stubs.sh | grep -i todo
```

### Get a count of stubbed implementations
```bash
./find-stubs.sh -json | jq '.total_findings'
```

### Focus on mock patterns only
```bash
./find-stubs.sh -json | jq '.findings_by_file' | grep -i mock
```

### Export findings for reports
```bash
./find-stubs.sh -json > findings.json
```

## Troubleshooting

**Tool won't build:** Ensure Go 1.21+ is installed
```bash
go version
```

**Permission denied:** Make scripts executable
```bash
chmod +x find-stubs.sh
chmod +x tools/BUILD.sh
```

**No findings found:** Scan directories may be excluded; check with:
```bash
./tools/stub-detector -workspace . -json
```
