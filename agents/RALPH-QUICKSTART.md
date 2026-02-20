# Ralph Quick Start Guide

## What is Ralph?

Ralph is an **autonomous AI-powered development loop** that uses `qwen` to continuously analyze the SocialHub codebase and implement improvements.

## The Command

```bash
./ralph.sh <iterations> [session-id] [--validate-every N]
```

Where:
- `<iterations>` = number of development cycles to run
- `[session-id]` = optional persistent session ID (omit for new session per iteration)
- `[--validate-every N]` = optional validation frequency (default: 2)

## Quick Examples

### New Session Per Iteration (Default)
```bash
./ralph.sh 1    # 1 iteration, new session
./ralph.sh 5    # 5 iterations, new sessions each time
./ralph.sh 10   # 10 iterations, fresh context each time
```

### Persistent Session (Maintain Context)
```bash
./ralph.sh 5 cbad5cd5-78a0-4cc9-b36f-9712611b9d06
# All 5 iterations use same session - AI remembers previous work
```

### Custom Validation
```bash
./ralph.sh 10 --validate-every 3              # New session, validate every 3
./ralph.sh 10 cbad5cd5-78a0-4cc9-b36f-9712611b9d06 --validate-every 5  # Persistent, validate every 5
./ralph.sh 10 --validate-every 0              # New session, no validation
```

## What Ralph Does

Each iteration:
1. ✅ Reviews README and understands project
2. ✅ Analyzes codebase in src/app/
3. ✅ Identifies next improvement or feature
4. ✅ Implements with production-quality code
5. ✅ Logs results to progress.md

## View Progress

```bash
cat progress.md
```

Shows all completed iterations and their details.

## Typical Session

```bash
# Start the dev server
npm start &

# Run 5 autonomous improvement cycles
./ralph.sh 5

# Check what was implemented
cat progress.md

# Verify everything compiles
npm run build

# Review and commit
git add -A && git commit -m "Ralph: Autonomous improvements"
```

## Session Modes

### Mode 1: Fresh Session Each Iteration
```bash
./ralph.sh 5
```
- Each iteration starts fresh (no carried context)
- Safer, more predictable
- Perfect for testing

### Mode 2: Same Session (Context Retained)
```bash
./ralph.sh 5 cbad5cd5-78a0-4cc9-b36f-9712611b9d06
```
- AI maintains context across all iterations
- Can reference previous implementations
- More coherent progression

## Typical Improvements Ralph Makes

- 🎨 UI/UX enhancements
- 📚 Documentation updates
- 🐛 Bug fixes
- 🔧 Code quality improvements
- ✨ New features
- 📱 Responsive design fixes
- 🎯 Performance optimizations
- ♿ Accessibility improvements

## Tips

1. **Start small**: Run 1-2 iterations first to see results
2. **Check output**: Review progress.md between runs
3. **Keep running**: Multiple iterations can build on each other
4. **Verify builds**: Always run `npm run build` after
5. **Commit often**: Save progress with git regularly

## Troubleshooting

### Script won't execute
```bash
chmod +x ralph.sh
```

### Qwen not found
Ensure qwen CLI is installed and the session ID is valid.

### Build fails
Check progress.md to see what changed, then review with `npm run build`.

## For More Details

See [RALPH-GUIDE.md](RALPH-GUIDE.md) for comprehensive documentation.
./ralph.sh 5

# Run 10 cycles
./ralph.sh 10
```

## How to Use

### Step 1: Start Development Server
```bash
npm start
```
Keep this running in one terminal. You'll see changes live as Ralph implements them.

### Step 2: Run Ralph
In another terminal:
```bash
cd /home/spanexx/Shared/Learn/go_tutorials/social-media
./ralph.sh 5
```

### Step 3: Watch Progress
- Terminal shows colored output with each iteration
- Browser shows live changes via hot reload
- Check `progress.md` for detailed implementation logs

## What Ralph Does Each Iteration

```
┌─────────────────────────────────┐
│ 1. Read Docs & Code              │
│    (SCREENS.md, README.md, src/) │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 2. Analyze Current State         │
│    (What's implemented, what's   │
│     missing, next priority)      │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 3. Decide Next Feature           │
│    (Follow design system,        │
│     maintain patterns)           │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 4. Implement                     │
│    (Write code, style,           │
│     create components)           │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 5. Build & Verify                │
│    (Check no errors,             │
│     compiles successfully)       │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 6. Log Results to progress.md   │
│    (Track what was implemented) │
└─────────────────────────────────┘
```

## Output Colors

```
🔵 BLUE    - Status messages, headers, progress indicators
🟢 GREEN   - ✓ Success, completed tasks
🔴 RED     - ✗ Failures, errors, issues
🟡 YELLOW  - ⚠️  Warnings, iteration separators
```

## Real Example Output

```
[Iteration 1/5] Running automated task...
✓ Task completed successfully
[Iteration 1/5] Verifying build...
✓ Build successful
Waiting 5 seconds before next iteration...

Total Iterations: 5
Successful: 5
Failed: 0
✓ All iterations completed successfully!
```

## View Results

### In Terminal
```bash
# Watch real-time output
./ralph.sh 5

# See last 50 lines of progress
tail -50 progress.md

# View entire progress file
cat progress.md
```

### In Browser
Open http://localhost:4200 - changes appear automatically as Ralph implements them

## Progress Tracking

All work is logged to `progress.md`:

```bash
# View full progress history
cat progress.md

# See latest session
tail -100 progress.md

# Search for specific features
grep -i "feature-name" progress.md
```

## Example Sessions

### Quick Test (1 iteration)
```bash
./ralph.sh 1
# Time: ~30-60 seconds
# Good for: Testing setup, verifying it works
```

### Small Feature (3 iterations)
```bash
./ralph.sh 3
# Time: ~2-3 minutes
# Good for: Implementing a single feature/component
```

### Development Sprint (5 iterations)
```bash
./ralph.sh 5
# Time: ~5-8 minutes
# Good for: Multiple features, refactoring
```

### Long Session (10 iterations)
```bash
./ralph.sh 10
# Time: ~10-15 minutes
# Good for: Overnight runs, major updates
```

## Tips & Tricks

### Monitor Progress Live
```bash
# Terminal 1: Run ralph
./ralph.sh 5

# Terminal 2: Watch progress file
watch -n 2 'tail -20 progress.md'

# Terminal 3: Keep browser open
# Navigate to http://localhost:4200
```

### Backup Before Long Runs
```bash
git add .
git commit -m "Before ralph run"
./ralph.sh 10
```

### Review Changes
```bash
git diff
git log --oneline -20
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "ralph.sh: command not found" | `chmod +x ralph.sh` |
| Iteration fails | Check `progress.md` for errors |
| Build doesn't compile | Manual fix needed, then retry |
| Session expired | Update SESSION_ID in ralph.sh |
| Changes not showing | Check browser cache, npm start running |

## Configuration

Edit `ralph.sh` to customize:

```bash
# Change session (line ~15)
SESSION_ID="your-session-id"

# Change iterations (line ~16)
ITERATIONS=${1:-1}

# Change progress file (line ~17)
PROGRESS_FILE="custom-progress.md"

# Change delay between runs (line ~140)
sleep 5  # Change 5 to your preferred seconds
```

## Next Steps

1. **First Run**: 
   ```bash
   ./ralph.sh 1
   ```

2. **Monitor Progress**:
   ```bash
   cat progress.md
   ```

3. **Check Implementation**:
   - View browser at http://localhost:4200
   - Review git changes: `git diff`

4. **Run More Iterations**:
   ```bash
   ./ralph.sh 5
   ```

5. **Deploy**:
   ```bash
   npm run build
   ```

## Files Created

- ✅ `ralph.sh` - Main script (executable)
- ✅ `RALPH.md` - Full documentation
- ✅ `progress.md` - Auto-created, stores all logs
- ✅ `SCREENS.md` - Design specification (used by ralph)
- ✅ `README.md` - Project overview (used by ralph)

## Performance Notes

- Each iteration: **30-60 seconds**
- 5 iterations: **3-5 minutes**
- 10 iterations: **5-10 minutes**
- 20 iterations: **10-20 minutes**

Add 5 seconds per iteration for delays between runs.

## Key Files Ralph Uses

Ralph reads and analyzes these files:
- `SCREENS.md` - What features to implement
- `README.md` - Project overview
- `src/app/**` - Current codebase
- `package.json` - Project setup
- `angular.json` - Build configuration
- `styles.scss` - Global styles

Ralph modifies:
- Component files in `src/app/`
- Component styling (`.scss`)
- Component templates (`.html`)
- Routes in `app.routes.ts`
- Progress tracking in `progress.md`

## Advanced Usage

### Run in Background
```bash
nohup ./ralph.sh 20 > ralph.log 2>&1 &
tail -f ralph.log
```

### Schedule with Cron
```bash
# Run ralph every 2 hours
0 */2 * * * cd /home/spanexx/Shared/Learn/go_tutorials/social-media && ./ralph.sh 5 >> cron.log 2>&1
```

### Combine with Git
```bash
./ralph.sh 5
git add -A
git commit -m "Ralph iteration $(date +%s)"
git push
```

## Success Criteria

A successful ralph run should show:
- ✅ All iterations complete
- ✅ Build verification passes
- ✅ Browser shows no errors
- ✅ progress.md updated with details
- ✅ New features/fixes visible in UI

## Getting Help

1. Check `progress.md` for error details
2. Review `RALPH.md` for full documentation
3. Check build logs: `/tmp/build.log`
4. Review git changes: `git diff`
5. Check the qwen session status

---

**Ready to begin?**

```bash
./ralph.sh 1
```

Happy automating! 🚀
