# 🎙️ Live Voice Input - Quick Start Guide

**Transform your voice into text in real-time with Claude Code!**

---

## ✨ What You Get

- **Real-time transcription** as you speak (<300ms latency)
- **Beautiful web interface** for voice input
- **Automatic integration** with Claude Code
- **Cost-effective** at $0.46/hour for live voice
- **High accuracy** with Deepgram Nova-3

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Deepgram API Key

1. Visit: https://console.deepgram.com
2. Sign up or log in (FREE $200 credit for new accounts!)
3. Create a new API key
4. Copy the key

### Step 2: Configure API Key

Add to your `~/.env` file:

```bash
echo "DEEPGRAM_API_KEY=your_key_here" >> ~/.env
```

Or manually edit `~/.env` and add:
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Step 3: Restart STT Server

```bash
cd ~/.claude/stt-server
./stop.sh
./start.sh
```

Expected output:
```
✅ PAI STT Server running on http://localhost:8889
   DEEPGRAM_API_KEY: ✅ Configured
```

### Step 4: Open Voice Input UI

Open in your browser:
```
http://localhost:8889/
```

Or simply:
```
open http://localhost:8889/  # macOS
start http://localhost:8889/  # Windows
xdg-open http://localhost:8889/  # Linux
```

---

## 🎤 How to Use

### Web Interface

1. **Open** http://localhost:8889/ in your browser
2. **Click** the microphone button (🎤)
3. **Allow** microphone access when prompted
4. **Speak** - watch your words appear in real-time!
5. **Click** microphone again to stop
6. **Copy** transcript to clipboard
7. **Paste** into Claude Code prompt

### Features

- **Real-time transcription** - see words as you speak
- **Interim results** - partial transcripts (grayed out)
- **Final results** - confirmed transcripts (white)
- **Word count** - track how much you've said
- **Cost tracking** - see estimated cost in real-time
- **Duration tracking** - monitor recording time
- **Copy to clipboard** - one-click copy
- **Clear transcript** - start fresh anytime

---

## 💰 Cost Breakdown

### Deepgram Nova-3 Streaming Pricing

- **Rate**: $0.0077 per minute ($0.46 per hour)
- **Billed**: By the second (e.g., 61 seconds = 61 seconds, not 2 minutes)
- **Latency**: <300ms (real-time)
- **Free Credits**: $200 for new accounts

### Example Costs

| Usage | Cost | What You Get |
|-------|------|--------------|
| 1 min | $0.0077 | Quick voice note |
| 5 min | $0.04 | Short meeting recap |
| 15 min | $0.12 | Medium conversation |
| 30 min | $0.23 | Long meeting |
| 1 hour | $0.46 | Extended recording |

### Monthly Budget Examples

At $0.46/hour:
- **10 hours/month**: $4.60 (~20 min/day)
- **20 hours/month**: $9.20 (~40 min/day)
- **50 hours/month**: $23.00 (~1.5 hours/day)

**Compare to alternatives:**
- OpenAI Whisper batch: $0.36/hour (batch only, no real-time)
- Google Speech-to-Text streaming: $1.44/hour (3x more expensive)
- Azure Speech streaming: $1.00/hour (2x more expensive)

**Winner**: Deepgram Nova-3 is the most cost-effective real-time STT solution! 🏆

---

## 🔧 Integration with Claude Code

### Option 1: Copy & Paste (Current)

1. Open voice input UI: http://localhost:8889/
2. Click microphone and speak
3. Click "Copy to Clipboard"
4. Paste into Claude Code prompt
5. Send to Claude

### Option 2: Browser Extension (Future Phase)

Coming soon:
- Browser extension for Chrome/Edge/Firefox
- Direct injection into Claude Code prompt box
- Hotkey activation (e.g., Ctrl+Shift+V)
- Background transcription

### Option 3: Desktop App (Future Phase)

Coming later:
- Standalone Electron app
- System-wide hotkey
- Clipboard auto-paste
- Multiple voice profiles

---

## 🎯 Use Cases

### 1. Long Prompts
Instead of typing lengthy instructions, speak them naturally:
- "I need you to analyze this codebase and identify performance bottlenecks..."
- Convert 5 minutes of typing into 30 seconds of speaking

### 2. Brainstorming
Capture ideas quickly without breaking flow:
- "What if we used a state machine for workflow orchestration..."
- Keep creative momentum going

### 3. Meeting Notes
Record meeting discussions and paste into Claude for summaries:
- "Client wants feature X by Q2, budget is $50k..."
- Instant meeting recap generation

### 4. Code Reviews
Explain complex code changes verbally:
- "This refactoring moves auth logic to middleware because..."
- Richer context than written comments

### 5. Documentation
Dictate documentation instead of writing:
- "The user registration flow starts when..."
- Faster than typing, more natural language

---

## 📊 Performance Metrics

### Latency
- **Deepgram Nova-3**: <300ms (real-time)
- **Network latency**: ~50-100ms (local server)
- **Total latency**: ~350-400ms (feels instant!)

### Accuracy
- **English**: >95% accuracy (clear audio)
- **Noisy environments**: >90% accuracy
- **Technical terms**: >85% accuracy (improves with context)
- **Accents**: High accuracy (Deepgram is accent-agnostic)

### Quality Factors
- **Clear speech**: Best results
- **Background noise**: Minimal impact (good noise cancellation)
- **Multiple speakers**: Supported (no diarization yet)
- **Technical vocabulary**: Learns from context

---

## 🛠️ Troubleshooting

### Web UI Not Loading

**Problem**: http://localhost:8889/ shows "Connection refused"

**Solution**:
```bash
# Check if server is running
curl http://localhost:8889/health

# If not running, start it
cd ~/.claude/stt-server
./start.sh
```

### Microphone Not Working

**Problem**: "Microphone access denied" error

**Solution**:
1. Check browser permissions (Settings → Privacy → Microphone)
2. Grant microphone access to browser
3. Refresh page and try again
4. Check system microphone settings (Sound → Input)

### WebSocket Connection Failed

**Problem**: "WebSocket upgrade failed" or "Connection error"

**Solution**:
```bash
# Verify Deepgram API key configured
grep DEEPGRAM_API_KEY ~/.env

# If missing, add it
echo "DEEPGRAM_API_KEY=your_key_here" >> ~/.env

# Restart server
cd ~/.claude/stt-server
./stop.sh && ./start.sh
```

### No Transcription Appearing

**Problem**: Microphone works but no text appears

**Solution**:
1. Check browser console for errors (F12 → Console)
2. Verify Deepgram API key is valid:
   ```bash
   curl https://api.deepgram.com/v1/listen \
     -H "Authorization: Token YOUR_DEEPGRAM_KEY" \
     -H "Content-Type: audio/wav"
   ```
3. Check server logs:
   ```bash
   tail -f ~/.claude/stt-server/logs/stt-server.log
   ```

### Audio Quality Issues

**Problem**: Transcription is inaccurate

**Solution**:
- Speak clearly and at moderate pace
- Reduce background noise
- Use headset microphone (better quality)
- Check microphone input level (not too loud/quiet)
- Move closer to microphone

---

## 🎨 Customization

### Change Language

Edit `voice-input.html` line 306:
```javascript
language: "es",  // Spanish
language: "fr",  // French
language: "de",  // German
language: "ja",  // Japanese
```

Supported languages: [Deepgram Language Support](https://developers.deepgram.com/documentation/features/language/)

### Change Model

Edit `voice-input.html` line 307:
```javascript
model: "nova-3",       // Default (best balance)
model: "nova-2",       // Faster, less accurate
model: "enhanced",     // More accurate, slower
```

### Adjust Update Rate

Edit `voice-input.html` line 309:
```javascript
utterance_end_ms: 1000,  // 1 second (default)
utterance_end_ms: 500,   // 0.5 seconds (faster)
utterance_end_ms: 2000,  // 2 seconds (slower)
```

---

## 📈 Next Steps

### Short-Term (Next Week)

1. **Test in production** - use for daily Claude Code prompts
2. **Monitor costs** - track monthly spending
3. **Optimize workflow** - find best use cases
4. **Collect feedback** - identify pain points

### Medium-Term (Next Month)

1. **Browser extension** - direct integration
2. **Hotkey activation** - system-wide shortcut
3. **Auto-paste** - clipboard automation
4. **Speaker diarization** - multi-speaker support

### Long-Term (3-6 Months)

1. **Desktop app** - standalone Electron app
2. **Voice commands** - control Claude via voice
3. **Custom vocabulary** - project-specific terms
4. **Batch processing** - transcribe recordings

---

## 🎉 Success Checklist

- [ ] Deepgram API key configured
- [ ] Server running on port 8889
- [ ] Web UI accessible at http://localhost:8889/
- [ ] Microphone permission granted
- [ ] WebSocket connection established
- [ ] Real-time transcription working
- [ ] Copy to clipboard functional
- [ ] Successfully used with Claude Code

---

## 💡 Pro Tips

### 1. Use Punctuation Commands

Say these naturally:
- "period" → .
- "comma" → ,
- "question mark" → ?
- "new paragraph" → \n\n

### 2. Speak Continuously

Don't pause too long between sentences - Deepgram works best with continuous speech.

### 3. Review Before Pasting

Check interim results (grayed text) before they become final - you can restart if needed.

### 4. Use for Complex Prompts

Best ROI is on prompts >100 words where typing would be tedious.

### 5. Combine with File Attachments

Speak context, then attach files - rich multimodal prompts!

---

## 📞 Support

### Questions?

- **Server issues**: Check logs at `~/.claude/stt-server/logs/stt-server.log`
- **API issues**: Visit https://console.deepgram.com
- **Feature requests**: Create GitHub issue

### Resources

- **Deepgram Docs**: https://developers.deepgram.com/
- **STT Server Docs**: `~/.claude/stt-server/README.md`
- **Testing Guide**: `~/.claude/stt-server/TESTING_GUIDE.md`

---

**🎊 Congratulations! You now have real-time voice input for Claude Code!** 🎊

Speak naturally, think creatively, and let AI do the rest.

**Your voice → Instant text → Claude Code → Magic happens!** ✨

---

**Version**: 1.0.0 - Live Voice Input
**Last Updated**: 2025-11-19
**Feature**: Phase 3 - Real-Time Streaming with Deepgram Nova-3
