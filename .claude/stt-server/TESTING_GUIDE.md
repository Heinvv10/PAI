# STT Server Testing Guide

## 🎯 Testing Objectives

Verify that the PAI Global STT Server:
1. Starts successfully and responds to health checks
2. Transcribes audio files accurately via API
3. Auto-transcribes audio files when attached in Claude Code
4. Logs costs correctly
5. Selects appropriate tiers based on audio duration
6. Handles errors gracefully

---

## 📋 Prerequisites

### Required
- [x] Bun runtime installed (`bun --version`)
- [x] GROQ_API_KEY configured in `~/.env`
- [x] STT server files in `~/.claude/stt-server/`
- [x] Hook file at `~/.claude/hooks/stt/on_file_attach.ts`

### Optional (for full testing)
- [ ] FFmpeg installed (`ffmpeg -version`)
- [ ] Sample audio files in various formats
- [ ] Claude Code session active

---

## 🚀 Test Sequence

### Test 1: Installation Check

```bash
cd ~/.claude/stt-server

# Run installation script
./install.sh

# Expected output:
# ✅ Bun installed
# ✅ Created logs directory
# ✅ Made scripts executable
# ⚠️  GROQ_API_KEY not configured (or ✅ configured)
```

**Pass Criteria:**
- Scripts are executable
- Logs directory created
- Installation completes without errors

---

### Test 2: Environment Configuration

```bash
# Check if ~/.env exists
ls -la ~/.env

# Verify GROQ_API_KEY is set
grep GROQ_API_KEY ~/.env

# Expected output:
# GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
```

**Pass Criteria:**
- `~/.env` file exists
- `GROQ_API_KEY` is present and not placeholder value

**If Missing:**
```bash
# Copy template
cp ~/.claude/stt-server/../.env.example ~/.env

# Edit and add your API key
# Get free key from: https://console.groq.com
nano ~/.env  # or vim, code, etc.
```

---

### Test 3: Server Startup

```bash
cd ~/.claude/stt-server

# Start server
./start.sh

# Expected output:
# 🚀 Starting server on port 8889...
# ✅ PAI STT Server started successfully
#    Port: 8889
#    Logs: /home/user/.claude/stt-server/logs/stt-server.log
#    Health: curl http://localhost:8889/health

# Check if running
lsof -ti:8889  # Should return a PID
```

**Pass Criteria:**
- Server starts without errors
- Process is running on port 8889
- Log file is created

**View Logs:**
```bash
tail -f ~/.claude/stt-server/logs/stt-server.log
```

**If Fails:**
- Check if port 8889 is already in use
- Verify Bun is installed
- Check logs for errors

---

### Test 4: Health Check API

```bash
# Test health endpoint
curl http://localhost:8889/health

# Expected output:
# {
#   "status": "healthy",
#   "port": 8889,
#   "tiers_available": {
#     "tier1_local": false,
#     "tier2_groq": true,
#     "tier3_deepgram": false
#   },
#   "groq_api_configured": true,
#   "deepgram_api_configured": false
# }
```

**Pass Criteria:**
- Status is "healthy"
- Port is 8889
- `tier2_groq` is true
- `groq_api_configured` is true

---

### Test 5: Transcription API (Manual)

**Option A: Using Sample Text-to-Speech Audio**

If you have a TTS service, generate a short test audio:
```bash
# Example: Generate test audio using system TTS
say "Hello, this is a test of the speech to text system." -o test-audio.aiff

# Convert to MP3 (if ffmpeg installed)
ffmpeg -i test-audio.aiff -acodec libmp3lame test-audio.mp3
```

**Option B: Download Sample Audio**

```bash
# Download a free sample (if curl/wget available)
curl -o test-sample.mp3 "https://www2.cs.uic.edu/~i101/SoundFiles/taunt.wav"
```

**Option C: Record Your Own**

Use your system's audio recorder to create a short MP3/WAV file.

**Test Transcription:**

```bash
# Transcribe the audio file
curl -X POST http://localhost:8889/transcribe \
  --data-binary @test-audio.mp3 \
  -H "X-Filename: test-audio.mp3"

# Expected output:
# {
#   "status": "success",
#   "transcript": "Hello, this is a test of the speech to text system.",
#   "confidence": 0.95,
#   "duration": 3.5,
#   "language": "en",
#   "cost": 0.00004,
#   "tier_used": 2,
#   "tier_reason": "Short audio (3.5s), using Groq Whisper Turbo"
# }
```

**Pass Criteria:**
- Status is "success"
- Transcript matches audio content (reasonably accurate)
- Confidence > 0.8
- Cost is logged
- Tier 2 (Groq) was used

---

### Test 6: Cost Tracking

```bash
# Check cost logs
cat ~/.claude/stt-server/logs/cost-log.jsonl

# Expected format (each line is a JSON object):
# {"tier":2,"duration":3.5,"cost":0.00004,"provider":"groq","model":"whisper-large-v3-turbo","filename":"test-audio.mp3","timestamp":"2025-01-19T10:30:00.000Z"}
```

**Test Cost API:**
```bash
# Get monthly cost summary
curl "http://localhost:8889/cost?period=month"

# Expected output:
# {
#   "period": "month",
#   "total_cost": 0.00004,
#   "total_hours": 0.00097,
#   "tier_breakdown": {
#     "tier1": {"hours": 0, "cost": 0},
#     "tier2": {"hours": 0.00097, "cost": 0.00004},
#     "tier3": {"hours": 0, "cost": 0}
#   }
# }
```

**Pass Criteria:**
- Cost log file exists
- Entries are valid JSON
- Cost API returns correct totals
- Tier breakdown is accurate

---

### Test 7: Auto-Transcription Hook (Claude Code)

**Prerequisites:**
- Claude Code session active
- STT server running
- Hook registered in Claude Code settings

**Test Steps:**

1. **Verify Hook Registration:**

   Check `~/.claude/settings.json` for hook configuration:
   ```json
   {
     "hooks": {
       "onFileAttach": "~/.claude/hooks/stt/on_file_attach.ts"
     }
   }
   ```

2. **Test in Claude Code:**

   - Start Claude Code in any project
   - Attach an audio file (drag & drop .mp3, .wav, .m4a, etc.)
   - Observe output

   **Expected Output:**
   ```
   🎙️ Audio file detected: test-audio.mp3
   📤 Sending to STT server for transcription...

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎙️ AUDIO TRANSCRIPTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📄 File: test-audio.mp3
   ⏱️  Duration: 3.5s
   🌍 Language: en
   💰 Cost: $0.0000
   🎯 Tier: 2 (Short audio, using Groq Whisper Turbo)
   📊 Confidence: 95.0%

   📝 Transcript:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Hello, this is a test of the speech to text system.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

**Pass Criteria:**
- Hook detects audio file
- Transcript is displayed automatically
- No errors in output
- Claude can read and process the transcript

**If Hook Doesn't Trigger:**
- Verify hook is registered in settings
- Check STT server is running (`curl http://localhost:8889/health`)
- Look for errors in Claude Code output
- Verify audio file has supported extension

---

### Test 8: Multiple Audio Formats

Test various audio formats to ensure compatibility:

```bash
# Test different formats
formats=("mp3" "wav" "m4a" "ogg" "flac")

for format in "${formats[@]}"; do
  echo "Testing .$format format..."
  curl -X POST http://localhost:8889/transcribe \
    --data-binary @test-audio.$format \
    -H "X-Filename: test-audio.$format"
  echo ""
done
```

**Pass Criteria:**
- All common formats are accepted
- Transcription succeeds for each format
- Errors are informative if format unsupported

---

### Test 9: Tier Selection Logic

Test that cascade selects appropriate tiers:

**Short Audio (<5 min):**
```bash
# Create 30-second audio
# Expected: Tier 1 (local) if available, else Tier 2 (Groq)

curl -X POST http://localhost:8889/transcribe \
  --data-binary @short-30s.mp3 \
  -H "X-Filename: short-30s.mp3"

# Check tier_used in response
# Should be tier 2 (since tier 1 not implemented yet)
# tier_reason: "Short audio (<5 min), using Groq Whisper Turbo"
```

**Medium Audio (5-60 min):**
```bash
# Use 10-minute audio
# Expected: Tier 2 (Groq)

curl -X POST http://localhost:8889/transcribe \
  --data-binary @medium-10m.mp3 \
  -H "X-Filename: medium-10m.mp3"

# tier_used: 2
# tier_reason: "Medium audio (10.0 min), using Groq Whisper Turbo"
```

**Pass Criteria:**
- Tier selection is logged in response
- Reason is provided
- Tier matches audio duration rules

---

### Test 10: Error Handling

Test various error conditions:

**Invalid API Key:**
```bash
# Temporarily break API key
export GROQ_API_KEY="invalid_key"
./stop.sh && ./start.sh

curl -X POST http://localhost:8889/transcribe \
  --data-binary @test-audio.mp3 \
  -H "X-Filename: test-audio.mp3"

# Expected: Error message about invalid API key
```

**Missing Audio File:**
```bash
curl -X POST http://localhost:8889/transcribe \
  --data-binary @nonexistent.mp3 \
  -H "X-Filename: nonexistent.mp3"

# Expected: Error about file not found
```

**Server Not Running:**
```bash
./stop.sh

curl http://localhost:8889/health

# Expected: Connection refused error
```

**Pass Criteria:**
- Errors are informative and actionable
- Server doesn't crash
- Logs capture error details

---

### Test 11: Performance & Accuracy

**Speed Test:**
```bash
# Time transcription of 1-minute audio
time curl -X POST http://localhost:8889/transcribe \
  --data-binary @1min-audio.mp3 \
  -H "X-Filename: 1min-audio.mp3"

# Expected: <5 seconds total (Groq is 216x real-time)
```

**Accuracy Test:**
- Use audio with known transcript
- Compare transcription output
- Calculate Word Error Rate (WER)

**Expected Performance:**
- **Speed**: 216x real-time (1 min audio in ~0.3s)
- **Accuracy**: >95% for clear audio
- **Confidence**: >0.9 for good quality audio

---

## 🛠️ Troubleshooting

### Server Won't Start

**Check Bun:**
```bash
bun --version
```
If not installed: `curl -fsSL https://bun.sh/install | bash`

**Check Port:**
```bash
lsof -ti:8889
# If occupied: ./stop.sh
```

**Check Logs:**
```bash
tail -f ~/.claude/stt-server/logs/stt-server.log
```

---

### No Transcription Output

**Verify API Key:**
```bash
grep GROQ_API_KEY ~/.env
```

**Test API Key:**
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

**Check Server Health:**
```bash
curl http://localhost:8889/health
# Verify groq_api_configured: true
```

---

### Hook Not Triggering

**Check Hook Registration:**
```bash
cat ~/.claude/settings.json | grep -A 5 hooks
```

**Verify Server Running:**
```bash
curl http://localhost:8889/health
```

**Check File Extension:**
- Supported: .mp3, .wav, .m4a, .ogg, .flac, .webm, .aac, .opus
- Hook only triggers for audio files

---

## ✅ Test Checklist

Use this checklist to track testing progress:

- [ ] **Test 1**: Installation Check
- [ ] **Test 2**: Environment Configuration
- [ ] **Test 3**: Server Startup
- [ ] **Test 4**: Health Check API
- [ ] **Test 5**: Transcription API (Manual)
- [ ] **Test 6**: Cost Tracking
- [ ] **Test 7**: Auto-Transcription Hook
- [ ] **Test 8**: Multiple Audio Formats
- [ ] **Test 9**: Tier Selection Logic
- [ ] **Test 10**: Error Handling
- [ ] **Test 11**: Performance & Accuracy

---

## 📊 Test Report Template

```markdown
# STT Server Test Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** [OS, Bun version, etc.]

## Summary
- Tests Passed: X/11
- Tests Failed: X/11
- Critical Issues: [List any blockers]

## Test Results

### Test 1: Installation
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Test 2: Environment Configuration
- Status: ✅ PASS / ❌ FAIL
- GROQ_API_KEY configured: ✅ Yes / ❌ No

[... Continue for all tests ...]

## Performance Metrics
- Average transcription time: X.Xs for 1-minute audio
- Accuracy: X% (if measured)
- Cost per operation: $X.XX

## Issues Found
1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce: [...]
   - Workaround: [if any]

## Recommendations
- [Any suggestions for improvements]
```

---

## 🎯 Success Criteria

**Minimum Viable Product (MVP):**
- ✅ Server starts and responds to health checks
- ✅ Manual transcription via API works
- ✅ Cost tracking logs correctly
- ✅ Basic error handling functional

**Full Feature Set:**
- ✅ Auto-transcription hook works in Claude Code
- ✅ Multiple audio formats supported
- ✅ Tier selection logic operational
- ✅ Performance meets targets (216x real-time)
- ✅ Accuracy >95% for clear audio

---

## 📞 Support

If you encounter issues:

1. Check logs: `~/.claude/stt-server/logs/stt-server.log`
2. Verify configuration: `curl http://localhost:8889/health`
3. Review this guide's troubleshooting section
4. Check README.md for additional documentation

---

**Testing the PAI Global STT Server ensures reliable, cost-effective speech-to-text capabilities across all Claude Code sessions!**
