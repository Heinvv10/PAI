# 🚀 PAI STT Server - Quick Start Guide

Get your global Speech-to-Text service running in **under 5 minutes**!

---

## ⚡ 1-Minute Setup

```bash
# Navigate to PAI directory
cd "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure\.claude\stt-server"

# Run installation
./install.sh

# Configure API key
echo "GROQ_API_KEY=your_key_here" >> ~/.env

# Start server
./start.sh

# Verify it's working
curl http://localhost:8889/health
```

✅ **Done!** Your global STT service is now running.

---

## 📋 Step-by-Step Setup

### Step 1: Prerequisites

**Install Bun** (if not already installed):
```bash
curl -fsSL https://bun.sh/install | bash
```

**Get Groq API Key** (FREE):
1. Visit: https://console.groq.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create new key
5. Copy the key (starts with `gsk_`)

### Step 2: Install STT Server

```bash
# Navigate to STT server directory
cd ~/.claude/stt-server

# Run installation script
./install.sh
```

**Expected output:**
```
🎙️ PAI STT Server Installation
================================

✅ Bun installed: 1.x.x
✅ Created logs directory
✅ Made scripts executable
⚠️  GROQ_API_KEY not configured in ~/.env
   Get API key from: https://console.groq.com
```

### Step 3: Configure Environment

**Option A: Create new ~/.env file**
```bash
cat > ~/.env << 'EOF'
# STT Configuration
STT_PORT=8889
STT_ENABLED=true
GROQ_API_KEY=gsk_your_actual_key_here
EOF
```

**Option B: Edit existing ~/.env**
```bash
nano ~/.env
# or
vim ~/.env
# or
code ~/.env
```

Add these lines:
```bash
STT_PORT=8889
STT_ENABLED=true
GROQ_API_KEY=gsk_your_actual_key_here  # Replace with your key
```

### Step 4: Start Server

```bash
cd ~/.claude/stt-server
./start.sh
```

**Expected output:**
```
🎙️ Starting PAI STT Server...
🚀 Starting server on port 8889...
✅ PAI STT Server started successfully
   Port: 8889
   Logs: /home/user/.claude/stt-server/logs/stt-server.log
   Health: curl http://localhost:8889/health
```

### Step 5: Verify Installation

**Quick verification:**
```bash
./verify.sh
```

**Manual verification:**
```bash
# Health check
curl http://localhost:8889/health

# Expected response:
# {
#   "status": "healthy",
#   "port": 8889,
#   "tiers_available": {
#     "tier1_local": false,
#     "tier2_groq": true,
#     "tier3_deepgram": false
#   },
#   "groq_api_configured": true
# }
```

---

## 🎤 Usage Examples

### 1. Manual Transcription via API

```bash
# Transcribe an audio file
curl -X POST http://localhost:8889/transcribe \
  --data-binary @recording.mp3 \
  -H "X-Filename: recording.mp3"
```

**Response:**
```json
{
  "status": "success",
  "transcript": "Hello, this is a test transcription.",
  "confidence": 0.95,
  "duration": 3.5,
  "language": "en",
  "cost": 0.00004,
  "tier_used": 2,
  "tier_reason": "Short audio (3.5s), using Groq Whisper Turbo"
}
```

### 2. Auto-Transcription in Claude Code

**Just drag & drop an audio file into Claude Code!**

1. Open Claude Code in any project
2. Drag an audio file into the terminal (or attach via UI)
3. Transcript appears automatically:

```
🎙️ Audio file detected: meeting-notes.mp3
📤 Sending to STT server for transcription...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎙️ AUDIO TRANSCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 File: meeting-notes.mp3
⏱️  Duration: 120.5s
🌍 Language: en
💰 Cost: $0.0013
🎯 Tier: 2 (Medium audio, using Groq Whisper Turbo)
📊 Confidence: 92.5%

📝 Transcript:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Your meeting notes transcribed here...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Supported audio formats:**
- `.mp3` - MP3 audio
- `.wav` - WAV audio
- `.m4a` - Apple audio
- `.ogg` - Ogg Vorbis
- `.flac` - FLAC lossless
- `.webm` - WebM audio
- `.aac` - AAC audio
- `.opus` - Opus audio

### 3. Check Costs

```bash
# Monthly cost summary
curl "http://localhost:8889/cost?period=month"
```

**Response:**
```json
{
  "period": "month",
  "total_cost": 2.45,
  "total_hours": 61.25,
  "tier_breakdown": {
    "tier1": { "hours": 0, "cost": 0 },
    "tier2": { "hours": 61.25, "cost": 2.45 },
    "tier3": { "hours": 0, "cost": 0 }
  }
}
```

---

## 🛠️ Management Commands

### Start Server
```bash
cd ~/.claude/stt-server
./start.sh
```

### Stop Server
```bash
cd ~/.claude/stt-server
./stop.sh
```

### Check Status
```bash
curl http://localhost:8889/health
```

### View Logs
```bash
# Real-time logs
tail -f ~/.claude/stt-server/logs/stt-server.log

# Cost logs
cat ~/.claude/stt-server/logs/cost-log.jsonl
```

### Verify Installation
```bash
cd ~/.claude/stt-server
./verify.sh
```

---

## 🔧 Troubleshooting

### Server won't start

**Check if port is already in use:**
```bash
lsof -ti:8889
```

**Kill existing process:**
```bash
./stop.sh
./start.sh
```

**Check Bun is installed:**
```bash
bun --version
```

### No transcription output

**Verify API key:**
```bash
grep GROQ_API_KEY ~/.env
```

**Test API key manually:**
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

**Check server logs:**
```bash
tail -f ~/.claude/stt-server/logs/stt-server.log
```

### Auto-transcription not working in Claude Code

**Verify hook is registered:**

Check `~/.claude/settings.json`:
```json
{
  "hooks": {
    "onFileAttach": "~/.claude/hooks/stt/on_file_attach.ts"
  }
}
```

**Check server is running:**
```bash
curl http://localhost:8889/health
```

**Verify file extension:**
- Must be: .mp3, .wav, .m4a, .ogg, .flac, .webm, .aac, .opus

---

## 💰 Cost Optimization

### Target Costs

**Groq Whisper Turbo (Tier 2):**
- Cost: **$0.04/hour** of audio
- Speed: **216x real-time** (1 min audio in ~0.3s)
- Accuracy: **>95%** for clear audio

**Example monthly costs:**
- 10 hours: **$0.40/month**
- 50 hours: **$2.00/month**
- 100 hours: **$4.00/month**

**Comparison:**
- OpenAI Whisper: $36/month for 100 hours
- **Groq (us)**: $4/month for 100 hours
- **Savings**: **89%** cheaper!

### Future Enhancements (Even Cheaper!)

**Tier 1 (Local whisper.cpp) - Coming Soon:**
- Cost: **FREE**
- Target: 60% of usage (short <5 min audio)
- Estimated savings: **$2.40/month** additional

**With full 3-tier cascade:**
- Current: $4.00/month
- With Tier 1: **$1.60/month**
- **Total savings: 97%** vs OpenAI!

---

## 📊 Performance Metrics

### Speed
- **Groq Whisper Turbo**: 216x real-time
- **Example**: 10-minute audio transcribed in ~3 seconds

### Accuracy
- **General speech**: >95% accuracy
- **Clear audio**: >98% accuracy
- **Confidence scoring**: 0.0-1.0 scale

### Supported Languages
- English (primary)
- Spanish, French, German, Italian, Portuguese
- Dutch, Polish, Russian, Turkish, Korean
- Japanese, Chinese, Arabic, Hebrew
- 90+ languages total

---

## 🎯 Next Steps

### Immediate Use Cases
- 📝 **Meeting notes**: Record and transcribe meetings
- 🎙️ **Voice memos**: Transcribe voice notes automatically
- 📚 **Lectures**: Transcribe educational content
- 🎬 **Video content**: Extract audio and transcribe
- 💬 **Interviews**: Transcribe interview recordings

### Future Integrations
- **Knowledge Layer**: Index transcripts to RAG/PostgreSQL
- **Speaker Diarization**: Identify multiple speakers
- **Real-time Streaming**: Live transcription (Tier 3)
- **MCP Server**: Direct Claude Code tool integration
- **Batch Processing**: Queue for large transcript jobs

---

## 📚 Additional Resources

- **Comprehensive Docs**: See `README.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **API Reference**: `README.md` → API Endpoints section
- **Troubleshooting**: `README.md` → Troubleshooting section

---

## 🆘 Support

**Common Issues:**
1. Server won't start → Check Bun installation and port availability
2. No transcription → Verify GROQ_API_KEY is configured
3. Hook not triggering → Check audio file extension and server status

**Get Help:**
1. Check logs: `tail -f ~/.claude/stt-server/logs/stt-server.log`
2. Run verification: `./verify.sh`
3. Review `TESTING_GUIDE.md` for detailed troubleshooting

---

**🎉 Congratulations! You now have a global, cost-optimized STT service running across all Claude Code sessions!**

**Cost:** $4/month for 100 hours (89% cheaper than OpenAI)
**Speed:** 216x real-time transcription
**Availability:** Global across all projects

Enjoy your new superpower! 🚀
