import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import type { Score } from "./types";

// Custom hook for playback functionality
export const usePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());
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
    async (score: Score) => {
      try {
        const sampler = getSampler();
        if (!sampler || !samplerInitialized) {
          console.warn("Sampler not yet initialized");
          return;
        }

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
            sampler.triggerAttackRelease(noteName, duration, time, 0.8);

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
    [getSampler, samplerInitialized]
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

    // Stop all sampler notes
    if (samplerRef.current) {
      samplerRef.current.releaseAll();
    }
  }, []);

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

  return { isPlaying, playingNotes, play, stop, playNote };
};
