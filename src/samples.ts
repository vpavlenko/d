// Import all Salamander piano samples as ArrayBuffers
import A0_mp3 from "./samples/A0.mp3?arraybuffer";
import C1_mp3 from "./samples/C1.mp3?arraybuffer";
import Ds1_mp3 from "./samples/Ds1.mp3?arraybuffer";
import Fs1_mp3 from "./samples/Fs1.mp3?arraybuffer";
import A1_mp3 from "./samples/A1.mp3?arraybuffer";
import C2_mp3 from "./samples/C2.mp3?arraybuffer";
import Ds2_mp3 from "./samples/Ds2.mp3?arraybuffer";
import Fs2_mp3 from "./samples/Fs2.mp3?arraybuffer";
import A2_mp3 from "./samples/A2.mp3?arraybuffer";
import C3_mp3 from "./samples/C3.mp3?arraybuffer";
import Ds3_mp3 from "./samples/Ds3.mp3?arraybuffer";
import Fs3_mp3 from "./samples/Fs3.mp3?arraybuffer";
import A3_mp3 from "./samples/A3.mp3?arraybuffer";
import C4_mp3 from "./samples/C4.mp3?arraybuffer";
import Ds4_mp3 from "./samples/Ds4.mp3?arraybuffer";
import Fs4_mp3 from "./samples/Fs4.mp3?arraybuffer";
import A4_mp3 from "./samples/A4.mp3?arraybuffer";
import C5_mp3 from "./samples/C5.mp3?arraybuffer";
import Ds5_mp3 from "./samples/Ds5.mp3?arraybuffer";
import Fs5_mp3 from "./samples/Fs5.mp3?arraybuffer";
import A5_mp3 from "./samples/A5.mp3?arraybuffer";
import C6_mp3 from "./samples/C6.mp3?arraybuffer";
import Ds6_mp3 from "./samples/Ds6.mp3?arraybuffer";
import Fs6_mp3 from "./samples/Fs6.mp3?arraybuffer";
import A6_mp3 from "./samples/A6.mp3?arraybuffer";
import C7_mp3 from "./samples/C7.mp3?arraybuffer";
import Ds7_mp3 from "./samples/Ds7.mp3?arraybuffer";
import Fs7_mp3 from "./samples/Fs7.mp3?arraybuffer";
import A7_mp3 from "./samples/A7.mp3?arraybuffer";
import C8_mp3 from "./samples/C8.mp3?arraybuffer";

import * as Tone from "tone";

// Map note names to their imported ArrayBuffers
const sampleArrayBuffers = {
  A0: A0_mp3,
  C1: C1_mp3,
  "D#1": Ds1_mp3,
  "F#1": Fs1_mp3,
  A1: A1_mp3,
  C2: C2_mp3,
  "D#2": Ds2_mp3,
  "F#2": Fs2_mp3,
  A2: A2_mp3,
  C3: C3_mp3,
  "D#3": Ds3_mp3,
  "F#3": Fs3_mp3,
  A3: A3_mp3,
  C4: C4_mp3,
  "D#4": Ds4_mp3,
  "F#4": Fs4_mp3,
  A4: A4_mp3,
  C5: C5_mp3,
  "D#5": Ds5_mp3,
  "F#5": Fs5_mp3,
  A5: A5_mp3,
  C6: C6_mp3,
  "D#6": Ds6_mp3,
  "F#6": Fs6_mp3,
  A6: A6_mp3,
  C7: C7_mp3,
  "D#7": Ds7_mp3,
  "F#7": Fs7_mp3,
  A7: A7_mp3,
  C8: C8_mp3,
} as const;

export type SampleName = keyof typeof sampleArrayBuffers;

/**
 * Load all piano samples as AudioBuffers from imported assets
 * Returns a Map of note names to AudioBuffers
 */
export async function loadPianoSamples(): Promise<Map<string, AudioBuffer>> {
  console.log("🎹 Loading piano samples from bundled assets...");

  // Debug: Check what we actually got from imports
  console.log(
    "🔍 Sample import types:",
    Object.entries(sampleArrayBuffers).map(
      ([key, value]) =>
        `${key}: ${typeof value} (${
          value instanceof ArrayBuffer ? "ArrayBuffer" : "not ArrayBuffer"
        })`
    )
  );

  const audioBuffers = new Map<string, AudioBuffer>();

  // Convert all imported assets to AudioBuffers in parallel
  const loadPromises = Object.entries(sampleArrayBuffers).map(
    async ([noteName, importedAsset]) => {
      try {
        let arrayBuffer: ArrayBuffer;

        // Check if we got an ArrayBuffer or a URL
        if (importedAsset instanceof ArrayBuffer) {
          arrayBuffer = importedAsset;
          console.log(`🎯 ${noteName}: Using ArrayBuffer directly`);
        } else {
          // Fall back to fetching the URL
          console.log(`📡 ${noteName}: Fetching from URL: ${importedAsset}`);
          const response = await fetch(importedAsset as string);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }

        // Decode audio data using Tone.js context
        const audioBuffer = await Tone.context.decodeAudioData(
          arrayBuffer.slice(0)
        );

        // Store the decoded buffer
        audioBuffers.set(noteName, audioBuffer);

        console.log(
          `🎵 Loaded sample: ${noteName} (${(
            arrayBuffer.byteLength / 1024
          ).toFixed(1)}KB)`
        );
      } catch (error) {
        console.error(`❌ Failed to decode sample ${noteName}:`, error);
      }
    }
  );

  // Wait for all samples to decode
  await Promise.all(loadPromises);

  console.log(
    `✅ Piano samples loaded: ${audioBuffers.size}/${
      Object.keys(sampleArrayBuffers).length
    }`
  );

  return audioBuffers;
}
