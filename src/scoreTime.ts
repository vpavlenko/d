import type { Score } from "./types";

export const scoreTimeToSeconds = (time: number, score?: Score): number =>
  score?.bpm && score.beatsPerMeasure
    ? time * score.beatsPerMeasure * 60 / score.bpm
    : time * (120 / 72);
