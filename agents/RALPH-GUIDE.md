# Ralph - Autonomous Development Loop

Ralph is an autonomous development script that uses `qwen` to analyze the SocialHub codebase and implement improvements in an automated loop, with integrated code health validation.

## Overview

Ralph runs a configurable number of iterations where each iteration:
1. Analyzes the current codebase and README
2. Identifies the next logical improvement or feature
3. Implements it with production-quality code
4. Logs the results to `progress.md`
5. **[Optional]** Validates code health via independent validator session

This enables continuous autonomous development with built-in quality assurance.

## Quick Start

### Run with Default Validation (Every 2 Iterations)

```bash
# New session per iteration (fresh context each time)
./ralph.sh 10

# Use persistent session (maintain context across iterations)
./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06
```

### Run with Custom Validation Interval

```bash
# New session, validate every 3 iterations
./ralph.sh 10 --validate-every 3

# Persistent session, validate every 5 iterations
./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06 --validate-every 5

# New session, no validation
./ralph.sh 10 --validate-every 0
```

### Run Single Iteration

```bash
./ralph.sh 1
```

If no argument is provided, defaults to 1 iteration with validation enabled and new session per iteration.

## Examples

### Single Iteration
```bash
./ralph.sh 1
# Runs one cycle of analysis and implementation
```

### Multiple Iterations
```bash
./ralph.sh 5
# Runs 5 iterations, with 2-second delays between each
```

### Check Progress
```bash
cat progress.md
# View all logged iterations and their results
```

## How It Works

### Each Iteration:

1. **Analysis Phase**
   - Reads README.md to understand project scope
   - Analyzes src/app/ codebase structure
   - Identifies patterns and conventions

2. **Planning Phase**
   - Determines next priority improvement or feature
   - Considers code quality, documentation, and functionality

3. **Implementation Phase**
   - Implements the improvement with production-quality code
   - Uses existing patterns and conventions
   - Maintains responsive design
   - Ensures TypeScript type safety

4. **Verification Phase**
   - Confirms code compiles without errors
   - Validates implementation quality

5. **Logging Phase**
   - Summarizes what was accomplished
   - Logs to progress.md with timestamp
   - Records files modified and lines added

## Session Configuration

The script uses a persistent qwen session:
- **Session ID**: `cbad5cd5-78a0-4cc9-b36f-9712611b9d06`
- **Mode**: `--yolo` (autonomous execution)

This allows the AI to maintain context across iterations.

## Output

### Console Output
Ralph displays:
- Iteration progress (e.g., "Iteration 1/5")
- Status indicators (✅ SUCCESS, ❌ FAILED)
- Progress file location
- Session information

### Progress File (progress.md)

Each iteration logs:
```markdown
### Iteration N
- **Date**: START_TIME → END_TIME
- **Status**: ✅ SUCCESS or ❌ FAILED

[Implementation summary and details]
```

## Quality Focus Areas

Ralph prioritizes:
1. **Code Quality**: Type safety, maintainability, patterns
2. **Documentation**: README updates, comments, clarity
3. **Features**: Complete implementations, no partial work
4. **Responsiveness**: Mobile, tablet, desktop support
5. **Testing**: Component functionality and edge cases

## Requirements

- `qwen` CLI installed and configured
- Active session with ID: `cbad5cd5-78a0-4cc9-b36f-9712611b9d06`
- Node.js and npm installed
- Angular build tools available

## Limitations

- Each iteration waits 2 seconds before starting the next
- Output is appended to progress.md (not overwritten)
- Requires network connectivity for qwen
- Session must remain active

## Typical Improvements Ralph Implements

Based on the project structure, Ralph might:
- Add new component features
- Improve styling and responsiveness
- Enhance documentation
- Fix bugs and TypeScript errors
- Add data models and services
- Implement missing features from SCREENS.md
- Optimize performance
- Add error handling
- Improve accessibility
- Refactor code for maintainability

## Validation Mode

Ralph includes an integrated validator that checks code health at specified intervals.

### How Validation Works

1. **Automatic Validation** (Default: every 2 iterations)
   ```bash
   ./ralph.sh 10  # Validates after iterations 2, 4, 6, 8, 10
   ```

2. **Custom Validation Frequency**
   ```bash
   ./ralph.sh 10 --validate-every 3  # Validate after 3, 6, 9 iterations
   ./ralph.sh 10 --validate-every 5  # Validate after 5, 10 iterations
   ./ralph.sh 10 --validate-every 0  # No validation
   ```

3. **Validation Checks**
   - ✅ TypeScript compilation (`npm run build`)
   - ✅ Code quality metrics (TODOs, console.logs, imports)
   - ✅ Component health status
   - ✅ Generates detailed report at `.validator-report.md`

4. **Independent Validation Session**
   - Runs in separate qwen session to avoid context conflicts
   - Main development session continues uninterrupted
   - Report available for review after validation completes

### Using Validator Reports

After validation completes:
```bash
# View latest validation report
cat .validator-report.md

# Check validation history
grep "Validation Result:" progress.md

# See build status
grep "Build Status:" .validator-report.md
```

### Manual Validation

```bash
# Run validator on specific iteration
./ralph-validator.sh cbad5cd5-78a0-4cc9-b36f-9712611b9d06 5
```

See [VALIDATOR-GUIDE.md](VALIDATOR-GUIDE.md) for comprehensive validation documentation.

## Tips for Best Results

1. **Start Small**: Begin with 1-3 iterations to see results
2. **Enable Validation**: Use default every-2-iterations mode
3. **Monitor Output**: Watch progress.md and .validator-report.md for patterns
4. **Verify Compilation**: Validator checks build automatically
5. **Review Changes**: Manually review significant implementations
6. **Commit Often**: Use git to track each iteration's changes

## Troubleshooting

### Script Doesn't Run
```bash
chmod +x ralph.sh ralph-validator.sh
```

### No Validation Happening
- Check validator script exists: `ls -la ralph-validator.sh`
- Make sure it's executable: `chmod +x ralph-validator.sh`
- Check with validation enabled: `./ralph.sh 5 --validate-every 2`

### No Output from Qwen
- Check qwen CLI is installed: `which qwen`
- Verify session ID is correct
- Check network connectivity

### Build Fails After Ralph Run
- Review progress.md for what changed
- Check .validator-report.md for validation errors
- Check TypeScript errors: `npm run build`
- Run `npm install` if dependencies were added

## Example Workflow

```bash
# Run 5 iterations with validation every 2 iterations
./ralph.sh 5

# Check what was implemented
cat progress.md

# Review validator findings
cat .validator-report.md

# Manually verify changes
npm start

# Review and test in browser

# Commit progress
git add -A
git commit -m "Ralph iterations with validation"

# Continue with more iterations
./ralph.sh 5
```

## Session Management

Ralph supports two session modes:

### Mode 1: New Session Per Iteration (Default)

```bash
./ralph.sh 10
```

Each iteration gets a fresh session (`session_<timestamp>_iter_N`):
- ✅ No context carried between iterations
- ✅ Each iteration is independent
- ✅ Lower risk of accumulated context issues
- ❌ No learning across iterations
- ❌ Slightly slower (session setup per iteration)

### Mode 2: Persistent Session

```bash
./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06
```

All iterations use the same session ID:
- ✅ Full context maintained across iterations
- ✅ AI can reference previous implementations
- ✅ Faster execution (reuses session)
- ❌ Context can become large
- ❌ Risk of accumulated inconsistencies

**Validation Sessions** (Always New):
- New session each validation: `validator_<timestamp>`
- Isolated analysis without affecting main context

### Choosing Session Mode

**Use New Per Iteration when**:
- Testing individual features
- Early development phase
- Want isolation between runs
- Prefer stability over context retention

**Use Persistent Session when**:
- Building coherently related features
- Want AI to remember previous implementations
- Running many iterations (faster)
- Building on previous iterations' work

## Customization

### Adjust Validation Frequency

**Conservative** (validate often):
```bash
./ralph.sh 10 --validate-every 1
```

**Balanced** (default):
```bash
./ralph.sh 10 --validate-every 2  # or just: ./ralph.sh 10
```

**Aggressive** (validate less):
```bash
./ralph.sh 10 --validate-every 5
```

### Disable Validation

```bash
./ralph.sh 10 --validate-every 0
```

## Future Enhancements

Possible improvements to the Ralph script:
- Git commit per iteration with auto-messages
- Performance metrics tracking
- Quality score calculation
- Integration with GitHub actions
- Slack notifications for completion
- Rollback functionality on failures
- A/B testing different implementation approaches
- Integration with Go backend implementation

---

Ralph enables continuous autonomous development of SocialHub with minimal human intervention while maintaining code quality and project vision.
