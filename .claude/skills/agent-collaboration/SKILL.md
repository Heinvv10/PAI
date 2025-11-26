---
name: agent-collaboration
description: |
  Multi-Agent Collaboration Patterns for PAI

  Defines patterns for coordinating multiple specialized agents to solve
  complex problems. Enables parallel execution, result synthesis, and
  handoff protocols between agents.

  === COLLABORATION PATTERNS ===

  1. **Parallel Research**: Multiple researchers investigate different angles
  2. **Pipeline**: Sequential handoff (architect → engineer → reviewer)
  3. **Consensus**: Multiple agents vote on decisions
  4. **Specialist Routing**: Route subtasks to domain experts
  5. **Supervisor**: One agent coordinates others

  === WHEN TO USE ===

  - Complex tasks requiring multiple expertise areas
  - Research needing multiple perspectives
  - Code changes needing review cycles
  - Architecture decisions needing validation

triggers:
  - agent collaboration
  - multi-agent
  - coordinate agents
  - parallel agents
  - agent handoff
  - agent pipeline
---

# Multi-Agent Collaboration System

## Available Agent Types

| Agent | Expertise | Model Tier |
|-------|-----------|------------|
| `researcher` | Web research, information gathering | Standard |
| `claude-researcher` | Deep analysis with Claude | Standard |
| `gemini-researcher` | Multi-perspective research | Standard |
| `perplexity-researcher` | Real-time web search | Standard |
| `engineer` | Code implementation | Standard |
| `architect` | System design | Advanced |
| `designer` | UX/UI design | Standard |
| `pentester` | Security testing | Standard |
| `Explore` | Codebase exploration | Fast |
| `Plan` | Task planning | Standard |

---

## Pattern 1: Parallel Research

**Use when**: Need multiple perspectives on a topic

### Configuration

```yaml
pattern: parallel_research
agents:
  - type: perplexity-researcher
    focus: "Current state and trends"
  - type: claude-researcher
    focus: "Deep technical analysis"
  - type: gemini-researcher
    focus: "Alternative approaches"

synthesis:
  method: merge_and_dedupe
  output: consolidated_report
```

### Implementation

```markdown
Launch 3 research agents in parallel:

1. Task(perplexity-researcher): "Research current best practices for [topic]"
2. Task(claude-researcher): "Analyze technical implications of [topic]"
3. Task(gemini-researcher): "Find alternative approaches to [topic]"

After all complete:
- Synthesize findings
- Identify common themes
- Note contradictions
- Provide recommendations
```

### Example

User: "Research AI agent architectures"

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Perplexity    │   │     Claude      │   │     Gemini      │
│   Researcher    │   │   Researcher    │   │   Researcher    │
│                 │   │                 │   │                 │
│ "2025 trends"   │   │ "Technical      │   │ "Alternative    │
│                 │   │  deep dive"     │   │  approaches"    │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └──────────────┬──────┴──────────────┬──────┘
                        │                     │
                        ▼                     ▼
              ┌─────────────────────────────────────┐
              │         Synthesis Agent             │
              │   Merge, dedupe, consolidate        │
              └─────────────────────────────────────┘
```

---

## Pattern 2: Pipeline (Sequential Handoff)

**Use when**: Tasks need to flow through stages

### Configuration

```yaml
pattern: pipeline
stages:
  - agent: architect
    input: requirements
    output: design_doc

  - agent: engineer
    input: design_doc
    output: implementation

  - agent: pentester
    input: implementation
    output: security_report

  - agent: engineer
    input: security_report
    output: fixed_implementation
```

### Implementation

```markdown
Execute pipeline sequentially:

Stage 1 - Architecture:
  Task(architect): "Design system for [requirements]"
  → Produces: Architecture document

Stage 2 - Implementation:
  Task(engineer): "Implement based on [architecture document]"
  → Produces: Code implementation

Stage 3 - Security Review:
  Task(pentester): "Security audit [implementation]"
  → Produces: Vulnerability report

Stage 4 - Remediation:
  Task(engineer): "Fix vulnerabilities from [security report]"
  → Produces: Secure implementation
```

### Handoff Protocol

Each stage passes:
```yaml
handoff:
  context: Summary of work done
  artifacts: Files created/modified
  decisions: Key choices made
  open_questions: Unresolved items
  next_steps: Recommended actions
```

---

## Pattern 3: Consensus Decision

**Use when**: Critical decisions need validation

### Configuration

```yaml
pattern: consensus
decision: "Which database to use?"
voters:
  - agent: architect
    weight: 2
  - agent: engineer
    weight: 1
  - agent: pentester
    weight: 1

threshold: 0.7  # 70% weighted agreement needed
```

### Implementation

```markdown
Decision: "[Critical choice to make]"

Query each agent:
1. Task(architect): "Evaluate options for [decision]. Recommend one with rationale."
2. Task(engineer): "From implementation perspective, which option for [decision]?"
3. Task(pentester): "Security implications of each option for [decision]?"

Tally results:
- Option A: architect(2) + engineer(1) = 3 votes
- Option B: pentester(1) = 1 vote

Result: Option A wins with 75% weighted agreement
```

---

## Pattern 4: Specialist Routing

**Use when**: Complex task has distinct subtasks

### Configuration

```yaml
pattern: specialist_routing
router: main_agent
specialists:
  frontend:
    agent: designer
    triggers: ["UI", "UX", "component", "styling"]
  backend:
    agent: engineer
    triggers: ["API", "database", "server", "endpoint"]
  security:
    agent: pentester
    triggers: ["auth", "encryption", "vulnerability", "OWASP"]
  infrastructure:
    agent: architect
    triggers: ["scaling", "deployment", "architecture", "system design"]
```

### Implementation

```markdown
Task: "Build a user authentication system"

Router Analysis:
- "user authentication" → security (pentester)
- "system" → infrastructure (architect)
- "build" → backend (engineer)

Specialist Assignments:
1. Task(pentester): "Define security requirements for auth system"
2. Task(architect): "Design auth system architecture"
3. Task(engineer): "Implement auth system per security + architecture specs"

Coordination:
- Security requirements inform architecture
- Architecture informs implementation
- Implementation reviewed by security
```

---

## Pattern 5: Supervisor Orchestration

**Use when**: Complex multi-step project needs coordination

### Configuration

```yaml
pattern: supervisor
supervisor:
  agent: architect
  responsibilities:
    - task_decomposition
    - agent_assignment
    - progress_tracking
    - conflict_resolution

workers:
  - agent: engineer
    capacity: 3  # Can handle 3 parallel subtasks
  - agent: researcher
    capacity: 5
  - agent: designer
    capacity: 2
```

### Implementation

```markdown
Supervisor (Architect) receives: "Build complete e-commerce platform"

Step 1 - Decomposition:
  Supervisor breaks into:
  - Research: Market analysis, competitor features
  - Design: UI/UX, user flows
  - Backend: API, database, payment integration
  - Frontend: React components, state management
  - Security: Auth, payment security, data protection

Step 2 - Assignment:
  Supervisor assigns:
  - researcher → Market analysis (parallel)
  - designer → UI/UX design (parallel)
  - engineer → Backend API (sequential after design)
  - pentester → Security review (after implementation)

Step 3 - Coordination:
  Supervisor monitors progress:
  - Resolves blockers
  - Handles dependencies
  - Synthesizes results

Step 4 - Delivery:
  Supervisor compiles:
  - Final implementation
  - Documentation
  - Test results
  - Deployment instructions
```

---

## Handoff Message Format

When one agent hands off to another:

```markdown
## Agent Handoff

### From: [Source Agent]
### To: [Target Agent]
### Task: [What needs to be done]

### Context
[Summary of work completed so far]

### Artifacts
- [File 1]: [Description]
- [File 2]: [Description]

### Decisions Made
1. [Decision 1]: [Rationale]
2. [Decision 2]: [Rationale]

### Open Questions
- [ ] [Question 1]
- [ ] [Question 2]

### Constraints
- [Constraint 1]
- [Constraint 2]

### Expected Output
[What the target agent should produce]
```

---

## Conflict Resolution

When agents disagree:

### Strategy 1: Weighted Vote
Higher expertise agent wins

### Strategy 2: Supervisor Decision
Escalate to supervisor agent

### Strategy 3: User Decision
Present options to user

### Strategy 4: Evidence-Based
Agent with more evidence wins

---

## Integration with Veritas

When Docker running, collaboration metrics tracked:

```promql
# Agent collaboration success rate
sum(rate(veritas_agent_collaboration_success[1h])) /
sum(rate(veritas_agent_collaboration_total[1h]))

# Handoff latency
histogram_quantile(0.95, rate(veritas_handoff_duration_seconds_bucket[5m]))

# Consensus achievement rate
sum(rate(veritas_consensus_achieved[1h])) /
sum(rate(veritas_consensus_attempts[1h]))
```

---

## Best Practices

1. **Clear task boundaries**: Each agent should have defined scope
2. **Explicit handoffs**: Use structured handoff format
3. **Parallel when possible**: Independent tasks run simultaneously
4. **Sequential when dependent**: Wait for dependencies
5. **Document decisions**: Capture rationale for future reference
6. **Monitor progress**: Track agent completion status
7. **Handle failures**: Retry or escalate gracefully
8. **Synthesize results**: Combine outputs meaningfully

---

## Example: Full Research Project

```markdown
User: "Research and design a real-time collaboration feature"

Collaboration Plan:
├── Phase 1: Research (Parallel)
│   ├── perplexity-researcher: "Real-time collab tech landscape"
│   ├── claude-researcher: "WebSocket vs WebRTC analysis"
│   └── gemini-researcher: "Competitor feature analysis"
│
├── Phase 2: Synthesis
│   └── Main agent: Consolidate research findings
│
├── Phase 3: Design (Sequential)
│   ├── architect: "System architecture for real-time collab"
│   └── designer: "UI/UX for collaboration features"
│
├── Phase 4: Security Review
│   └── pentester: "Security audit of proposed design"
│
└── Phase 5: Final Deliverable
    └── Main agent: Compile PRD with all inputs

Estimated time: ~10 minutes
Agents used: 6
Parallelization: 50%
```
