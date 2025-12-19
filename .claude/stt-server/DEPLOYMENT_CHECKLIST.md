# 📋 PAI STT Server - Deployment Checklist

Use this checklist to ensure successful deployment and operation of the global STT service.

---

## 🎯 Pre-Deployment Checklist

### System Requirements
- [ ] **Operating System**: Linux, macOS, or WSL2 (Windows)
- [ ] **Bun Runtime**: v1.0.0+ installed (`bun --version`)
- [ ] **Node.js**: v18+ (optional, for hook compatibility)
- [ ] **FFmpeg**: Latest version (optional but recommended)
- [ ] **Disk Space**: Minimum 100MB free
- [ ] **Network**: Internet access for API calls

### API Keys
- [ ] **Groq API Key**: Obtained from https://console.groq.com
- [ ] **API Key Format**: Starts with `gsk_` (validate format)
- [ ] **API Key Active**: Tested with curl/Postman
- [ ] **Rate Limits**: Understand Groq free tier limits
- [ ] **Backup Key**: Consider having a backup API key

### File Verification
- [ ] All core files present (run `./verify.sh`)
- [ ] Scripts are executable (`chmod +x *.sh`)
- [ ] Hooks directory exists (`~/.claude/hooks/stt/`)
- [ ] Logs directory created (`~/.claude/stt-server/logs/`)
- [ ] README.md reviewed

---

## 🚀 Deployment Steps

### Step 1: Environment Setup
- [ ] Copy `.env.example` to `~/.env`
- [ ] Add `GROQ_API_KEY` to `~/.env`
- [ ] Set `STT_PORT=8889` (or custom port)
- [ ] Set `STT_ENABLED=true`
- [ ] Verify environment variables loaded (`source ~/.env`)

### Step 2: Installation
- [ ] Run `./install.sh`
- [ ] Check for success messages
- [ ] Verify logs directory created
- [ ] Confirm scripts are executable
- [ ] Review any warnings/errors

### Step 3: Server Startup
- [ ] Run `./start.sh`
- [ ] Verify server started successfully
- [ ] Check process is running (`lsof -ti:8889`)
- [ ] Confirm port 8889 is listening
- [ ] Review startup logs

### Step 4: Health Check
- [ ] Run health check: `curl http://localhost:8889/health`
- [ ] Verify `status: "healthy"`
- [ ] Confirm `groq_api_configured: true`
- [ ] Check `tier2_groq: true`
- [ ] Validate response format

### Step 5: Functional Testing
- [ ] Test with sample audio file
- [ ] Verify transcription works
- [ ] Check cost logging
- [ ] Validate response format
- [ ] Confirm accuracy >90%

### Step 6: Hook Integration
- [ ] Verify hook file exists
- [ ] Check Claude Code settings for hook registration
- [ ] Test auto-transcription with audio attachment
- [ ] Confirm transcript appears in Claude Code
- [ ] Validate end-to-end workflow

---

## ✅ Post-Deployment Verification

### Operational Tests
- [ ] **Health Endpoint**: Returns healthy status
- [ ] **Transcription API**: Successfully transcribes audio
- [ ] **Cost Tracking**: Logs written to JSONL
- [ ] **Cost API**: Returns monthly summary
- [ ] **Auto-Transcription**: Hook triggers on file attach
- [ ] **Error Handling**: Graceful errors for invalid input

### Performance Tests
- [ ] **Speed**: 1-minute audio in <5 seconds
- [ ] **Accuracy**: >95% for clear audio
- [ ] **Confidence**: >0.9 for good quality
- [ ] **Latency**: API response <200ms (excluding transcription)
- [ ] **Memory**: Server uses <200MB RAM
- [ ] **CPU**: Server uses <10% CPU idle

### Cost Verification
- [ ] **Initial Cost**: $0.00 after setup
- [ ] **Per-Operation**: ~$0.00007 for 1-minute audio
- [ ] **Cost Log**: Entries are valid JSON
- [ ] **Monthly Estimate**: Projects to <$5/month at expected usage
- [ ] **Alert Threshold**: Set if approaching budget

### Security Checks
- [ ] **API Key**: Stored securely in `~/.env`
- [ ] **File Permissions**: `~/.env` is 600 (read/write user only)
- [ ] **CORS**: Localhost-only access
- [ ] **Temp Files**: Cleaned up after processing
- [ ] **Logs**: No sensitive data in logs
- [ ] **Network**: Server bound to localhost only

---

## 🔒 Security Hardening

### API Key Security
- [ ] Never commit `.env` to version control
- [ ] Add `.env` to `.gitignore`
- [ ] Use environment variable management (1Password, Vault)
- [ ] Rotate API keys periodically
- [ ] Monitor API usage for anomalies

### Server Security
- [ ] Server listens on localhost only (not 0.0.0.0)
- [ ] CORS restricted to localhost
- [ ] No authentication bypass
- [ ] Rate limiting considered (if public)
- [ ] Logs reviewed for security events

### File Security
- [ ] `~/.env` permissions: 600 (user read/write only)
- [ ] Temp audio files cleaned after processing
- [ ] Cost logs don't contain sensitive data
- [ ] Audio files not stored permanently (unless desired)

---

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Server is running (`lsof -ti:8889`)
- [ ] Health check passes
- [ ] Logs don't show errors
- [ ] Cost is tracking properly

### Weekly Checks
- [ ] Review cost logs for anomalies
- [ ] Check server logs for errors
- [ ] Verify accuracy hasn't degraded
- [ ] Test with new audio samples
- [ ] Review performance metrics

### Monthly Checks
- [ ] Calculate total monthly cost
- [ ] Review cost trends
- [ ] Update Groq API key if needed
- [ ] Check for Bun/dependency updates
- [ ] Review and archive old logs

### As-Needed Maintenance
- [ ] Restart server after system updates
- [ ] Update dependencies
- [ ] Rotate API keys
- [ ] Clean up old log files (>30 days)
- [ ] Review and optimize tier selection logic

---

## 🚨 Incident Response

### Server Down
1. [ ] Check if process is running (`lsof -ti:8889`)
2. [ ] Review logs: `tail -n 100 ~/.claude/stt-server/logs/stt-server.log`
3. [ ] Check for port conflicts
4. [ ] Verify Bun is installed
5. [ ] Restart server: `./stop.sh && ./start.sh`

### Transcription Failures
1. [ ] Verify API key is valid
2. [ ] Check Groq API status: https://status.groq.com
3. [ ] Test API key manually with curl
4. [ ] Review error messages in logs
5. [ ] Check audio file format is supported

### High Costs
1. [ ] Review cost logs: `cat ~/.claude/stt-server/logs/cost-log.jsonl`
2. [ ] Calculate cost per operation
3. [ ] Check for runaway processes
4. [ ] Verify tier selection is optimal
5. [ ] Consider implementing cost alerts

### Hook Not Triggering
1. [ ] Verify Claude Code settings have hook registered
2. [ ] Check server is running
3. [ ] Test audio file extension is supported
4. [ ] Review Claude Code output for errors
5. [ ] Verify hook file has correct permissions

---

## 📈 Scaling Considerations

### Current Limits
- [ ] Groq free tier: 30 requests/minute
- [ ] Audio file size: <25MB per file
- [ ] Concurrent requests: 1 per server instance
- [ ] Monthly budget: $600 (configurable)

### Scaling Options
- [ ] **Vertical**: Increase Groq API tier for higher rate limits
- [ ] **Horizontal**: Run multiple server instances (different ports)
- [ ] **Caching**: Cache frequent transcriptions (not implemented yet)
- [ ] **Batching**: Queue system for large volumes (future enhancement)
- [ ] **Load Balancing**: Distribute across multiple API keys (advanced)

---

## 🎓 Training & Documentation

### User Training
- [ ] Share QUICKSTART.md with users
- [ ] Demonstrate auto-transcription in Claude Code
- [ ] Explain supported audio formats
- [ ] Show cost tracking dashboard
- [ ] Provide troubleshooting guide

### Team Onboarding
- [ ] Review architecture documentation
- [ ] Explain tier selection logic
- [ ] Demonstrate cost optimization strategy
- [ ] Show how to add new tiers (Tier 1, Tier 3)
- [ ] Provide API endpoint examples

### Documentation Updates
- [ ] Keep README.md current
- [ ] Update TESTING_GUIDE.md as new tests added
- [ ] Maintain DEPLOYMENT_CHECKLIST.md
- [ ] Document any custom configurations
- [ ] Track known issues and workarounds

---

## 🔄 Rollback Plan

### If Issues Occur
1. [ ] Stop server: `./stop.sh`
2. [ ] Archive current logs
3. [ ] Review what changed (git diff)
4. [ ] Revert to previous working state
5. [ ] Test with previous configuration

### Backup Locations
- [ ] **Server Files**: `~/.claude/stt-server/` (keep backup)
- [ ] **Environment**: `~/.env` (backup before changes)
- [ ] **Logs**: `~/.claude/stt-server/logs/` (archive monthly)
- [ ] **Hooks**: `~/.claude/hooks/stt/` (version control)

---

## 📝 Success Criteria

### Deployment Success
- ✅ Server running and responding to health checks
- ✅ Groq API integrated and working
- ✅ Cost tracking logging correctly
- ✅ Auto-transcription hook functional
- ✅ All tests passing
- ✅ Documentation complete

### Operational Success (30 days)
- ✅ Uptime: >99.9%
- ✅ Accuracy: >95% for clear audio
- ✅ Speed: <5s for 1-minute audio
- ✅ Cost: <$5/month for expected usage
- ✅ Zero security incidents
- ✅ User satisfaction: >4.5/5

### Long-Term Success (90 days)
- ✅ Cost remains under budget
- ✅ No major incidents
- ✅ User adoption >80%
- ✅ Performance stable
- ✅ Ready for Tier 1 (local) enhancement

---

## 🎯 Next Phase Planning

### Phase 3: Local Processing (Tier 1)
- [ ] Research whisper.cpp integration
- [ ] Benchmark local vs cloud performance
- [ ] Implement tier 1 selection logic
- [ ] Test accuracy vs Groq
- [ ] Update documentation

### Phase 4: Real-Time Streaming (Tier 3)
- [ ] Evaluate Deepgram API
- [ ] Design streaming architecture
- [ ] Implement WebSocket support
- [ ] Test real-time transcription
- [ ] Update cost analysis

### Phase 5: Knowledge Integration
- [ ] Design transcript indexing pipeline
- [ ] Integrate with RAG engine
- [ ] Add to memory graph
- [ ] Enable semantic search on transcripts
- [ ] Create unified knowledge layer

### Phase 6: Advanced Features
- [ ] Speaker diarization
- [ ] Batch processing queue
- [ ] MCP server integration
- [ ] Custom model fine-tuning
- [ ] Voice command execution

---

## ✅ Final Sign-Off

**Deployment Completed By:** ___________________
**Date:** ___________________
**Version:** 1.0.0 (Phase 1-2)
**Environment:** Production / Staging / Dev

**Approvals:**
- [ ] Technical Lead: ___________________
- [ ] Operations: ___________________
- [ ] Security Review: ___________________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

---

**🎉 Congratulations on deploying the PAI Global STT Server!**

This checklist ensures a smooth deployment and ongoing operation of your cost-optimized, globally-available speech-to-text service.

**Support:** See `README.md`, `TESTING_GUIDE.md`, or `QUICKSTART.md` for assistance.
