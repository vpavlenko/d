import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import type { Score } from "./types";

// Global BPM constant for playback tempo
const PLAYBACK_BPM = 100;
const REFERENCE_BPM = 240; // BPM that score seconds were originally designed for

// Convert score seconds to real playback seconds based on BPM
const scoreSecondsToRealSeconds = (scoreSeconds: number): number => {
  return scoreSeconds * (REFERENCE_BPM / PLAYBACK_BPM);
};

// Types for tracking sample loading
export interface SampleLoadingState {
  name: string;
  url: string;
  status: "pending" | "loading" | "loaded" | "error";
  error?: string;
  startTime?: number;
  endTime?: number;
  size?: number;
}

export interface LoadingProgress {
  samples: Map<string, SampleLoadingState>;
  totalSamples: number;
  loadedSamples: number;
  failedSamples: number;
  startTime: number;
}

// Custom hook for playback functionality
export const usePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingEditorId, setCurrentPlayingEditorId] = useState<
    string | null
  >(null);
  const [playingNotesByEditor, setPlayingNotesByEditor] = useState<
    Map<string, Set<number>>
  >(new Map());
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const individualNoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const individualNoteReleasesRef = useRef<Map<string, string>>(new Map());
  const [samplerInitialized, setSamplerInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] =
    useState<LoadingProgress | null>(null);

  // Initialize sampler immediately when hook is used
  useEffect(() => {
    const initSampler = async () => {
      if (!samplerRef.current) {
        const startTime = Date.now();

        // Sample configuration
        const sampleUrls = {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3",
        };

        const baseUrl = "https://tonejs.github.io/audio/salamander/";

        // Initialize loading progress tracking
        const samplesMap = new Map<string, SampleLoadingState>();
        Object.entries(sampleUrls).forEach(([noteName, filename]) => {
          samplesMap.set(noteName, {
            name: noteName,
            url: `${baseUrl}${filename}`,
            status: "pending",
            startTime: Date.now(),
          });
        });

        setLoadingProgress({
          samples: samplesMap,
          totalSamples: Object.keys(sampleUrls).length,
          loadedSamples: 0,
          failedSamples: 0,
          startTime,
        });

        // Start Tone.js context
        try {
          await Tone.start();
          console.log("🎵 Tone.js audio context started");
        } catch (error) {
          console.error("❌ Failed to start Tone.js:", error);
        }

        // Create custom sampler with detailed progress tracking
        const sampler = new Tone.Sampler({
          urls: sampleUrls,
          release: 1,
          baseUrl,
          onload: () => {
            console.log("✅ All samples loaded successfully");
            setSamplerInitialized(true);
            setLoadingProgress((prev) =>
              prev ? { ...prev, endTime: Date.now() } : null
            );
          },
          onerror: (error) => {
            console.error("❌ Sampler loading error:", error);
          },
        }).toDestination();

        // Track individual sample loading using fetch requests before Tone.js loads them
        const trackSampleLoading = async () => {
          // Pre-load tracking by making HEAD requests to each sample URL
          const loadPromises = Object.entries(sampleUrls).map(
            async ([noteName, filename]) => {
              const fullUrl = `${baseUrl}${filename}`;
              const sample = samplesMap.get(noteName);

              if (!sample) return;

              // Update status to loading
              setLoadingProgress((prev) => {
                if (!prev) return null;
                const newSamples = new Map(prev.samples);
                newSamples.set(noteName, {
                  ...sample,
                  status: "loading",
                  startTime: Date.now(),
                });
                return { ...prev, samples: newSamples };
              });

              try {
                // Make a HEAD request to check if the file exists and get size info
                const response = await fetch(fullUrl, { method: "HEAD" });

                if (response.ok) {
                  const contentLength = response.headers.get("content-length");

                  setLoadingProgress((prev) => {
                    if (!prev) return null;
                    const newSamples = new Map(prev.samples);
                    const currentSample = newSamples.get(noteName);
                    if (currentSample) {
                      newSamples.set(noteName, {
                        ...currentSample,
                        status: "loaded",
                        endTime: Date.now(),
                        size: contentLength
                          ? parseInt(contentLength)
                          : undefined,
                      });
                    }
                    return {
                      ...prev,
                      samples: newSamples,
                      loadedSamples: prev.loadedSamples + 1,
                    };
                  });
                  console.log(`✅ Verified sample: ${noteName} (${fullUrl})`);
                } else {
                  throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                  );
                }
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : "Failed to load";
                setLoadingProgress((prev) => {
                  if (!prev) return null;
                  const newSamples = new Map(prev.samples);
                  const currentSample = newSamples.get(noteName);
                  if (currentSample) {
                    newSamples.set(noteName, {
                      ...currentSample,
                      status: "error",
                      endTime: Date.now(),
                      error: errorMessage,
                    });
                  }
                  return {
                    ...prev,
                    samples: newSamples,
                    failedSamples: prev.failedSamples + 1,
                  };
                });
                console.error(
                  `❌ Failed to verify sample: ${noteName} (${fullUrl})`,
                  error
                );
              }
            }
          );

          // Wait for all sample checks to complete
          await Promise.allSettled(loadPromises);
        };

        // Start tracking in parallel with Tone.js loading
        trackSampleLoading();

        samplerRef.current = sampler;
      }
    };

    initSampler();
  }, []);

  // Simple getter for the sampler instance
  const getSampler = useCallback(() => {
    return samplerRef.current;
  }, []);

  const play = useCallback(
    async (score: Score, editorId: string) => {
      try {
        const sampler = getSampler();
        if (!sampler || !samplerInitialized) {
          console.warn("Sampler not yet initialized");
          return;
        }

        console.log(
          `🎬 Starting playback on ${editorId} - PANIC KILLING all previous notes first!`
        );

        // PANIC: Immediately kill all currently playing notes before starting new playback
        console.log(
          "🔇 Panic-stopping all current notes before new playback..."
        );
        sampler.releaseAll(Tone.now());

        // Extra safety: also trigger release on all possible notes
        const allNotes = Array.from({ length: 88 }, (_, i) =>
          Tone.Frequency(21 + i, "midi").toNote()
        );
        sampler.triggerRelease(allNotes, Tone.now());
        console.log("✅ All previous notes killed, starting new playback");

        // CRITICAL: Clear ALL existing scheduled events (from all editors)
        console.log(
          "📅 Clearing all scheduled events from previous playback..."
        );
        scheduledEventsRef.current.forEach((id) => Tone.Transport.clear(id));
        scheduledEventsRef.current = [];

        // Reset transport
        console.log("⏹️ Resetting Transport for new playback");
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        setIsPlaying(true);
        setCurrentPlayingEditorId(editorId);

        // Clear all editor playing notes and initialize current editor's set
        setPlayingNotesByEditor(new Map([[editorId, new Set()]]));

        // Find minimum start time to skip initial silence
        const minStartTime =
          score.notes.length > 0
            ? Math.min(...score.notes.map((note) => note.start))
            : 0;

        // Schedule all notes using Transport.schedule for precise timing
        score.notes.forEach((note, noteIndex) => {
          // Convert score time to real playback time and subtract minimum start time to skip silence
          const realStartTime = scoreSecondsToRealSeconds(
            note.start - minStartTime
          );
          const realEndTime = scoreSecondsToRealSeconds(
            note.end - minStartTime
          );

          // Schedule note start
          const startEventId = Tone.Transport.schedule((time) => {
            // Convert MIDI number to note name
            const noteName = Tone.Frequency(note.pitch, "midi").toNote();

            // Trigger note START only (not release - we'll schedule that separately)
            console.log("🎵 Starting note:", noteName, "at time:", time);
            sampler.triggerAttack(noteName, time, 0.8);

            // Update UI to show this note is playing for this specific editor
            setPlayingNotesByEditor((prev) => {
              const newMap = new Map(prev);
              const currentSet = newMap.get(editorId) || new Set();
              newMap.set(editorId, new Set([...currentSet, noteIndex]));
              return newMap;
            });
          }, `${realStartTime}`);

          // Schedule note end (both audio release and UI update)
          const endEventId = Tone.Transport.schedule((time) => {
            // Convert MIDI number to note name
            const noteName = Tone.Frequency(note.pitch, "midi").toNote();

            // Trigger note RELEASE
            console.log("🎵 Releasing note:", noteName, "at time:", time);
            sampler.triggerRelease(noteName, time);

            // Update UI to remove this note from playing for this specific editor
            setPlayingNotesByEditor((prev) => {
              const newMap = new Map(prev);
              const currentSet = newMap.get(editorId) || new Set();
              const newSet = new Set(currentSet);
              newSet.delete(noteIndex);
              newMap.set(editorId, newSet);
              return newMap;
            });
          }, `${realEndTime}`);

          scheduledEventsRef.current.push(startEventId, endEventId);
        });

        // Schedule transport stop at the end (adjusted for skipped silence)
        const maxScoreEndTime = Math.max(
          ...score.notes.map((note) => note.end)
        );
        const maxRealEndTime = scoreSecondsToRealSeconds(
          maxScoreEndTime - minStartTime
        );
        const stopEventId = Tone.Transport.schedule(() => {
          setIsPlaying(false);
          setCurrentPlayingEditorId(null);
          setPlayingNotesByEditor(new Map());
        }, `${maxRealEndTime + 0.1}`); // Small buffer to ensure all notes finish

        scheduledEventsRef.current.push(stopEventId);

        // Start transport
        Tone.Transport.start();
      } catch (error) {
        console.error("Error playing score:", error);
        setIsPlaying(false);
        setCurrentPlayingEditorId(null);
        setPlayingNotesByEditor(new Map());
      }
    },
    [getSampler, samplerInitialized]
  );

  const stop = useCallback(() => {
    console.log("🚨 PANIC STOP TRIGGERED!");

    // PANIC FUNCTIONALITY: Immediately kill all audio

    // Clear all scheduled events FIRST
    console.log(
      "📅 Clearing scheduled events, count:",
      scheduledEventsRef.current.length
    );
    scheduledEventsRef.current.forEach((id) => Tone.Transport.clear(id));
    scheduledEventsRef.current = [];

    // Stop transport immediately
    console.log("⏹️ Stopping Transport");
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    // CRITICAL: Stop all sampler notes immediately with current time
    if (samplerRef.current) {
      console.log("🎹 Sampler found, attempting to kill all notes");
      console.log("⏰ Current Tone time:", Tone.now());

      // Release all notes at the current audio context time (immediate)
      console.log("🔇 Calling releaseAll...");
      samplerRef.current.releaseAll(Tone.now());

      // For extra safety: also trigger release on all possible notes
      // This ensures even stuck notes are killed
      console.log("🎯 Triggering release on all 88 keys as failsafe...");
      const allNotes = Array.from({ length: 88 }, (_, i) =>
        Tone.Frequency(21 + i, "midi").toNote()
      );
      console.log(
        "🎼 Generated notes:",
        allNotes.slice(0, 5),
        "... (88 total)"
      );
      samplerRef.current.triggerRelease(allNotes, Tone.now());
      console.log("✅ Failsafe release completed");
    } else {
      console.log("❌ No sampler found!");
    }

    // Clear all individual note timeouts and release any stuck individual notes
    console.log("⏱️ Clearing individual note timeouts and releases");
    individualNoteTimeoutsRef.current.forEach((timeout) =>
      clearTimeout(timeout)
    );
    individualNoteTimeoutsRef.current.clear();

    // Release any individually playing notes immediately
    if (samplerRef.current) {
      individualNoteReleasesRef.current.forEach((noteName) => {
        samplerRef.current!.triggerRelease(noteName, Tone.now());
      });
    }
    individualNoteReleasesRef.current.clear();

    // Reset state
    console.log("🔄 Resetting UI state");
    setIsPlaying(false);
    setCurrentPlayingEditorId(null);
    setPlayingNotesByEditor(new Map());

    console.log("✅ PANIC STOP COMPLETED!");
  }, []);

  // Helper function to get playing notes for a specific editor
  const getPlayingNotesForEditor = useCallback(
    (editorId: string): Set<number> => {
      return playingNotesByEditor.get(editorId) || new Set();
    },
    [playingNotesByEditor]
  );

  // Helper function to get individually playing notes for a specific editor
  const getIndividuallyPlayingNotesForEditor = useCallback(
    (editorId: string): Set<number> => {
      const individualEditorId = `${editorId}-individual`;
      return playingNotesByEditor.get(individualEditorId) || new Set();
    },
    [playingNotesByEditor]
  );

  const playNote = useCallback(
    (
      pitch: number,
      duration: number,
      noteIndex?: number,
      editorId?: string
    ) => {
      const sampler = getSampler();
      // Only play if sampler is initialized
      if (!samplerInitialized || !sampler) {
        return;
      }

      try {
        // Convert MIDI number to note name for sampler
        const noteName = Tone.Frequency(pitch, "midi").toNote();

        // Use existing playingNotesByEditor system with special individual editor ID
        const individualEditorId = editorId
          ? `${editorId}-individual`
          : "individual";
        const trackingKey =
          noteIndex !== undefined
            ? `${individualEditorId}-${noteIndex}`
            : `${individualEditorId}-${pitch}`;

        // Clear any existing timeout and release for this tracking key
        const existingTimeout =
          individualNoteTimeoutsRef.current.get(trackingKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        const existingNoteName =
          individualNoteReleasesRef.current.get(trackingKey);
        if (existingNoteName) {
          // Release the previous note immediately
          sampler.triggerRelease(existingNoteName, Tone.now());
          individualNoteReleasesRef.current.delete(trackingKey);
        }

        // Add to playingNotesByEditor using the existing system
        const noteIndexToTrack =
          noteIndex !== undefined ? noteIndex : Math.abs(pitch) + 1000; // Use high numbers for pitch-only notes
        setPlayingNotesByEditor((prev) => {
          const newMap = new Map(prev);
          const currentSet = newMap.get(individualEditorId) || new Set();
          newMap.set(
            individualEditorId,
            new Set([...currentSet, noteIndexToTrack])
          );
          return newMap;
        });

        // Trigger attack immediately (no scheduling delay)
        sampler.triggerAttack(noteName, Tone.now(), 0.6);

        // Store the note name for potential early release during panic
        individualNoteReleasesRef.current.set(trackingKey, noteName);

        // CRITICAL: Use BPM conversion like the main play method
        // Convert score duration to real playback duration
        const realDuration = scoreSecondsToRealSeconds(duration);

        // Schedule release after the BPM-converted duration
        const timeout = setTimeout(() => {
          // Trigger release
          sampler.triggerRelease(noteName, Tone.now());

          // Remove from playingNotesByEditor and cleanup
          setPlayingNotesByEditor((prev) => {
            const newMap = new Map(prev);
            const currentSet = newMap.get(individualEditorId) || new Set();
            const newSet = new Set(currentSet);
            newSet.delete(noteIndexToTrack);
            if (newSet.size === 0) {
              newMap.delete(individualEditorId);
            } else {
              newMap.set(individualEditorId, newSet);
            }
            return newMap;
          });
          individualNoteTimeoutsRef.current.delete(trackingKey);
          individualNoteReleasesRef.current.delete(trackingKey);
        }, realDuration * 1000); // Convert to milliseconds

        individualNoteTimeoutsRef.current.set(trackingKey, timeout);
      } catch (error) {
        console.error("Error playing note:", error);
      }
    },
    [getSampler, samplerInitialized]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (samplerRef.current) {
        samplerRef.current.dispose();
      }
    };
  }, [stop]);

  return {
    isPlaying,
    currentPlayingEditorId,
    getPlayingNotesForEditor,
    getIndividuallyPlayingNotesForEditor,
    play,
    stop,
    playNote,
    samplerInitialized,
    loadingProgress,
  };
};
