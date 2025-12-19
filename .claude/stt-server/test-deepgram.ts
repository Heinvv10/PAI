/**
 * Test Deepgram API Key and Streaming
 */

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const API_KEY = "fb3054eb88ce5c2e05b1a2d5ea0e3b1e142e02fb";

console.log("🧪 Testing Deepgram API...\n");

async function testDeepgram() {
  try {
    console.log("1️⃣ Creating Deepgram client...");
    const client = createClient(API_KEY);

    console.log("2️⃣ Starting live transcription connection...");
    const connection = client.listen.live({
      model: "nova-3",
      language: "en",
      smart_format: true,
      interim_results: true,
    });

    let connectionOpened = false;
    let transcriptReceived = false;

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("✅ Connection opened successfully!");
      connectionOpened = true;

      // Send a test message after 1 second
      setTimeout(() => {
        if (!transcriptReceived) {
          console.log("⚠️  No transcript received after 5 seconds");
          console.log("   This suggests audio format issue or API problem");
          connection.finish();
          process.exit(1);
        }
      }, 5000);
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      transcriptReceived = true;
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript && transcript.length > 0) {
        console.log(`📝 Transcript (${isFinal ? 'FINAL' : 'interim'}): ${transcript}`);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: Error) => {
      console.error("❌ Deepgram error:", error);
      process.exit(1);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("🔌 Connection closed");

      if (connectionOpened && !transcriptReceived) {
        console.log("\n❌ RESULT: Connection worked but no transcripts received");
        console.log("   Possible causes:");
        console.log("   - No audio data sent");
        console.log("   - Audio format not supported");
        console.log("   - API key has streaming disabled");
      } else if (connectionOpened && transcriptReceived) {
        console.log("\n✅ RESULT: Deepgram API working correctly!");
      } else {
        console.log("\n❌ RESULT: Connection never opened");
      }

      process.exit(connectionOpened && transcriptReceived ? 0 : 1);
    });

    console.log("3️⃣ Waiting for connection to open...\n");

    // Close after 10 seconds
    setTimeout(() => {
      console.log("\n⏱️  Test timeout - closing connection");
      connection.finish();
    }, 10000);

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testDeepgram();
