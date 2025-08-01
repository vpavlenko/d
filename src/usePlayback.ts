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
  const [samplerInitialized, setSamplerInitialized] = useState(false);

  // Initialize sampler immediately when hook is used
  useEffect(() => {
    const initSampler = async () => {
      if (!samplerRef.current) {
        await Tone.start();
        // Create a sampler using the Salamander Grand Piano samples
        const sampler = new Tone.Sampler({
          urls: {
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
          },
          release: 1,
          baseUrl: "https://tonejs.github.io/audio/salamander/",
          onload: () => {
            setSamplerInitialized(true);
          },
        }).toDestination();

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

  const playNote = useCallback(
    (pitch: number, duration: number = 0.3) => {
      const sampler = getSampler();
      // Only play if sampler is initialized
      if (!samplerInitialized || !sampler) {
        return;
      }

      try {
        // Convert MIDI number to note name for sampler
        const noteName = Tone.Frequency(pitch, "midi").toNote();

        // Play note immediately with specified duration using note name
        sampler.triggerAttackRelease(noteName, duration, undefined, 0.6);
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
    play,
    stop,
    playNote,
  };
};
