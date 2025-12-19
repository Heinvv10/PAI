#!/usr/bin/env bun
/**
 * PAI STT (Speech-to-Text) Server
 *
 * Global STT service for Claude Code with 3-tier cost-optimized cascade:
 * - Tier 1: Local whisper.cpp (FREE)
 * - Tier 2: Groq Whisper Large v3 Turbo ($0.04/hour)
 * - Tier 3: Deepgram Nova-3 (real-time streaming)
 *
 * Port: 8889 (companion to voice-server on 8888)
 */

// Load environment from ~/.env
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(homedir(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        process.env[key.trim()] = value;
      }
    }
  });
}

import { serve, file } from "bun";
import { selectTier } from "./cascade";
import { transcribeWithGroq } from "./tier2-groq";
import { logCost } from "./cost-tracker";
import { DeepgramStreamClient } from "./tier3-deepgram";

const PORT = process.env.STT_PORT || 8889;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Filename",
};

console.log(`🎙️ PAI STT Server starting on port ${PORT}...`);

const server = serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: CORS_HEADERS,
        status: 204,
      });
    }

    // Health check
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({
        status: "healthy",
        port: PORT,
        tiers_available: {
          tier1_local: false, // Not yet implemented
          tier2_groq: !!process.env.GROQ_API_KEY,
          tier3_deepgram: !!process.env.DEEPGRAM_API_KEY,
        },
        groq_api_configured: !!process.env.GROQ_API_KEY,
        deepgram_api_configured: !!process.env.DEEPGRAM_API_KEY,
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Cost tracking endpoint
    if (url.pathname === "/cost" && req.method === "GET") {
      const period = url.searchParams.get("period") || "month";
      // TODO: Implement cost retrieval from PostgreSQL
      return new Response(JSON.stringify({
        period: period,
        total_cost: 0,
        total_hours: 0,
        tier_breakdown: {
          tier1: { hours: 0, cost: 0 },
          tier2: { hours: 0, cost: 0 },
          tier3: { hours: 0, cost: 0 },
        },
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Main transcription endpoint
    if (url.pathname === "/transcribe" && req.method === "POST") {
      try {
        // Get audio file from request
        const contentType = req.headers.get("Content-Type");
        const filename = req.headers.get("X-Filename") || "audio.mp3";

        console.log(`📥 Received transcription request: ${filename}`);

        // Get audio buffer
        const audioBuffer = await req.arrayBuffer();

        // Save to temp file
        const tempPath = `/tmp/${Date.now()}_${filename}`;
        await Bun.write(tempPath, audioBuffer);

        console.log(`💾 Saved audio to: ${tempPath}`);

        // Select optimal tier
        const tierSelection = await selectTier(tempPath, {
          realtime: false,
          preferLocal: false,
        });

        console.log(`🎯 Selected ${tierSelection.reason}`);
        console.log(`💰 Estimated cost: $${tierSelection.estimatedCost.toFixed(4)}`);

        let result;

        // Execute transcription based on tier
        switch (tierSelection.tier) {
          case 1:
            // TODO: Implement local whisper.cpp
            throw new Error("Tier 1 (local whisper.cpp) not yet implemented");

          case 2:
            result = await transcribeWithGroq(tempPath);
            break;

          case 3:
            // TODO: Implement Deepgram
            throw new Error("Tier 3 (Deepgram) not yet implemented");

          default:
            throw new Error(`Invalid tier: ${tierSelection.tier}`);
        }

        // Log cost
        await logCost({
          tier: tierSelection.tier,
          duration: result.duration,
          cost: result.cost,
          provider: tierSelection.tier === 2 ? "groq" : "unknown",
          filename: filename,
        });

        console.log(`✅ Transcription complete (${result.duration.toFixed(1)}s audio, cost: $${result.cost.toFixed(4)})`);

        // Clean up temp file
        await Bun.write(tempPath, ""); // Overwrite for security

        return new Response(JSON.stringify({
          status: "success",
          transcript: result.transcript,
          confidence: result.confidence,
          duration: result.duration,
          language: result.language,
          cost: result.cost,
          tier_used: tierSelection.tier,
          tier_reason: tierSelection.reason,
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (error: any) {
        console.error(`❌ Transcription error: ${error.message}`);
        return new Response(JSON.stringify({
          status: "error",
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // WebSocket streaming endpoint
    if (url.pathname === "/transcribe/stream") {
      // Upgrade to WebSocket
      if (server.upgrade(req)) {
        return; // Connection upgraded to WebSocket
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Serve voice input UI
    if (url.pathname === "/" || url.pathname === "/voice-input") {
      const htmlFile = file(join(__dirname, "public", "voice-input-v2.html"));
      return new Response(htmlFile, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // 404 for unknown endpoints
    return new Response("Not Found", { status: 404 });
  },

  // WebSocket handler
  websocket: {
    open(ws) {
      console.log("🔌 WebSocket client connected");
      ws.data = {
        deepgramClient: null,
        startTime: Date.now(),
        totalDuration: 0,
      };
    },

    async message(ws, message) {
      try {
        // Initialize Deepgram client if not already done
        if (!ws.data.deepgramClient) {
          const apiKey = process.env.DEEPGRAM_API_KEY;

          if (!apiKey) {
            ws.send(JSON.stringify({
              type: "error",
              message: "DEEPGRAM_API_KEY not configured. Please add it to ~/.env"
            }));
            return;
          }

          console.log("🔧 Initializing Deepgram client...");
          ws.data.deepgramClient = new DeepgramStreamClient(apiKey);

          await ws.data.deepgramClient.startStream({
            onTranscript: (transcript, isFinal) => {
              console.log(`📝 Transcript (${isFinal ? 'FINAL' : 'interim'}): ${transcript}`);
              ws.send(JSON.stringify({
                type: "transcript",
                transcript: transcript,
                is_final: isFinal,
                timestamp: Date.now(),
              }));
            },
            onError: (error) => {
              console.error("🔴 Deepgram error:", error);
              ws.send(JSON.stringify({
                type: "error",
                message: error.message,
              }));
            },
            language: "en",
            model: "nova-3",
          });

          console.log("🎙️ Deepgram stream started successfully");
        }

        // Send audio chunk to Deepgram
        let audioBuffer;

        if (message instanceof ArrayBuffer) {
          audioBuffer = Buffer.from(message);
          console.log(`🔊 Received ArrayBuffer: ${audioBuffer.length} bytes`);
        } else if (message instanceof Buffer) {
          audioBuffer = message;
          console.log(`🔊 Received Buffer: ${audioBuffer.length} bytes`);
        } else if (typeof message === 'string') {
          // Ignore string messages (likely JSON)
          console.log(`📨 Received string message: ${message.substring(0, 50)}...`);
          return;
        } else {
          console.log(`⚠️ Unexpected message type: ${typeof message}`);
          return;
        }

        if (audioBuffer && audioBuffer.length > 0) {
          ws.data.deepgramClient.sendAudio(audioBuffer);
        }

      } catch (error: any) {
        console.error("❌ WebSocket message error:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: error.message,
        }));
      }
    },

    async close(ws) {
      console.log("🔌 WebSocket client disconnected");

      // Clean up Deepgram connection
      if (ws.data.deepgramClient) {
        await ws.data.deepgramClient.close();

        // Log cost
        const costInfo = ws.data.deepgramClient.getCost();
        await logCost({
          tier: 3,
          duration: costInfo.duration,
          cost: costInfo.cost,
          provider: "deepgram",
          filename: "live-stream",
        });

        console.log(`✅ Stream ended. Duration: ${costInfo.duration.toFixed(1)}s, Cost: $${costInfo.cost.toFixed(4)}`);
      }
    },
  },
});

console.log(`✅ PAI STT Server running on http://localhost:${PORT}`);
console.log(``);
console.log(`📋 Endpoints:`);
console.log(`   GET  /health              - Health check`);
console.log(`   GET  /                    - Live voice input UI (open in browser)`);
console.log(`   GET  /cost?period=month   - Cost tracking`);
console.log(`   POST /transcribe          - Batch transcription (audio files)`);
console.log(`   WS   /transcribe/stream   - Real-time streaming (WebSocket)`);
console.log(``);
console.log(`🎙️ Live Voice Input:`);
console.log(`   Open: http://localhost:${PORT}/ in your browser`);
console.log(`   Click microphone and speak - real-time transcription!`);
console.log(``);
console.log(`🔑 Configuration:`);
console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "✅ Configured" : "❌ Missing (for batch transcription)"}`);
console.log(`   DEEPGRAM_API_KEY: ${process.env.DEEPGRAM_API_KEY ? "✅ Configured" : "❌ Missing (required for live voice input)"}`);
console.log(``);
if (!process.env.DEEPGRAM_API_KEY) {
  console.log(`⚠️  Live voice input requires DEEPGRAM_API_KEY`);
  console.log(`   Get one at: https://console.deepgram.com`);
  console.log(`   Then add to ~/.env: DEEPGRAM_API_KEY=your_key_here`);
  console.log(``);
}
