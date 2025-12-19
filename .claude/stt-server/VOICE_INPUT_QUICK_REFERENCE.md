# 🎤 Live Voice Input - Quick Reference

**Status**: ✅ WORKING - Ready to Use!

---

## 🚀 Quick Start

1. **Open**: http://localhost:8889/
2. **Enable auto-copy**: Check the checkbox
3. **Press Spacebar**: Start recording
4. **Speak**: Your prompt naturally
5. **Press Spacebar**: Stop recording (auto-copies!)
6. **Switch to Claude Code**: Alt+Tab
7. **Paste**: Ctrl+V and send!

---

## ⌨️ Keyboard Shortcuts

- **Spacebar**: Start/Stop recording
- **Ctrl+C**: Copy transcript to clipboard
- **Ctrl+Shift+R**: Hard refresh page

---

## ✨ Features

- ✅ Real-time transcription with Deepgram Nova-3
- ✅ Auto-copy to clipboard when stopping
- ✅ Keyboard shortcuts for hands-free operation
- ✅ Word count and duration tracking
- ✅ Cost estimation ($0.0077/min)
- ✅ Visual feedback (green button when copied)

---

## 💰 Cost

- **$0.0077 per minute** ($0.46 per hour)
- **Billed by the second** (very fair!)
- **Example**: 5 min voice input = $0.04

---

## 🎯 Optimal Workflow

```
[Spacebar] → [Speak] → [Spacebar] → [Alt+Tab] → [Ctrl+V] → [Enter]
```

**Just 5 keystrokes to send a voice prompt!** 🚀

---

## 🔧 Technical Details

**Connection**: Direct to Deepgram's WebSocket (wss://api.deepgram.com)
**Model**: Nova-3 (best accuracy/cost balance)
**Audio Format**: WebM/Opus (auto-detected by browser)
**Latency**: <300ms (real-time)
**Server**: Port 8889 (http://localhost:8889/)

---

## 📝 Tips

1. **Speak clearly** at moderate pace
2. **Use auto-copy** for fastest workflow
3. **Keep browser tab open** for quick access
4. **Pin the tab** so it's always available
5. **Use headset mic** for better quality

---

## 🆘 Troubleshooting

**No transcript appearing?**
- Hard refresh: Ctrl+Shift+R
- Check microphone permissions
- Verify internet connection (connects to Deepgram)

**Can't copy to clipboard?**
- Make sure you stopped recording first
- Check if transcript has text (word count > 0)
- Try manual copy button if auto-copy fails

**Poor transcription quality?**
- Speak slower and clearer
- Reduce background noise
- Use headset microphone
- Check microphone input level (not too loud/quiet)

---

## 🎊 Success!

You can now **talk to Claude Code** in real-time!

**Your voice → Instant text → Claude Code → Magic happens!** ✨

---

**Quick Access**: Bookmark http://localhost:8889/ for instant access!

**Version**: 1.0.0 - Direct Deepgram Integration
**Date**: 2025-11-19
**Status**: Production Ready ✅
