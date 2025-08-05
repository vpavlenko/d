import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import type { Score } from "./types";
import { loadPianoSamples } from "./samples";

// Global BPM constant for playback tempo
const PLAYBACK_BPM = 72;
const REFERENCE_BPM = 120; // BPM that score seconds were originally designed for

// Convert score seconds to real playback seconds based on BPM
const scoreSecondsToRealSeconds = (scoreSeconds: number): number => {
  return scoreSeconds * (REFERENCE_BPM / PLAYBACK_BPM);
};

// Samples are bundled - decoding happens in background without loading screen

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
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const individualNoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const individualNoteReleasesRef = useRef<Map<string, string>>(new Map());
  const [samplerInitialized, setSamplerInitialized] = useState(false);
  const [audioContextAllowed, setAudioContextAllowed] = useState<
    boolean | null
  >(null);

  // Check AudioContext state on mount
  useEffect(() => {
    const checkAudioContextState = () => {
      if (Tone.context.state === "suspended") {
        console.log("🚫 AudioContext is suspended - user interaction required");
        setAudioContextAllowed(false);
      } else {
        console.log("✅ AudioContext is allowed");
        setAudioContextAllowed(true);
      }
    };

    checkAudioContextState();
  }, []);

  // Function to enable audio context (called on user interaction)
  const enableAudioContext = useCallback(async () => {
    try {
      await Tone.start();
      console.log("🎵 Tone.js audio context started via user interaction");
      setAudioContextAllowed(true);
    } catch (error) {
      console.error("❌ Failed to start Tone.js:", error);
    }
  }, []);

  // Initialize sampler when audio context is allowed
  useEffect(() => {
    const initSampler = async () => {
      if (!samplerRef.current && audioContextAllowed) {
        // Load all piano samples as AudioBuffers (from bundled ArrayBuffers)
        const audioBuffers = await loadPianoSamples();

        if (audioBuffers.size === 0) {
          console.error("❌ No audio samples could be loaded");
          return;
        }

        // Create concert hall reverb effect
        const reverb = new Tone.Reverb({
          decay: 3.2, // Concert hall decay time (3.2 seconds)
          wet: 0.3, // 30% reverb, 70% dry signal
          preDelay: 0.04, // Small pre-delay for spaciousness
        });

        // Create sampler with pre-loaded AudioBuffers and chain through reverb
        const sampler = new Tone.Sampler({
          urls: Object.fromEntries(audioBuffers),
          release: 1,
          onload: () => {
            console.log("✅ All samples loaded successfully");
            setSamplerInitialized(true);
          },
          onerror: (error) => {
            console.error("❌ Sampler loading error:", error);
          },
        }).chain(reverb, Tone.Destination);

        samplerRef.current = sampler;
        reverbRef.current = reverb;
      }
    };

    if (audioContextAllowed) {
      initSampler();
    }
  }, [audioContextAllowed]);

  // Simple getter for the sampler instance
  const getSampler = useCallback(() => {
    return samplerRef.current;
  }, []);

  const play = useCallback(
    async (score: Score, editorId: string, measures?: number[]) => {
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

        // Helper function to check if sustain pedal is active at a given time
        const isSustainPedalActive = (scoreTime: number): boolean => {
          // If no measures provided, don't apply sustain pedaling
          if (!measures || measures.length === 0) return false;

          const measureNumber = Math.floor(scoreTime);
          // Only apply sustain if this measure exists in the measures array
          if (!measures.includes(measureNumber)) return false;

          const measureStart = measureNumber;
          const pedalPressTime = measureStart + 0.01; // 10ms after measure start in score seconds
          const nextMeasureStart = measureNumber + 1;

          return scoreTime >= pedalPressTime && scoreTime < nextMeasureStart;
        };

        // Helper function to find the next pedal release time after a given time
        const getNextPedalReleaseTime = (scoreTime: number): number => {
          const currentMeasure = Math.floor(scoreTime);
          // If no measures provided, fall back to simple calculation
          if (!measures || measures.length === 0) return currentMeasure + 1;

          // Find the next measure that exists in the measures array
          const nextMeasure = measures.find((m) => m > currentMeasure);
          return nextMeasure !== undefined ? nextMeasure : currentMeasure + 1;
        };

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

          // Determine actual release time based on sustain pedal
          let actualReleaseTime = realEndTime;

          // Check if sustain pedal is active when this note should end
          if (isSustainPedalActive(note.end)) {
            // Sustain the note until the next pedal release (next measure)
            const nextPedalReleaseTime = getNextPedalReleaseTime(note.end);
            actualReleaseTime = scoreSecondsToRealSeconds(
              nextPedalReleaseTime - minStartTime
            );
            const noteName = Tone.Frequency(note.pitch, "midi").toNote();
            console.log(
              `🦶 Sustaining note ${noteName} from ${
                note.end
              }s until measure ${Math.floor(
                nextPedalReleaseTime
              )} (${nextPedalReleaseTime}s)`
            );
          }

          // CRITICAL: Schedule releases slightly before their exact time to ensure
          // they execute before any attacks at the same time (prevents note cutoff bug)
          const releaseTime = Math.max(0, actualReleaseTime - 0.01); // 10ms earlier, but never negative
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
          }, `${releaseTime}`);

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
      if (reverbRef.current) {
        reverbRef.current.dispose();
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
    audioContextAllowed,
    enableAudioContext,
  };
};
