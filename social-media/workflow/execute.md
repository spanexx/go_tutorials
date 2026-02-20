# Execute (Milestone Task) Workflow

## Goal
Implement exactly one prioritized PRD item completely (no placeholders), following the owning milestone/phase constraints.

## Invocation modes

### Milestone mode (preferred)
Use this when you are already inside a specific milestone folder.

1. Read milestone docs:
   - `README.md`
   - `tasks.md`
   - `prd.json`
   - `Progress.md`

2. Pick **exactly one** PRD item to implement or more if user explicitly requests:
   - Choose the **next** PRD item **in sequence (top-to-bottom in `prd.json`)** where `passes=false`.

3. Implement the item end-to-end:
   - Follow acceptance criteria and any referenced docs.
   - Make only required code/config changes.
   - Do not introduce placeholders. If you cannot complete it, state what is missing and why.

4. TypeScript conventions:
   - If you create or substantially modify TypeScript files, ensure they include a short Code Map header and CID references when missing.
   - Follow the repo’s `/commenter` workflow (or nearby file patterns if `/commenter` is not present) or just leave a well informed comments for every block.

5. Update milestone tracking docs:
   - Update `Progress.md` with a short log entry of what changed.
   - Update `prd.json` by setting `passes=true` for the implemented PRD item.

6. If milestone is completed:
   - If **all** `prd.json` items are `passes=true`, create or update `summary.md` in the milestone folder.
   - Use other milestones’ `summary.md` files as examples.

7. Verify with tests:
   - Run the smallest relevant checks, then the repo-level defaults:
     - `pnpm -w lint`
     - `pnpm -w test`
   - Note: Jest does not support `--filter`. Prefer:
     - `pnpm -w test --runTestsByPath <path>`
     - `pnpm -w test --testPathPattern <pattern>`
     - `go test ./...`

8. Constraints:
   - Do not add dependencies by editing `package.json`.
   - For large/generated/gitignored files: do not attach full file context; inspect via terminal and reference only minimal snippets.

9. Affected files & dependencies:
   - ensure you update the `prd.json` affected files key.
   - ensure you update the `prd.json` affected dependencies key.

### Phase mode
Use this when you are asked to advance a whole phase.

1. Run the phase PRD scan:
   - `node ./scripts/phase-prd-scan.js <phase>`

2. Pick the next PRD item:
   - Choose the **next** PRD item **in sequence (top-to-bottom in the phase’s `prd.json` / scan output)** where `passes=false`.

3. Use phase guardrails:
   - Use `PLAN/Phase-<N>/README.md` and referenced decision docs as scope constraints.

4. Then follow Milestone-mode steps 3–8.

## Learning notes
Prompts are editable; leave short learning notes in relevant prompt files when you discover better defaults.