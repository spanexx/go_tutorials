# Ralph Orchestrator + Worker Workflow (Plain English)

## Purpose

Ralph’s orchestration mode is a small “coordination system” that lets you run multiple worker processes in parallel.

- The **orchestrator** is the coordinator.
- Each **worker** is an independent execution unit.
- A small **shared state folder** (`.ralph/`) is used as the “source of truth” for who is doing what.

The goal is simple:

1. Load a list of tasks.
2. Allow workers to claim tasks one-at-a-time (without collisions).
3. Run the agent for each claimed task.
4. Collect findings/results.
5. Produce a final report.

## The Key Files and What They Mean

All runtime state lives under `.ralph/`:

- `.ralph/work-queue.json`
  - The task queue.
  - Tasks move through statuses like **pending → claimed → completed**.

- `.ralph/results.json`
  - Aggregated findings reported by workers.

- `.ralph/sessions/worker-<N>.session`
  - Per-worker “session state” (registered time, last heartbeat, iteration count, findings history).

- `.ralph/.lock`
  - A lock file used to prevent two workers from modifying the queue at the same time.

- `.ralph/worker-<N>.log`
  - Each worker’s stdout/stderr log.
  - This is usually the first place to look when something goes wrong.

Separately, the orchestrator creates:

- `.ralph/ORCHESTRATOR-REPORT.md`
  - A human-readable summary of what happened.

## Task Lifecycle

Each task is a JSON object with:

- `id`
  - A unique identifier.
- `type`
  - What kind of work it is (for example: analysis, refactor, optimization, feature).
- `data`
  - Extra task context (component name, priority, description, or anything else you want).
- `status`
  - The state of the task:
    - `pending`: ready to be claimed
    - `claimed`: assigned to a worker
    - `completed`: done and reported

A run generally follows this progression:

1. Tasks start as **pending**.
2. A worker claims one task and it becomes **claimed**.
3. When the worker finishes, it reports its findings and the task becomes **completed**.

## End-to-End Workflow (What Happens When You Run It)

### Step 1: Orchestrator boots

When you start the orchestrator, it:

- Ensures `.ralph/` exists.
- Ensures the queue and results files exist.
- Loads tasks from your tasks file.
- Appends those tasks to the queue as `pending`.

At this point, there is a shared pool of work that any worker can pick up.

### Step 2: Orchestrator spawns workers

The orchestrator starts `N` worker processes.

Each worker runs independently and writes logs to its own `.ralph/worker-<N>.log` file.

### Step 3: Each worker registers itself

When a worker starts, it creates its own session file under `.ralph/sessions/`.

This session file exists mainly for:

- Tracking that the worker is alive.
- Tracking iteration counts.
- Storing a history of findings.

### Step 4: Workers repeatedly try to claim work

Each worker loops:

- Reads the queue.
- If it sees a `pending` task, it attempts to claim it.

The claim is done in a “locked” manner:

- Only one worker is allowed to claim at a time.
- This prevents two workers from claiming the same task.

If there is no pending work, the worker sleeps briefly and checks again.

### Step 5: Worker executes the task with an agent

After successfully claiming a task, the worker:

- Looks up the task’s `type` and `data` in the queue.
- Builds an agent prompt that includes:
  - Task id
  - Task type
  - Task data

Then it runs the agent tool.

If the agent succeeds:

- The worker extracts a short summary (“findings”) from the output.
- The worker reports the result.

If the agent fails:

- The worker logs the failure.
- The task is not automatically “fixed” or retried by default.

### Step 6: Worker reports results and completes the task

When a worker reports a result:

- A short finding is appended to `.ralph/results.json`.
- The task’s status is updated to `completed` in `.ralph/work-queue.json`.
- The worker’s session file is updated (iteration + findings history).

### Step 7: Orchestrator monitors and generates a report

While workers run, the orchestrator periodically:

- Prints the queue status.
- Checks how many tasks are still `pending` or `claimed`.

When tasks are done (or timeout is reached), the orchestrator:

- Reads the results.
- Writes `.ralph/ORCHESTRATOR-REPORT.md`.

### Step 8: Orchestrator shuts workers down

Finally, the orchestrator terminates worker processes.

It also tries to shut them down gracefully first, and then force-kills if needed.

## What To Check When Things Go Wrong

- If workers never claim tasks:
  - Check `.ralph/work-queue.json` and confirm tasks exist and are `pending`.
  - Check if `.ralph/.lock` got stuck (a stale lock can block progress).

- If workers claim tasks but do not complete them:
  - Check `.ralph/worker-<N>.log` for agent execution errors.
  - Confirm your agent tool is installed and runnable from the shell.

- If results are empty:
  - Confirm workers are calling “report result” on success.
  - Check `.ralph/results.json` for updates.

## Practical Mental Model

Think of this like a tiny build system:

- The orchestrator sets up the “job list” and starts workers.
- Workers pull one job at a time, do it, and write back a short result.
- `.ralph/` is the shared truth that everyone reads/writes.

That’s it.
