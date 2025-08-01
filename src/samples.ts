// Import base64-encoded piano samples from bundled JSON
import samplesData from "./samples-data.json";
import * as Tone from "tone";

// Extract the sample names from the imported data
const sampleBase64Data = samplesData.samples;

export type SampleName = keyof typeof sampleBase64Data;

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Load all piano samples as AudioBuffers from base64-encoded JSON data
 * Returns a Map of note names to AudioBuffers
 */
export async function loadPianoSamples(): Promise<Map<string, AudioBuffer>> {
  console.log("🎹 Loading piano samples from bundled base64 data...");
  console.log(
    `📊 Total samples to load: ${Object.keys(sampleBase64Data).length}`
  );

  const audioBuffers = new Map<string, AudioBuffer>();

  // Convert all base64 samples to AudioBuffers in parallel
  const loadPromises = Object.entries(sampleBase64Data).map(
    async ([noteName, base64Data]) => {
      try {
        // Convert base64 to ArrayBuffer
        const arrayBuffer = base64ToArrayBuffer(base64Data);

        console.log(
          `🔄 Converting ${noteName}: ${(arrayBuffer.byteLength / 1024).toFixed(
            1
          )}KB`
        );

        // Decode audio data using Tone.js context
        const audioBuffer = await Tone.context.decodeAudioData(
          arrayBuffer.slice(0)
        );

        // Store the decoded buffer
        audioBuffers.set(noteName, audioBuffer);

        console.log(`✅ Loaded sample: ${noteName}`);
      } catch (error) {
        console.error(`❌ Failed to decode sample ${noteName}:`, error);
      }
    }
  );

  // Wait for all samples to decode
  await Promise.all(loadPromises);

  console.log(
    `🎵 Piano samples loaded: ${audioBuffers.size}/${
      Object.keys(sampleBase64Data).length
    } samples`
  );

  return audioBuffers;
}
