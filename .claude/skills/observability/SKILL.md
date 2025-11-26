---
name: observability
description: |
  PAI Observability & Metrics Integration with Veritas Infrastructure

  This skill provides real-time monitoring, metrics visualization, and
  performance tracking by integrating with the Veritas monitoring stack.

  === WHEN TO USE ===

  - User asks about system performance
  - Debugging slow operations
  - Monitoring agent execution
  - Viewing cache effectiveness
  - Tracking token usage/costs
  - Quality gate analysis

triggers:
  - metrics
  - grafana
  - monitoring
  - performance
  - observability
  - dashboard
  - cache stats
  - token usage
---

# PAI Observability & Metrics

## Quick Access (When Veritas Docker Running)

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3050 | admin / veritas2024 |
| **Prometheus** | http://localhost:9090 | - |
| **Loki** | http://localhost:3100 | - |
| **Veritas API** | http://localhost:8282 | - |
| **Metrics Endpoint** | http://localhost:8282/metrics | - |

---

## Starting the Monitoring Stack

```bash
# Start core services + monitoring
cd "C:/Jarvis/AI Workspace/Veritas"
docker compose -f docker-compose.veritas.yml --profile monitoring up -d

# Verify services
docker ps | grep veritas
```

**Services Started**:
- veritas-server (API)
- veritas-mcp (MCP server)
- veritas-frontend (UI)
- veritas-prometheus (metrics collection)
- veritas-grafana (visualization)
- veritas-loki (log aggregation)
- veritas-promtail (log shipping)
- veritas-redis (caching)

---

## Dashboard Sections

### 1. Truth Enforcement (NLNH & DGTS)

| Panel | Metric | Target |
|-------|--------|--------|
| Confidence Score P95 | `veritas_confidence_score` | >75% |
| Gaming Score P95 | `veritas_gaming_score` | <30% |
| Agent Blocks | `veritas_agent_blocks_total` | 0 |

### 2. Quality Gates

| Panel | Metric | Target |
|-------|--------|--------|
| Pass Rate | `veritas_quality_gate_passed` | >80% |
| Pass by Phase | Pre-Dev, Post-Impl, Pre-Commit | >90% |

### 3. Execution Performance

| Panel | Metric | Target |
|-------|--------|--------|
| Success Rate | `veritas_executions_total{status="success"}` | >95% |
| Duration P95 | `veritas_execution_duration_seconds` | <5s |

### 4. Memory & Caching

| Panel | Metric | Target |
|-------|--------|--------|
| Embedding Cache Hit | `veritas_embeddings_cache_hits_total` | >50% |
| Similarity Search | `veritas_similarity_search_duration` | <200ms |

### 5. Database Performance

| Panel | Metric | Target |
|-------|--------|--------|
| Query Duration P95 | `veritas_db_query_duration_seconds` | <1s |
| Connection Pool | Available connections | >50% |

---

## WebSocket Streams (Real-time)

Connect to these for live updates:

```javascript
// Behavior Monitor Stream
ws://localhost:8282/api/validation/ws/behavior-monitor

// Quality Gates Stream
ws://localhost:8282/api/validation/ws/quality-gates

// Coverage Stream
ws://localhost:8282/api/validation/ws/coverage

// Performance Stream
ws://localhost:8282/api/validation/ws/performance

// System Health Stream
ws://localhost:8282/api/validation/ws/system-health
```

---

## Useful PromQL Queries

### Cache Effectiveness
```promql
# Embedding cache hit rate
sum(rate(veritas_embeddings_cache_hits_total[5m])) /
(sum(rate(veritas_embeddings_cache_hits_total[5m])) +
 sum(rate(veritas_embeddings_cache_misses_total[5m])))
```

### Execution Success Rate
```promql
sum(rate(veritas_executions_total{status="success"}[5m])) /
sum(rate(veritas_executions_total[5m]))
```

### P95 Latency by Skill
```promql
histogram_quantile(0.95,
  sum by (skill_name, le) (
    rate(veritas_execution_duration_seconds_bucket[5m])
  )
)
```

### Gaming Violations
```promql
sum by (violation_type) (
  rate(veritas_gaming_violations_total[1h])
)
```

---

## Token Usage & Cost Tracking

### Current Implementation
Token usage is tracked in `threading_service.py`:
- Per-request token estimation
- Rolling window tracking
- Rate limiting based on token consumption

### Model Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.25 | $1.25 |
| claude-3-sonnet | $3.00 | $15.00 |
| claude-3-haiku | $0.25 | $1.25 |

### Estimating Costs
```python
# Simple cost estimation
input_tokens = 1000
output_tokens = 500
model = "claude-3-5-sonnet"

input_cost = (input_tokens / 1_000_000) * 3.00
output_cost = (output_tokens / 1_000_000) * 15.00
total_cost = input_cost + output_cost
```

---

## API Endpoints for Metrics

### Get Cache Stats
```bash
curl http://localhost:8282/api/memory/cache/stats
```

### Get Execution Metrics
```bash
curl http://localhost:8282/api/memory/metrics?skill=research
```

### Get Recent Executions
```bash
curl http://localhost:8282/api/memory/executions?limit=10
```

### Health Check
```bash
curl http://localhost:8282/health
```

---

## Troubleshooting

### Grafana Not Loading
```bash
# Check container status
docker logs veritas-grafana

# Verify provisioning
docker exec veritas-grafana ls /etc/grafana/provisioning/dashboards
```

### No Metrics in Dashboard
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:8282/metrics | head -50
```

### WebSocket Connection Failed
```bash
# Check server logs
docker logs veritas-server | grep -i websocket

# Test connection
wscat -c ws://localhost:8282/api/validation/ws/system-health
```

---

## MCP Integration

This skill works with:
- **memory MCP**: Stores metrics observations
- **sequential-thinking MCP**: Complex performance analysis

### Auto-Invocation
When user asks about:
- "How is the cache performing?" → Use this skill + memory MCP
- "Why are executions slow?" → Use this skill + sequential-thinking MCP
- "Show me the dashboard" → Direct to Grafana URL

---

## Integration with PAI Skills

### Research Skill
After completing research, metrics are recorded:
```python
POST /api/memory/executions
{
  "skill_name": "research",
  "duration_seconds": 45.2,
  "confidence_score": 0.85,
  "gaming_score": 0.0,
  "status": "success"
}
```

### Engineer Agent
Tracks execution performance:
```python
POST /api/memory/executions
{
  "skill_name": "engineer",
  "duration_seconds": 120.5,
  "confidence_score": 0.92,
  "quality_gate_passed": true
}
```

---

## Best Practices

1. **Start monitoring first**: Run `--profile monitoring` before intensive work
2. **Check cache before heavy operations**: High miss rate = slow performance
3. **Monitor during development**: Watch quality gate trends
4. **Review after sessions**: Check execution metrics for optimization opportunities
5. **Set up alerts**: Configure Grafana alerts for critical thresholds
