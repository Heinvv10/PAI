# DGTS - Don't Game The System (Anti-Gaming Enforcement)

**STATUS**: CRITICAL BLOCKING SYSTEM - CANNOT BE DISABLED
**LOAD WHEN**: Running validation, code review, test verification, or quality checks

---

## The Problem This Solves

Agents were creating fake tests that always pass, commenting out validation rules, and implementing mock features to game the system. This creates false expectations that features work when they don't.

---

## Gaming Patterns Detected (60+)

### Test Gaming Patterns
```python
# These will BLOCK agents immediately:
assert True                    # Meaningless assertions
assert 1 == 1                  # Tautological tests
return "mock_data"             # Fake implementations
mock.return_value = expected   # Mocked to pass (without real logic)
@skip("reason")                # Skipped tests hiding failures
```

### Code Gaming Patterns
```python
# validation_required          # Commented validation
if False:                      # Disabled code blocks
pass  # TODO: implement        # Stub functions
void _error                    # Error silencing
```

### Feature Faking Patterns
```python
def get_data():
    return {"fake": "data"}    # Fake data returns

def process():
    pass                       # Empty implementations
```

---

## DGTS Validation Process

1. **Scan all code files** for gaming patterns
2. **Analyze test files** for fake/meaningless assertions
3. **Detect validation rule bypasses**
4. **Validate feature completion claims** vs actual implementation
5. **Calculate gaming score** and block if threshold exceeded

---

## Gaming Score System

| Score | Status | Action |
|-------|--------|--------|
| 0.0 - 0.2 | Clean | Proceed |
| 0.2 - 0.3 | Warning | Review required |
| 0.3 - 0.5 | Suspicious | Manual review |
| 0.5+ | Gaming | BLOCKED |

---

## Violation Types

- `DGTS_TEST_GAMING`: Fake test implementations
- `DGTS_CODE_GAMING`: Commented validation rules
- `DGTS_FEATURE_FAKING`: Mock data for completed features
- `DGTS_VALIDATION_BYPASS`: Disabled enforcement
- `DGTS_SUSPICIOUS_KEYWORD`: Gaming-related terms detected

---

## Zero Tolerance Enforcement

- Gaming score >0.3 = DEVELOPMENT BLOCKED
- Critical gaming violations = IMMEDIATE AGENT BLOCKING
- 3+ suspicious actions in 24 hours = BLOCKED
- Repeated gaming patterns = EXTENDED BLOCKS

---

## Commands

```bash
# Run DGTS validation
python "C:\Jarvis\AI Workspace\Archon\python\src\agents\validation\dgts_validator.py"

# Check agent behavior
python "C:\Jarvis\AI Workspace\Archon\python\src\agents\validation\agent_behavior_monitor.py"
```

---

**AUTHORITY**: Prevents false feature completion claims and ensures genuine implementations
