import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import type { Score } from "./types";

// Custom hook for playback functionality
export const usePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const [synthInitialized, setSynthInitialized] = useState(false);

  // Initialize synth immediately when hook is used
  useEffect(() => {
    const initSynth = async () => {
      if (!synthRef.current) {
        await Tone.start();
        // Create a piano-like synth using PolySynth with a nice piano-ish sound
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "triangle",
          },
          envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 1,
          },
        }).toDestination();

        synthRef.current = synth;
        setSynthInitialized(true);
      }
    };

    initSynth();
  }, []);

  // Initialize synth on first use (fallback for play function)
  const initializeSynth = useCallback(async () => {
    if (!synthRef.current) {
      await Tone.start();
      // Create a piano-like synth using PolySynth with a nice piano-ish sound
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();

      synthRef.current = synth;
    }
    return synthRef.current;
  }, []);

  const play = useCallback(
    async (score: Score) => {
      try {
        const synth = await initializeSynth();

        // Clear any existing scheduled events
        scheduledEventsRef.current.forEach((id) => Tone.Transport.clear(id));
        scheduledEventsRef.current = [];

        // Reset transport
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        setIsPlaying(true);
        setPlayingNotes(new Set());

        // Schedule all notes using Transport.schedule for precise timing
        score.notes.forEach((note, noteIndex) => {
          // Schedule note start
          const startEventId = Tone.Transport.schedule((time) => {
            // Convert MIDI number to note name
            const noteName = Tone.Frequency(note.pitch, "midi").toNote();
            const duration = note.end - note.start;

            // Trigger note with duration
            synth.triggerAttackRelease(noteName, duration, time, 0.8);

            // Update UI to show this note is playing
            setPlayingNotes((prev) => new Set([...prev, noteIndex]));
          }, `${note.start}`);

          // Schedule note end (for UI only, audio handled by triggerAttackRelease)
          const endEventId = Tone.Transport.schedule(() => {
            // Update UI to remove this note from playing
            setPlayingNotes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(noteIndex);
              return newSet;
            });
          }, `${note.end}`);

          scheduledEventsRef.current.push(startEventId, endEventId);
        });

        // Schedule transport stop at the end
        const maxEndTime = Math.max(...score.notes.map((note) => note.end));
        const stopEventId = Tone.Transport.schedule(() => {
          setIsPlaying(false);
          setPlayingNotes(new Set());
        }, `${maxEndTime + 0.1}`); // Small buffer to ensure all notes finish

        scheduledEventsRef.current.push(stopEventId);

        // Start transport
        Tone.Transport.start();
      } catch (error) {
        console.error("Error playing score:", error);
        setIsPlaying(false);
        setPlayingNotes(new Set());
      }
    },
    [initializeSynth]
  );

  const stop = useCallback(() => {
    // Clear all scheduled events
    scheduledEventsRef.current.forEach((id) => Tone.Transport.clear(id));
    scheduledEventsRef.current = [];

    // Stop transport
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    // Reset state
    setIsPlaying(false);
    setPlayingNotes(new Set());

    // Stop all synth notes
    if (synthRef.current) {
      synthRef.current.releaseAll();
    }
  }, []);

  const playNote = useCallback(
    (pitch: number, duration: number = 0.3) => {
      // Only play if synth is initialized
      if (!synthInitialized || !synthRef.current) {
        return;
      }

      try {
        // Convert MIDI to frequency using direct math - fastest possible
        // frequency = 440 * 2^((pitch - 69) / 12)
        const frequency = 440 * Math.pow(2, (pitch - 69) / 12);

        // Play note immediately with specified duration using frequency
        synthRef.current.triggerAttackRelease(
          frequency,
          duration,
          undefined,
          0.6
        );
      } catch (error) {
        console.error("Error playing note:", error);
      }
    },
    [synthInitialized]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, [stop]);

  return { isPlaying, playingNotes, play, stop, playNote };
};
