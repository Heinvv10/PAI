---
name: boss-orchestrator
description: |
  Multi-agent orchestration system using Claude Agent SDK for autonomous task execution.
  Routes tasks to specialized workers (Email Drafter, Code Implementer, Researcher, etc.)
  that run as truly autonomous Claude agents with fresh context per task.

  USE WHEN user says 'orchestrate task', 'delegate to worker', 'draft email response',
  'autonomous worker', 'BOSS orchestrator', 'multi-agent', 'spawn worker'
---

# BOSS Multi-Agent Orchestrator

**Purpose:** Orchestrate autonomous Claude Agent SDK workers for specialized tasks like email drafting, code implementation, research, and content creation.

## Architecture

```
                    +---------------------------+
                    |    BOSS ORCHESTRATOR      |
                    |    (Central Dispatcher)    |
                    +-------------+-------------+
                                  |
          +----------+------------+------------+----------+
          |          |            |            |          |
          v          v            v            v          v
    +---------+ +---------+ +---------+ +---------+ +---------+
    | EMAIL   | | CODE    | | RESEARCH| | CONTENT | | DATA    |
    | DRAFTER | | IMPL    | | AGENT   | | WRITER  | | ANALYZER|
    +---------+ +---------+ +---------+ +---------+ +---------+
```

## Key Patterns (from Autonomous-Coding Demo)

1. **Fresh Context Per Task**: Each task gets a new `ClaudeSDKClient` (stateless)
2. **File-Based State**: `task_list.json` survives crashes (like `feature_list.json`)
3. **Security Hooks**: Bash commands validated via allowlist
4. **NLNH Validation**: No hallucinated facts in outputs

## Available Workers

### 1. Email Drafter Worker
**Trigger:** "draft email response", "respond to email", "email worker"
**Purpose:** Drafts professional email responses with NLNH validation
**Integration:** BOSS Exchange API (port 8000) for approval workflow

### 2. Code Implementer Worker (Planned)
**Trigger:** "implement feature", "code worker", "autonomous coding"
**Purpose:** Implements code features with verification

### 3. Researcher Worker (Planned)
**Trigger:** "research topic", "investigate", "research worker"
**Purpose:** Multi-source research (Perplexity/Claude/Gemini style)

### 4. Content Writer Worker (Planned)
**Trigger:** "write content", "create documentation", "content worker"
**Purpose:** Documentation and content creation

## Usage

### Dispatch Email Drafting Task
```python
from boss_orchestrator import BossOrchestrator

orchestrator = BossOrchestrator()
result = await orchestrator.dispatch_task({
    "type": "email_response",
    "source_data": {
        "email_id": "abc123",
        "from": "client@example.com",
        "subject": "Project Update",
        "body": "When will the project be complete?"
    }
})
```

### Check Task Status
```python
status = orchestrator.get_task_status("task_001")
```

## State Management

Tasks are tracked in `state/task_list.json`:
```json
{
  "tasks": [
    {
      "task_id": "email_001",
      "type": "email_response",
      "status": "pending|in_progress|completed",
      "assigned_worker": "email_drafter_001",
      "worker_output": {...},
      "validation_status": "passed|failed"
    }
  ]
}
```

## Validation Protocols

### NLNH (No Lies, No Hallucination)
- Workers cannot fabricate facts
- Must reference actual data from task context
- Low confidence triggers human review

### DGTS (Don't Game The System)
- Detects fake/mock responses
- Validates actual implementation vs shortcuts

## Workflows

- `workflows/dispatch-email.md` - Email drafting workflow
- `workflows/dispatch-code.md` - Code implementation workflow
- `workflows/check-status.md` - Task status checking

## Integration Points

- **BOSS Exchange API**: `http://72.61.197.178:8000` (email/approval)
- **Voice Server**: Port 8888 (completion announcements, disabled initially)
- **Redis**: Task queue pub/sub (optional)

## Files

```
boss-orchestrator/
├── SKILL.md                    # This file
├── orchestrator.py             # Main orchestrator logic
├── task_queue.py               # Task state management
├── workers/
│   ├── base/
│   │   ├── autonomous_worker.py
│   │   └── security.py
│   └── email_drafter/
│       ├── email_drafter_worker.py
│       └── email_prompt.md
├── state/
│   └── task_list.json
└── workflows/
    └── dispatch-email.md
```
