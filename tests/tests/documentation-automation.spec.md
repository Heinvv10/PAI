# Documentation Automation System - Test Specifications

**PROTOCOL**: Doc-Driven TDD
**STATUS**: MANDATORY VALIDATION
**CREATED**: 2025-12-18

---

## Requirements Summary (PRD)

### 1. Documentation Structure
- PAI_CHANGELOG.md must exist with proper format
- PAI_OPERATIONS_LOG.md must exist with proper format
- PAI_DECISION_LOG.md must exist with proper format
- Each file must follow documented conventions

### 2. Helper Scripts
- add-pai-changelog.sh must create entries in <30 seconds
- add-pai-operation.sh must create entries in <30 seconds
- add-pai-decision.sh must create ADR entries in <30 seconds
- Scripts must validate input before writing
- Scripts must use proper templates

### 3. Git Hooks
- pre-commit hook must check for documentation updates
- commit-msg hook must enforce conventional commit format
- Hooks must provide helpful error messages
- Hooks must be non-blocking for docs-only commits

### 4. CI/CD Validation
- GitHub Actions workflow must validate documentation
- CI must check changelog format
- CI must verify operations log structure
- CI must validate decision log (ADR) format
- CI must comment on PRs with validation results

### 5. Performance Requirements
- Helper scripts: <30 seconds per entry
- Git hooks: <2 seconds validation time
- CI validation: <1 minute total pipeline

---

## Test Suite 1: Documentation Structure Validation

### Test 1.1: CHANGELOG Format Validation
```typescript
describe('PAI_CHANGELOG.md', () => {
  it('should exist in ~/.claude/ directory', () => {
    expect(fs.existsSync('~/.claude/PAI_CHANGELOG.md')).toBe(true);
  });

  it('should follow Keep a Changelog format', () => {
    const content = fs.readFileSync('~/.claude/PAI_CHANGELOG.md', 'utf-8');
    expect(content).toMatch(/## \[Unreleased\]/);
    expect(content).toMatch(/### Added/);
    expect(content).toMatch(/### Changed/);
  });

  it('should have valid version entries', () => {
    const content = fs.readFileSync('~/.claude/PAI_CHANGELOG.md', 'utf-8');
    const versionPattern = /## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/;
    expect(content).toMatch(versionPattern);
  });

  it('should not contain placeholder text', () => {
    const content = fs.readFileSync('~/.claude/PAI_CHANGELOG.md', 'utf-8');
    expect(content).not.toMatch(/TODO|PLACEHOLDER|FIXME/);
  });
});
```

**PASS CRITERIA**: All 4 tests pass, CHANGELOG format 100% compliant

---

### Test 1.2: OPERATIONS_LOG Format Validation
```typescript
describe('PAI_OPERATIONS_LOG.md', () => {
  it('should exist in ~/.claude/ directory', () => {
    expect(fs.existsSync('~/.claude/PAI_OPERATIONS_LOG.md')).toBe(true);
  });

  it('should have proper operation entry structure', () => {
    const content = fs.readFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'utf-8');
    expect(content).toMatch(/## \[\d{4}-\d{2}-\d{2}\]/); // Date header
    expect(content).toMatch(/\*\*Type\*\*:/); // Type field
    expect(content).toMatch(/\*\*Severity\*\*:/); // Severity field
  });

  it('should categorize operations correctly', () => {
    const content = fs.readFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'utf-8');
    const validTypes = ['Deployment', 'Migration', 'Configuration', 'Incident', 'Maintenance'];
    const hasValidType = validTypes.some(type => content.includes(`**Type**: ${type}`));
    expect(hasValidType).toBe(true);
  });

  it('should include severity levels', () => {
    const content = fs.readFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'utf-8');
    const validSeverity = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const hasValidSeverity = validSeverity.some(sev => content.includes(`**Severity**: ${sev}`));
    expect(hasValidSeverity).toBe(true);
  });
});
```

**PASS CRITERIA**: All 4 tests pass, operations log structure valid

---

### Test 1.3: DECISION_LOG Format Validation (ADR)
```typescript
describe('PAI_DECISION_LOG.md', () => {
  it('should exist in ~/.claude/ directory', () => {
    expect(fs.existsSync('~/.claude/PAI_DECISION_LOG.md')).toBe(true);
  });

  it('should follow ADR format', () => {
    const content = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');
    expect(content).toMatch(/# ADR-\d+:/); // ADR number
    expect(content).toMatch(/## Status/);
    expect(content).toMatch(/## Context/);
    expect(content).toMatch(/## Decision/);
    expect(content).toMatch(/## Consequences/);
  });

  it('should have sequential ADR numbers', () => {
    const content = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');
    const adrNumbers = [...content.matchAll(/# ADR-(\d+):/g)].map(m => parseInt(m[1]));
    const isSequential = adrNumbers.every((num, idx) =>
      idx === 0 || num === adrNumbers[idx - 1] + 1
    );
    expect(isSequential).toBe(true);
  });

  it('should have valid status values', () => {
    const content = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');
    const validStatuses = ['Proposed', 'Accepted', 'Deprecated', 'Superseded'];
    const statusPattern = new RegExp(`\\*\\*Status\\*\\*: (${validStatuses.join('|')})`);
    expect(content).toMatch(statusPattern);
  });
});
```

**PASS CRITERIA**: All 4 tests pass, ADR format 100% compliant

---

## Test Suite 2: Helper Scripts Validation

### Test 2.1: add-pai-changelog.sh Performance & Correctness
```bash
describe('add-pai-changelog.sh', () => {
  it('should complete in under 30 seconds', async () => {
    const start = Date.now();
    await exec('~/.claude/scripts/add-pai-changelog.sh', {
      input: 'Added\nNew feature test\n'
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  it('should create valid changelog entry', async () => {
    await exec('~/.claude/scripts/add-pai-changelog.sh', {
      input: 'Added\nTest feature\n'
    });
    const content = fs.readFileSync('~/.claude/PAI_CHANGELOG.md', 'utf-8');
    expect(content).toMatch(/### Added\n- Test feature/);
  });

  it('should validate category selection', async () => {
    const result = await exec('~/.claude/scripts/add-pai-changelog.sh', {
      input: 'InvalidCategory\n'
    });
    expect(result.stderr).toMatch(/Invalid category/);
  });

  it('should prevent empty descriptions', async () => {
    const result = await exec('~/.claude/scripts/add-pai-changelog.sh', {
      input: 'Added\n\n'
    });
    expect(result.stderr).toMatch(/Description cannot be empty/);
  });
});
```

**PASS CRITERIA**: Completes <30s, creates valid entries, validates input

---

### Test 2.2: add-pai-operation.sh Performance & Correctness
```bash
describe('add-pai-operation.sh', () => {
  it('should complete in under 30 seconds', async () => {
    const start = Date.now();
    await exec('~/.claude/scripts/add-pai-operation.sh', {
      input: 'MCP Server Update\nConfiguration\nMedium\nUpdated context7 config\n'
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  it('should create valid operations log entry', async () => {
    await exec('~/.claude/scripts/add-pai-operation.sh', {
      input: 'Test Operation\nMaintenance\nLow\nTest description\n'
    });
    const content = fs.readFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'utf-8');
    expect(content).toMatch(/\*\*Type\*\*: Maintenance/);
    expect(content).toMatch(/\*\*Severity\*\*: Low/);
  });

  it('should validate operation type', async () => {
    const result = await exec('~/.claude/scripts/add-pai-operation.sh', {
      input: 'Test\nInvalidType\n'
    });
    expect(result.stderr).toMatch(/Invalid operation type/);
  });

  it('should validate severity level', async () => {
    const result = await exec('~/.claude/scripts/add-pai-operation.sh', {
      input: 'Test\nDeployment\nInvalidSeverity\n'
    });
    expect(result.stderr).toMatch(/Invalid severity level/);
  });
});
```

**PASS CRITERIA**: Completes <30s, creates valid entries, validates input

---

### Test 2.3: add-pai-decision.sh Performance & Correctness (ADR)
```bash
describe('add-pai-decision.sh', () => {
  it('should complete in under 30 seconds', async () => {
    const start = Date.now();
    await exec('~/.claude/scripts/add-pai-decision.sh', {
      input: 'Use TypeScript for hooks\nContext...\nDecision...\nConsequences...\n'
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  it('should create sequential ADR numbers', async () => {
    const beforeContent = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');
    const lastADR = Math.max(...[...beforeContent.matchAll(/# ADR-(\d+):/g)].map(m => parseInt(m[1])));

    await exec('~/.claude/scripts/add-pai-decision.sh', {
      input: 'Test Decision\nTest context\nTest decision\nTest consequences\n'
    });

    const afterContent = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');
    expect(afterContent).toMatch(new RegExp(`# ADR-${lastADR + 1}:`));
  });

  it('should validate required sections', async () => {
    const result = await exec('~/.claude/scripts/add-pai-decision.sh', {
      input: 'Title\n\n\n\n' // Empty sections
    });
    expect(result.stderr).toMatch(/All sections are required/);
  });
});
```

**PASS CRITERIA**: Completes <30s, sequential ADRs, validates sections

---

## Test Suite 3: Git Hooks Validation

### Test 3.1: pre-commit Hook - Documentation Enforcement
```bash
describe('pre-commit hook', () => {
  it('should complete in under 2 seconds', async () => {
    const start = Date.now();
    await exec('git commit -m "feat: Test"');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should detect missing changelog updates for feature commits', async () => {
    // Make a code change without updating CHANGELOG
    fs.writeFileSync('test.ts', 'export const test = true;');
    await exec('git add test.ts');

    const result = await exec('git commit -m "feat: Add test feature"');
    expect(result.stdout).toMatch(/Consider updating PAI_CHANGELOG.md/);
  });

  it('should allow docs-only commits without changelog', async () => {
    fs.writeFileSync('README.md', 'Updated docs');
    await exec('git add README.md');

    const result = await exec('git commit -m "docs: Update README"');
    expect(result.exitCode).toBe(0);
  });

  it('should provide helpful error messages', async () => {
    const result = await exec('git commit -m "bad commit message"');
    expect(result.stderr).toMatch(/Commit message must follow conventional format/);
  });
});
```

**PASS CRITERIA**: Completes <2s, detects missing docs, helpful messages

---

### Test 3.2: commit-msg Hook - Format Enforcement
```bash
describe('commit-msg hook', () => {
  it('should enforce conventional commit format', async () => {
    const result = await exec('git commit -m "bad message"');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/must follow conventional commit format/);
  });

  it('should accept valid feat commits', async () => {
    const result = await exec('git commit -m "feat: Add new feature"');
    expect(result.exitCode).toBe(0);
  });

  it('should accept valid fix commits', async () => {
    const result = await exec('git commit -m "fix: Resolve bug"');
    expect(result.exitCode).toBe(0);
  });

  it('should accept valid docs commits', async () => {
    const result = await exec('git commit -m "docs: Update documentation"');
    expect(result.exitCode).toBe(0);
  });

  it('should reject commits with invalid types', async () => {
    const result = await exec('git commit -m "invalid: Bad type"');
    expect(result.exitCode).toBe(1);
  });
});
```

**PASS CRITERIA**: Enforces format 100%, accepts valid, rejects invalid

---

## Test Suite 4: CI/CD Validation

### Test 4.1: GitHub Actions - Documentation Validation
```yaml
describe('GitHub Actions Workflow', () => {
  it('should complete in under 1 minute', async () => {
    const start = Date.now();
    await triggerWorkflow('documentation-validation.yml');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(60000);
  });

  it('should validate CHANGELOG format', async () => {
    // Create invalid CHANGELOG
    fs.writeFileSync('~/.claude/PAI_CHANGELOG.md', 'Invalid format');
    await exec('git add PAI_CHANGELOG.md && git commit -m "test" && git push');

    const workflowResult = await waitForWorkflow();
    expect(workflowResult.status).toBe('failure');
    expect(workflowResult.logs).toMatch(/CHANGELOG format invalid/);
  });

  it('should validate OPERATIONS_LOG format', async () => {
    // Create invalid OPERATIONS_LOG
    fs.writeFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'Invalid format');
    await exec('git add PAI_OPERATIONS_LOG.md && git commit -m "test" && git push');

    const workflowResult = await waitForWorkflow();
    expect(workflowResult.status).toBe('failure');
    expect(workflowResult.logs).toMatch(/OPERATIONS_LOG format invalid/);
  });

  it('should validate DECISION_LOG (ADR) format', async () => {
    // Create invalid ADR
    fs.writeFileSync('~/.claude/PAI_DECISION_LOG.md', 'Invalid ADR');
    await exec('git add PAI_DECISION_LOG.md && git commit -m "test" && git push');

    const workflowResult = await waitForWorkflow();
    expect(workflowResult.status).toBe('failure');
    expect(workflowResult.logs).toMatch(/DECISION_LOG format invalid/);
  });

  it('should comment on PRs with validation results', async () => {
    const pr = await createPR();
    await waitForWorkflow();

    const comments = await getPRComments(pr.number);
    expect(comments).toContainEqual(expect.objectContaining({
      body: expect.stringMatching(/Documentation Validation/)
    }));
  });

  it('should pass with valid documentation', async () => {
    // Ensure all docs are valid
    await validateAllDocs();
    await exec('git push');

    const workflowResult = await waitForWorkflow();
    expect(workflowResult.status).toBe('success');
  });
});
```

**PASS CRITERIA**: Completes <1min, validates all docs, comments on PRs

---

## Test Suite 5: Integration & Performance

### Test 5.1: End-to-End Workflow
```bash
describe('Complete Documentation Workflow', () => {
  it('should complete full workflow in under 2 minutes', async () => {
    const start = Date.now();

    // 1. Create feature
    fs.writeFileSync('new-feature.ts', 'export const feature = true;');

    // 2. Use helper to update changelog (should be <30s)
    await exec('~/.claude/scripts/add-pai-changelog.sh', {
      input: 'Added\nNew feature\n'
    });

    // 3. Commit (git hooks validate <2s)
    await exec('git add . && git commit -m "feat: Add new feature"');

    // 4. Push (CI validates <1min)
    await exec('git push');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(120000); // 2 minutes total
  });

  it('should maintain documentation consistency', async () => {
    // Verify all three documentation files are in sync
    const changelog = fs.readFileSync('~/.claude/PAI_CHANGELOG.md', 'utf-8');
    const operations = fs.readFileSync('~/.claude/PAI_OPERATIONS_LOG.md', 'utf-8');
    const decisions = fs.readFileSync('~/.claude/PAI_DECISION_LOG.md', 'utf-8');

    expect(changelog).toBeTruthy();
    expect(operations).toBeTruthy();
    expect(decisions).toBeTruthy();
  });
});
```

**PASS CRITERIA**: Complete workflow <2min, maintains consistency

---

## Validation Benchmarks

### Coverage Requirements (Zero Tolerance)
| Component | Coverage Target | Status |
|-----------|----------------|--------|
| Documentation Structure | 100% | ⚪ UNTESTED |
| Helper Scripts | >95% | ⚪ UNTESTED |
| Git Hooks | >95% | ⚪ UNTESTED |
| CI/CD Validation | >90% | ⚪ UNTESTED |

### Performance Benchmarks
| Operation | Target | Status |
|-----------|--------|--------|
| Helper Scripts | <30s per entry | ⚪ UNTESTED |
| Git Hooks | <2s validation | ⚪ UNTESTED |
| CI Pipeline | <1min total | ⚪ UNTESTED |
| Full E2E Workflow | <2min complete | ⚪ UNTESTED |

### Quality Gates
| Gate | Requirement | Status |
|------|-------------|--------|
| Format Compliance | 100% | ⚪ UNTESTED |
| Input Validation | 100% | ⚪ UNTESTED |
| Error Messages | Clear & helpful | ⚪ UNTESTED |
| Zero Console.log | Enforced | ⚪ UNTESTED |

---

## Implementation Order (TDD)

1. ✅ **Write these test specifications** (CURRENT)
2. ⚪ Create test runners (Vitest + Bash test framework)
3. ⚪ Implement documentation structure (tests WILL FAIL)
4. ⚪ Implement helper scripts (tests WILL FAIL)
5. ⚪ Implement git hooks (tests WILL FAIL)
6. ⚪ Implement CI/CD layer (tests WILL FAIL)
7. ⚪ Iterate until ALL TESTS PASS
8. ⚪ Run performance benchmarks
9. ⚪ Validate against Zero Tolerance protocol

---

## Success Criteria

**BLOCKING REQUIREMENTS** (Doc-Driven TDD Protocol):
- [ ] All 5 test suites implemented
- [ ] All tests pass (0 failures)
- [ ] Coverage >95% for all components
- [ ] Performance benchmarks met
- [ ] Zero Tolerance gates passed
- [ ] Documentation maintained for 30 days without manual intervention

**VALIDATION**: System cannot be considered "complete" until ALL tests pass and benchmarks are met.

---

*Test specifications created per Doc-Driven TDD protocol (C:\Users\HeinvanVuuren\.claude\protocols\doc-driven-tdd.md)*
