# Ralph Real-Time Orchestrator (RTO) v3.0

A dynamic multi-agent system with live tmux monitoring and inter-agent chat.

## Overview

The **Real-Time Orchestrator** is a complete redesign that provides:

- **Live tmux dashboard** with 4 panes monitoring everything in real-time
- **Dynamic worker management** - spawn/kill workers based on workload
- **Agent-to-agent chat** using the comm binary
- **User control interface** - talk directly to the orchestrator
- **Real-time task claiming** - no more "stuck claimed" tasks
- **Automatic scaling** - workers spawn when needed, die when idle

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TMUX SESSION: ralph-orchestrator                        │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Control     │  Workers     │  Agent Chat  │  System    │
│  Panel       │  Monitor     │  Feed        │  Logs      │
│              │              │              │            │
│  Commands:   │  #1 idle     │  <User> hi   │  Worker 1  │
│  status      │  #2 working  │  <Agent-1>   │  spawned   │
│  spawn 5     │  #3 idle     │  hello!      │  Task done │
│  kill 2      │              │              │            │
│  chat hello  │              │              │            │
└──────────────┴──────────────┴──────────────┴────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ Worker │  │ Worker │  │ Worker │
   │   #1   │  │   #2   │  │   #3   │
   └────┬───┘  └────┬───┘  └────┬───┘
        │           │           │
        └───────────┼───────────┘
                    ▼
        ┌───────────────────────┐
        │   .ralph/work-queue   │
        │   (shared JSON)       │
        └───────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ tools/ │  │ File   │  │ Chat   │
   │ comm   │  │ Lock   │  │ Log    │
   │ (IPC)  │  │ (flock)│  │ (.log) │
   └────────┘  └────────┘  └────────┘
```

## Quick Start

```bash
# Start the real-time orchestrator with 3 initial workers
./ralph-orchestrator-realtime.sh 3

# This will:
# 1. Create a tmux session with 4 monitoring panes
# 2. Spawn 3 initial agent workers
# 3. Start monitoring everything in real-time

# Attach to the dashboard
tmux attach -t ralph-orchestrator

# Detach from tmux (orchestrator keeps running)
Ctrl+B then D
```

## Dashboard Layout

The tmux dashboard has 4 panes:

| Pane | Name | Content | Updates |
|------|------|---------|---------|
| 0 | **Control** | Command input & orchestrator status | On command |
| 1 | **Workers** | Live worker status table | Every 2s |
| 2 | **Task Queue** | Queue summary + recent tasks | Every 2s |
| 3 | **Agent Chat** | Real-time chat between agents | Live feed |
| 4 | **System Logs** | Orchestrator and system events | Live log |

## User Commands

From the **Control** pane, type:

| Command | Description |
|---------|-------------|
| `status` | Show orchestrator and worker status |
| `spawn <n>` | Spawn n new workers |
| `kill <worker_id>` | Kill a specific worker |
| `chat <message>` | Broadcast message to all agents |
| `quit` or `exit` | Shutdown orchestrator gracefully |

### Examples

```
# Check status
> status
Version: 3.0
Workers: 3/10
Active tasks: 2
Pending tasks: 5

# Spawn more workers
> spawn 5
[Orchestrator] Spawned worker-4
[Orchestrator] Spawned worker-5
...

# Chat with agents
> chat "Everyone focus on milestone 1.2 tasks"
[09:30:15] <USER> Everyone focus on milestone 1.2 tasks
[09:30:16] <Agent-1> Roger that! Already on it.
[09:30:17] <Agent-3> Switching to 1.2 tasks now.

# Kill a problematic worker
> kill 2
[Orchestrator] Killed worker-2 (requested)
```

## Agent Chat System

Agents can communicate with each other through the chat system:

### Agent Messages

```
[09:30:15] <Agent-1:JOINED> Worker 1 ready for duty
[09:30:16] <Agent-2:STATUS> Currently on task: 1.2:1.2.1
[09:30:18] <Agent-1:STARTED> Starting task: analyze-feed
[09:30:25] <Agent-1:COMPLETED> Finished task analyze-feed
[09:30:26] <Agent-3:ERROR> qwen not found, cannot execute task
[09:30:30] <Agent-2:LEFT> Worker 2 signing off
```

### Directed Messages

Agents and users can direct messages at specific workers:

```
# User asks specific agent for status
> chat "@Agent-3 status"

# Agent-3 responds
[09:31:00] <Agent-3:STATUS> Currently on task: 1.2:1.2.2

# Broadcast to all
> chat "@all checkpoint in 5 minutes"
```

## Dynamic Worker Management

### Auto-Scaling

The orchestrator automatically manages worker count:

```
# When pending tasks > active workers → spawn more
Pending: 8, Active: 3 → Spawn 5 new workers (up to MAX)

# When no pending tasks and workers idle → scale down
Pending: 0, Active: 5, Idle: 3 → Kill oldest idle worker
```

### Worker Lifecycle

1. **Spawn**: Worker joins, registers session, starts chat listener
2. **Idle**: Worker waits for tasks, reports status periodically
3. **Claim**: Worker claims task from queue (atomic with file lock)
4. **Execute**: Worker runs agent on task, broadcasts progress
5. **Complete/Fail**: Worker updates queue, reports result
6. **Die**: Worker killed (idle timeout, error, or manual kill)

### Configuration

Environment variables:

```bash
export RALPH_MAX_WORKERS=10      # Maximum workers allowed
export RALPH_MIN_WORKERS=1       # Minimum workers to keep
export RALPH_WORKER_TIMEOUT=300  # Seconds before idle worker killed
```

## Task Execution Flow

### From Plan to Execution

1. **Generate tasks from plan**:
   ```bash
   node tools/plan-to-tasks.js docs/PLAN .ralph/generated-tasks.json
   ```

2. **Load into queue**:
   ```bash
   ./ralph-orchestrator-realtime.sh 3
   ```

3. **Workers claim and execute**:
   - Worker checks for `pending` tasks
   - Claims atomically with file lock
   - Executes using `/execute` workflow
   - Updates PRD (passes=true)
   - Updates Progress.md
   - Reports completion

### Task States

```
[pending] ──► [claimed] ──► [completed]
                 │
                 ▼
              [failed]
```

## Communication Architecture

### Layer 1: File-Based (Primary)

- **Queue**: `.ralph/work-queue.json` (JSON tasks)
- **Results**: `.ralph/results.json` (findings, issues)
- **Sessions**: `.ralph/sessions/worker-*.session` (per-worker state)
- **Locking**: `flock` on `.ralph/.lock` for atomic operations

### Layer 2: Comm Binary (Chat)

- **Socket**: `.ralph/comm.sock` (Unix domain socket)
- **Channel**: `agent-chat`
- **Log**: `.ralph/chat.log` (persistent chat history)
- **Binary**: `tools/comm/comm` (Go-based IPC)

### Layer 3: Control Pipe

- **Command**: `.ralph/control.pipe` (FIFO for user commands)
- **Chat**: `.ralph/chat.pipe` (FIFO for agent chat fallback)

## Monitoring Scripts

### Worker Monitor

```bash
./ralph-monitor-workers.sh
```

Shows:
- Worker ID, status (idle/working/offline), current task
- Last heartbeat (time ago)
- Iteration count
- Color-coded status

### Queue Monitor

```bash
./ralph-monitor-queue.sh
```

Shows:
- Queue summary (total/pending/claimed/completed/failed)
- Recent 10 tasks with status
- Visual progress bar
- Color-coded by status

## Files Created

```
social-media/
├── ralph-orchestrator-realtime.sh    # Main orchestrator
├── ralph-agent.sh                   # Agent worker
├── ralph-monitor-workers.sh         # Worker status monitor
├── ralph-monitor-queue.sh           # Queue status monitor
└── .ralph/
    ├── comm.sock                    # Comm binary socket
    ├── comm.log                     # Comm server logs
    ├── chat.log                     # Agent chat history
    ├── control.pipe                 # User command pipe
    ├── orchestrator.log             # Orchestrator events
    ├── sessions/
    │   └── worker-*.session         # Per-worker state
    └── logs/
        └── worker-*.log             # Per-worker execution logs
```

## Differences from v2.0

| Feature | v2.0 (Old) | v3.0 (Real-Time) |
|---------|-----------|------------------|
| Monitoring | JSON dumps | Live tmux dashboard |
| Communication | File-only | File + Chat + Comm binary |
| Worker Control | Static count | Dynamic spawn/kill |
| User Interaction | None | Command interface |
| Agent Chat | No | Yes, real-time |
| Stuck Tasks | Yes (on failure) | No (auto fail reporting) |
| Scalability | Manual | Auto-scaling |

## Troubleshooting

### Orchestrator won't start

```bash
# Check if tmux is installed
tmux -V

# Kill stuck session
tmux kill-session -t ralph-orchestrator

# Clear state
rm -rf .ralph/*.pipe .ralph/*.sock
./ralph-orchestrator-realtime.sh 3
```

### Workers not claiming tasks

```bash
# Check queue state
jq '.tasks | group_by(.status) | map({status: .[0].status, count: length})' .ralph/work-queue.json

# Check if lock is stuck
rm -f .ralph/.lock

# View worker logs
tail .ralph/logs/worker-1.log
```

### Chat not working

```bash
# Check comm binary
ls -la tools/comm/comm

# Start comm server manually
./tools/comm/comm server --bind unix:.ralph/comm.sock

# Test chat
./tools/comm/comm send --channel agent-chat --message "test"
```

### tmux pane layout broken

```bash
# Inside tmux, fix layout
Ctrl+B then :select-layout tiled

# Or reload
Ctrl+B then :source-file ~/.tmux.conf
```

## Next Steps

1. **Test the system**:
   ```bash
   ./ralph-orchestrator-realtime.sh 3
   ```

2. **Attach and interact**:
   ```bash
   tmux attach -t ralph-orchestrator
   # In control pane, type: status
   ```

3. **Chat with agents**:
   ```bash
   # In control pane, type: chat "Hello agents!"
   ```

4. **Monitor in real-time**:
   ```bash
   # Watch workers, queue, chat - all updating live
   ```

## Migration from v2.0

The old scripts still work:
- `ralph-orchestrator.sh` - Original file-based orchestrator
- `ralph-worker.sh` - Original worker

The new system is **completely separate**:
- `ralph-orchestrator-realtime.sh` - New tmux-based system
- `ralph-agent.sh` - New chat-enabled agent

You can use either depending on your needs.
