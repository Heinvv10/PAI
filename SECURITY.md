# Security Policy

## Sensitive Files Protection

This repository uses `.gitignore` to prevent accidental commits of sensitive data. The following file types are **NEVER** committed:

### 🔴 Critical - Never Commit

- **API Keys & Credentials**: `.env`, `credentials.json`, `*.key`, `*.pem`
- **SSH Keys**: `id_rsa`, `id_ed25519`, private keys
- **Cloud Provider Credentials**: `.aws/`, `.gcp/`, `.azure/`, cloud credential files
- **Database Credentials**: `database.json`, `db-config.json`, `*.db-credentials`
- **Session Data**: `sessions/`, `*.session`, session tokens
- **Personal Information**: `personal.json`, `contacts.json`, `*.private`

### ⚠️ Potentially Sensitive

- **Database Files**: `*.sqlite`, `*.db` (may contain personal data)
- **Logs**: `*.log` (may contain sensitive debug information)
- **Test Outputs**: Test artifacts that may contain real data
- **Transcripts**: Conversation logs that may contain sensitive context

## Environment Variables

### Setup

1. **Copy template**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your values**:
   ```bash
   # Edit .env with your actual credentials
   nano .env  # or your preferred editor
   ```

3. **Verify .env is ignored**:
   ```bash
   git status  # .env should NOT appear
   ```

### Required Variables

See `.env.example` for a complete list. Minimum required:

```bash
# Required for Claude Code
ANTHROPIC_API_KEY=your_api_key_here

# Required for GitHub MCP server
GITHUB_TOKEN=your_github_token_here
```

## Pre-Commit Security Checks

### Automatic Checks

The repository includes hooks that prevent commits containing:

1. **Hardcoded secrets** - API keys, tokens, passwords in code
2. **Credential files** - `.env`, `credentials.json`, etc.
3. **Large binary files** - Database dumps, SQLite files
4. **Private keys** - SSH keys, certificates

### Manual Verification

Before committing, verify:

```bash
# Check for exposed secrets
git diff --cached | grep -i "api_key\|password\|secret\|token"

# Verify .env is not staged
git status | grep ".env"

# Check file sizes
git diff --cached --stat
```

## Credential Management Best Practices

### 1. Use Environment Variables

❌ **Don't**:
```typescript
const apiKey = "sk-ant-api03-xxxxx";  // NEVER hardcode
```

✅ **Do**:
```typescript
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
```

### 2. Separate Secrets from Code

❌ **Don't**:
```json
// config.json
{
  "githubToken": "ghp_xxxxxxxxxxxx"
}
```

✅ **Do**:
```json
// config.json
{
  "githubTokenEnvVar": "GITHUB_TOKEN"
}
```

### 3. Use Template Files

Provide `.example` files for configuration:

```bash
# Create template
cp credentials.json credentials.json.example

# Remove real values from template
sed -i 's/"value": ".*"/"value": "your_value_here"/g' credentials.json.example

# Commit template only
git add credentials.json.example
```

### 4. Rotate Credentials Regularly

- **API Keys**: Rotate every 90 days
- **Personal Access Tokens**: Rotate every 60 days
- **SSH Keys**: Rotate yearly or when compromised
- **Session Tokens**: Short-lived (hours/days)

## Incident Response

### If Credentials Are Committed

1. **Immediately revoke** the exposed credential
2. **Remove from git history**:
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   bfg --delete-files credentials.json
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push (coordinate with team)
   git push --force
   ```
3. **Generate new credential**
4. **Update all services** using the old credential
5. **Document incident** in security log

### If .env Is Committed

```bash
# Remove .env from git
git rm --cached .env

# Remove from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push --force --all
```

## Reporting Security Issues

### Public Disclosure

For non-sensitive issues:
- Open a GitHub Issue
- Use `[SECURITY]` prefix in title

### Private Disclosure

For sensitive vulnerabilities:
- **Do NOT** open public issue
- Email: [your-security-email@example.com]
- Use PGP key: [link to PGP key if available]
- Include:
  - Description of vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if known)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Based on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

## Skill-Specific Security

### Agent Observability
- Database files contain conversation history
- Exclude: `*.sqlite`, `*.db`, `raw-outputs/*.jsonl`
- Keep only: `EXAMPLE.jsonl` (sanitized example)

### FFUF (Web Fuzzing)
- Results may contain sensitive URLs/endpoints
- Exclude: `results/`, `reports/`, `wordlists/*.txt`
- Keep only: `example.txt` (generic example)

### Research Skill
- May download sensitive documents
- Exclude: `outputs/`, `results/`, cached data
- Clear cache regularly

### Fabric
- Config contains API keys and model settings
- Exclude: `config.yaml`, `.env`
- Use: `config.yaml.example` template

## Compliance

### Data Protection

- **GDPR**: Don't commit personal data (names, emails, IPs)
- **CCPA**: Respect user privacy, allow data deletion
- **HIPAA**: Never commit health information
- **PCI DSS**: Never commit payment card data

### License Compliance

- Respect third-party licenses
- Document dependencies in LICENSE
- Attribute properly in README

## Security Checklist

Before every commit:

- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] `.env` is not staged
- [ ] No credential files committed
- [ ] No personal information in code/comments
- [ ] No large binary files (databases, dumps)
- [ ] Code reviewed for injection vulnerabilities
- [ ] Dependencies updated (no known CVEs)
- [ ] Proper input validation on user inputs
- [ ] Error messages don't expose sensitive info

## Tools & Resources

### Security Scanning

```bash
# Check for secrets in commits
git-secrets --scan

# GitHub secret scanning (automatic on push)
# Will alert if secrets detected

# Local pre-commit hook
# See .git/hooks/pre-commit
```

### Recommended Tools

- **git-secrets**: Prevent secrets from being committed
- **BFG Repo-Cleaner**: Remove sensitive data from history
- **GitHub Secret Scanning**: Automatic credential detection
- **Dependabot**: Automated dependency updates
- **Snyk**: Vulnerability scanning for dependencies

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Anthropic Security Guidelines](https://docs.anthropic.com/security)

## Version History

- **v1.0** (2026-01-05): Initial security policy
  - Added .gitignore with sensitive file patterns
  - Created .env.example template
  - Documented credential management best practices

---

**Last Updated**: 2026-01-05
**Maintainer**: [@Heinvv10](https://github.com/Heinvv10)
**Contact**: [Security email/contact method]
