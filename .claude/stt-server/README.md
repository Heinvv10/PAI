# PAI STT (Speech-to-Text) Server

Global STT service for Claude Code with 3-tier cost-optimized cascade approach.

## 🎯 Features

- **3-Tier Cascade**: Automatically selects optimal transcription method
  - Tier 1: Local whisper.cpp (FREE) - for short audio <5 min
  - Tier 2: Groq Whisper Large v3 Turbo ($0.04/hour) - for general use
  - Tier 3: Deepgram Nova-3 (real-time) - for streaming

- **Cost Optimization**: ~$3/month for 100 hours (97% savings vs OpenAI)
- **Global Availability**: Works in any Claude Code session
- **Auto-Transcription**: Automatically transcribes audio files on attachment
- **Cost Tracking**: Logs all operations for budget monitoring

## 📋 Prerequisites

- [Bun](https://bun.sh) runtime installed
- Groq API key (required for Tier 2)
- FFmpeg (optional, for audio conversion and duration detection)

## 🚀 Quick Start

### 1. Install

```bash
cd ~/.claude/stt-server
./install.sh
```

### 2. Configure API Key

Edit `~/.env` and add your Groq API key:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

Get your free API key at [console.groq.com](https://console.groq.com)

### 3. Start Server

```bash
./start.sh
```

The server will run on port 8889 (companion to voice-server on 8888).

### 4. Test

```bash
# Health check
curl http://localhost:8889/health

# Test transcription
curl -X POST http://localhost:8889/transcribe \
  --data-binary @sample.mp3 \
  -H "X-Filename: sample.mp3"
```

## 🎙️ Usage

### Automatic Transcription (Recommended)

Just attach an audio file to any Claude Code prompt:

1. Open Claude Code in any project
2. Drag & drop an audio file (.mp3, .wav, .m4a, etc.)
3. Transcript appears automatically before Claude processes it

Supported formats: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`, `.aac`, `.opus`

### Manual API Call

```bash
curl -X POST http://localhost:8889/transcribe \
  --data-binary @meeting-recording.mp3 \
  -H "X-Filename: meeting-recording.mp3"
```

Response:
```json
{
  "status": "success",
  "transcript": "Hello, this is a test transcription...",
  "confidence": 0.90,
  "duration": 120.5,
  "language": "en",
  "cost": 0.0013,
  "tier_used": 2,
  "tier_reason": "Medium audio (2.0 min), using Groq Whisper Turbo"
}
```

## 🎛️ API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "port": 8889,
  "tiers_available": {
    "tier1_local": false,
    "tier2_groq": true,
    "tier3_deepgram": false
  },
  "groq_api_configured": true,
  "deepgram_api_configured": false
}
```

### POST /transcribe

Main transcription endpoint.

**Headers:**
- `Content-Type: application/octet-stream`
- `X-Filename: audio.mp3` (optional)

**Body:** Audio file binary data

**Response:** See example above

### GET /cost?period=month

Cost tracking endpoint.

**Response:**
```json
{
  "period": "month",
  "total_cost": 2.45,
  "total_hours": 61.25,
  "tier_breakdown": {
    "tier1": { "hours": 37.5, "cost": 0.00 },
    "tier2": { "hours": 21.4, "cost": 0.86 },
    "tier3": { "hours": 2.35, "cost": 0.71 }
  }
}
```

## 🔧 Configuration

### Environment Variables (`~/.env`)

**Required:**
```bash
GROQ_API_KEY=your_groq_api_key_here
```

**Optional:**
```bash
STT_PORT=8889                              # Server port (default: 8889)
STT_ENABLED=true                           # Enable/disable service
DEEPGRAM_API_KEY=your_deepgram_api_key     # For Tier 3 real-time (optional)
```

### Tier Selection Logic

The cascade automatically selects the optimal tier based on:

- **Audio duration**: <5 min → Tier 1 (local), 5-60 min → Tier 2 (Groq)
- **Real-time flag**: Streaming → Tier 3 (Deepgram)
- **Cost limits**: Falls back to cheaper tier if budget exceeded

## 💰 Cost Analysis

### Groq Pricing (Tier 2)

| Model | Cost/Hour | Speed | Use Case |
|-------|-----------|-------|----------|
| whisper-large-v3-turbo | $0.04 | 216x real-time | General use (default) |
| distil-whisper-large-v3-en | $0.02 | Fast | English-only |
| whisper-large-v3 | $0.111 | Accurate | High-accuracy needs |

### Cost Comparison (100 hours/month)

| Provider | Monthly Cost | Savings vs OpenAI |
|----------|--------------|-------------------|
| **Groq Whisper Turbo** | **$4.00** | **89%** |
| OpenAI Whisper | $36.00 | - |
| AssemblyAI | $37.00 | -3% |
| Azure Speech | $100.00 | -178% |

### 3-Tier Cascade Savings

With 60% local / 35% Groq / 5% real-time distribution:

- Tier 1 (60 hours): $0.00
- Tier 2 (35 hours): $1.40
- Tier 3 (5 hours): $1.50
- **Total**: **$2.90/month** (97% savings vs OpenAI)

## 🛠️ Service Management

```bash
# Start server
./start.sh

# Stop server
./stop.sh

# Check status
curl http://localhost:8889/health

# View logs
tail -f ~/.claude/stt-server/logs/stt-server.log

# Check costs
curl http://localhost:8889/cost?period=month
```

## 🐛 Troubleshooting

### Server won't start

1. Check if port 8889 is already in use:
   ```bash
   lsof -ti:8889
   ```

2. Kill existing process:
   ```bash
   ./stop.sh
   ```

### No transcription output

1. Verify Groq API key is configured:
   ```bash
   grep GROQ_API_KEY ~/.env
   ```

2. Test API key manually:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer $GROQ_API_KEY"
   ```

3. Check server logs:
   ```bash
   tail -f ~/.claude/stt-server/logs/stt-server.log
   ```

### Auto-transcription not working

1. Verify hook is registered in Claude Code settings
2. Check server is running: `curl http://localhost:8889/health`
3. Look for errors in Claude Code output

### FFmpeg errors

FFmpeg is optional but recommended for:
- Audio format conversion
- Accurate duration detection
- File splitting (>25MB files)

Install FFmpeg:
- **macOS**: `brew install ffmpeg`
- **Ubuntu**: `sudo apt install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## 📊 Performance

- **Groq Whisper Turbo**: 216x real-time (10 min audio in ~3 seconds)
- **Local whisper.cpp**: 5-10x real-time (CPU), 20-50x (GPU)
- **Deepgram**: <300ms latency (real-time streaming)

## 🔒 Security

- **API Key Protection**: Keep `GROQ_API_KEY` secure, never commit to repos
- **CORS**: Server restricted to localhost only
- **Temp Files**: Audio files cleaned up after processing
- **Cost Limits**: Optional budget alerts

## 🚀 Future Enhancements

- [ ] Tier 1: Local whisper.cpp integration
- [ ] Tier 3: Deepgram real-time streaming
- [ ] Knowledge layer integration (index to RAG)
- [ ] Speaker diarization
- [ ] Batch processing queue
- [ ] MCP server integration
- [ ] Voice command execution

## 📝 License

Part of the Personal AI Infrastructure (PAI) system.

## 🙋 Support

For issues or questions:
1. Check the logs: `~/.claude/stt-server/logs/`
2. Verify configuration: `curl http://localhost:8889/health`
3. Review documentation: This README

---

**BOSS Integration**: This STT server integrates seamlessly with the BOSS knowledge layer, allowing transcripts to be indexed alongside emails, documents, and other data sources.
