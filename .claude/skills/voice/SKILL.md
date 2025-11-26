---
name: voice
description: |
  PAI Voice Integration System

  Provides bidirectional voice communication:
  - **TTS (Text-to-Speech)**: ElevenLabs voices for Kai and all agents
  - **STT (Speech-to-Text)**: Groq Whisper for audio transcription

  === VOICE CAPABILITIES ===

  1. Agent voice notifications on task completion
  2. Audio file transcription (drag & drop)
  3. Distinct voices per agent personality
  4. Cost-optimized transcription (~$4/100 hours)

  === WHEN TO USE ===

  - Setting up voice output for agents
  - Transcribing audio files
  - Configuring voice identities
  - Troubleshooting voice issues

triggers:
  - voice
  - tts
  - stt
  - speech
  - audio
  - transcribe
  - elevenlabs
  - whisper
---

# PAI Voice Integration

## Quick Reference

| Service | Port | Purpose | API Key Required |
|---------|------|---------|------------------|
| **Voice Server (TTS)** | 8888 | Text-to-Speech | `ELEVENLABS_API_KEY` |
| **STT Server** | 8889 | Audio Transcription | `GROQ_API_KEY` |

---

## Text-to-Speech (ElevenLabs)

### Overview

Every agent has a unique voice that plays when tasks complete:
- **Kai**: Professional, conversational
- **Engineer**: Steady, professional
- **Researcher**: Analytical, clear
- **Architect**: Strategic, sophisticated
- **Pentester**: Technical, sharp

### Starting Voice Server

```bash
cd ~/.claude/voice-server
bun server.ts &

# Verify
curl http://localhost:8888/health
```

### Voice IDs

| Agent | ElevenLabs Voice ID | Personality |
|-------|---------------------|-------------|
| kai | s3TPKV1kjDlVtZbl4Ksh | UK Male, Professional |
| perplexity-researcher | AXdMgz6evoL7OPd7eU12 | Analytical |
| claude-researcher | AXdMgz6evoL7OPd7eU12 | Strategic |
| gemini-researcher | iLVmqjzCGGvqtMCk6vVQ | Multi-perspective |
| engineer | fATgBRI8wg5KkDFg8vBd | Steady |
| principal-engineer | iLVmqjzCGGvqtMCk6vVQ | Senior leadership |
| architect | muZKMsIDGYtIkjjiUS82 | Sophisticated |
| designer | ZF6FPAbjXT4488VcRRnw | Creative |
| pentester | xvHLFjaUEpx4BOf7EiDd | Technical |
| writer | gfRt6Z3Z8aTbpLfexQ7N | Articulate |

### Completion Format for Voice

All responses must end with:
```
🎯 COMPLETED: [5-6 word description]
```

Optional short version:
```
🗣️ CUSTOM COMPLETED: [under 8 words]
```

The stop hook extracts this text and sends it to the voice server.

### Manual Voice Test

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, I am Kai","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
```

### Environment Variables

```bash
# In ~/.env
ELEVENLABS_API_KEY=your_key_here
PORT=8888  # Optional, defaults to 8888
```

Get free API key: https://elevenlabs.io (10,000 chars/month free)

---

## Speech-to-Text (Groq Whisper)

### Overview

Global transcription service for audio files:
- **Cost**: $0.04/hour (89% cheaper than OpenAI)
- **Speed**: 216x real-time
- **Accuracy**: >95% for clear audio

### Starting STT Server

```bash
cd ~/.claude/stt-server
./start.sh

# Verify
curl http://localhost:8889/health
```

### Usage

**Drag & drop audio files into Claude Code** - automatically transcribed!

Supported formats: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`, `.aac`, `.opus`

### Manual Transcription

```bash
curl -X POST http://localhost:8889/transcribe \
  --data-binary @recording.mp3 \
  -H "X-Filename: recording.mp3"
```

### Cost Tracking

```bash
# Monthly cost summary
curl "http://localhost:8889/cost?period=month"
```

### Environment Variables

```bash
# In ~/.env
STT_PORT=8889
STT_ENABLED=true
GROQ_API_KEY=gsk_your_key_here
```

Get free API key: https://console.groq.com

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      PAI Voice System                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐       ┌─────────────────┐              │
│  │   Voice Server  │       │   STT Server    │              │
│  │   (Port 8888)   │       │   (Port 8889)   │              │
│  │                 │       │                 │              │
│  │  ElevenLabs TTS │       │  Groq Whisper   │              │
│  │  Neural voices  │       │  Transcription  │              │
│  └────────┬────────┘       └────────┬────────┘              │
│           │                         │                        │
│           ▼                         ▼                        │
│  ┌─────────────────┐       ┌─────────────────┐              │
│  │   Stop Hook     │       │   File Attach   │              │
│  │                 │       │   Hook          │              │
│  │  Extracts       │       │  Detects audio  │              │
│  │  COMPLETED text │       │  Sends to STT   │              │
│  └────────┬────────┘       └────────┬────────┘              │
│           │                         │                        │
│           ▼                         ▼                        │
│  ┌─────────────────────────────────────────────┐            │
│  │              Claude Code Session             │            │
│  │                                              │            │
│  │  🎯 COMPLETED: Task done     ───► Voice     │            │
│  │  📎 audio.mp3                ───► Transcript │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Hook Configuration

### Stop Hook (TTS Trigger)

In `~/.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun ~/.claude/hooks/stop-hook.ts"
          }
        ]
      }
    ]
  }
}
```

### File Attach Hook (STT Trigger)

```json
{
  "hooks": {
    "onFileAttach": "~/.claude/hooks/stt/on_file_attach.ts"
  }
}
```

---

## Adding Custom Voices

### Step 1: Get ElevenLabs Voice ID

1. Browse voices at https://elevenlabs.io/voice-library
2. Select a voice matching the agent personality
3. Copy the voice ID

### Step 2: Update Hook

Edit `~/.claude/hooks/subagent-stop-hook.ts`:

```typescript
const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  // ... existing voices ...
  'my-new-agent': 'new_elevenlabs_voice_id_here',
};
```

### Step 3: Test

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Testing new voice","voice_id":"new_elevenlabs_voice_id_here"}'
```

---

## Troubleshooting

### Voice Not Playing

1. **Check server running**:
   ```bash
   curl http://localhost:8888/health
   ```

2. **Verify API key**:
   ```bash
   grep ELEVENLABS_API_KEY ~/.env
   ```

3. **Test directly**:
   ```bash
   curl -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message":"Test","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
   ```

### Transcription Not Working

1. **Check STT server**:
   ```bash
   curl http://localhost:8889/health
   ```

2. **Verify Groq key**:
   ```bash
   grep GROQ_API_KEY ~/.env
   ```

3. **Check logs**:
   ```bash
   tail -f ~/.claude/stt-server/logs/stt-server.log
   ```

### Wrong Voice Playing

1. **Check voice ID in hook**:
   ```bash
   grep "ELEVENLABS_VOICE_IDS" ~/.claude/hooks/subagent-stop-hook.ts
   ```

2. **Verify COMPLETED format**:
   - Must be: `🎯 COMPLETED: [text]`
   - Check for typos in emoji

---

## Cost Summary

### TTS (ElevenLabs)
- **Free tier**: 10,000 chars/month
- **Starter**: $5/month for 30,000 chars
- **Creator**: $22/month for 100,000 chars

### STT (Groq Whisper)
- **Cost**: $0.04/hour of audio
- **100 hours/month**: ~$4
- **Comparison**: 89% cheaper than OpenAI Whisper

### Combined Cost
- Light usage (10 hrs audio, 10K chars): ~$0.40/month
- Medium usage (50 hrs audio, 30K chars): ~$7/month
- Heavy usage (100 hrs audio, 100K chars): ~$26/month

---

## System Requirements

- **macOS**: Required for `afplay` audio playback
- **Bun**: JavaScript runtime for servers
- **Internet**: Required for API calls
- **API Keys**: ElevenLabs + Groq

---

## Best Practices

1. **Keep completions concise**: 5-8 words for voice
2. **Use CUSTOM COMPLETED**: For very short voice messages
3. **Match voice to personality**: Each agent should sound distinct
4. **Monitor costs**: Check usage monthly
5. **Test new voices**: Before adding to production

---

## Integration with Other Skills

### Agent Collaboration
Each agent in a collaboration pattern has its own voice for completion announcements.

### Model Routing
Voice costs are minimal - no need to route based on voice usage.

### Observability
When Veritas running, voice events can be tracked in metrics.
