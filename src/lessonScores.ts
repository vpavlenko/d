import type { Note, PitchClass, Score } from "./types";

export interface MidiLessonData {
  ticksPerBeat: number;
  measures: {
    ticks: number;
    bpm: number;
    right: number[][];
    left: number[][];
  }[];
}

// Each excerpt has a single meter. Select separate excerpts around meter changes.
// Include notes already sounding at the excerpt boundary, and clip at its end.
export const makeExcerpt = (
  data: MidiLessonData,
  first: number,
  last: number,
  tonic: PitchClass,
  description: string,
  hands: ("right" | "left")[] = ["right", "left"]
): Score => {
  const bars = data.measures.slice(first - 1, last);
  if (!bars.length || bars.some((bar) => bar.ticks !== bars[0].ticks)) {
    throw new Error(`Excerpt ${first}–${last} must use one meter`);
  }
  const startTick = data.measures.slice(0, first - 1).reduce((sum, bar) => sum + bar.ticks, 0);
  const endTick = startTick + bars.reduce((sum, bar) => sum + bar.ticks, 0);
  const notes: Note[] = [];
  let offset = 0;
  for (const bar of data.measures.slice(0, last)) {
    for (const hand of hands) {
      for (const [pitch, start, end] of bar[hand]) {
        const onset = offset + start;
        const release = offset + end;
        if (onset < endTick && release > startTick) {
          notes.push({
            pitch,
            start: 1 + (Math.max(onset, startTick) - startTick) / bars[0].ticks,
            end: 1 + (Math.min(release, endTick) - startTick) / bars[0].ticks,
          });
        }
      }
    }
    offset += bar.ticks;
  }
  return {
    notes: notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch),
    tonic,
    description,
    beatsPerMeasure: bars[0].ticks / data.ticksPerBeat,
    bpm: bars[0].bpm,
    pedal: false,
    allowChromaticNotes: true,
  };
};

// Reductions and imagined alternatives are explicitly described in the lesson.
export const layer = (
  source: Score,
  description: string,
  notes: Note[]
): Score => ({ ...source, description, notes });
