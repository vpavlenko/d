import { defaultScores } from "./scores";
import { gymnopedieNarrative } from "./gymnopedieNarrative";
import { vizisiNarrative } from "./vizisiNarrative";
import type { VersionedScores } from "./types";

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  storageKey: string;
  scores: VersionedScores;
}

export const lessons: Lesson[] = [
  {
    id: "river-flows-in-you",
    title: "River Flows in You",
    subtitle: "Yiruma · Broken chords, melodic hills, and flowing fills",
    source: "https://rawl.rocks/f/river-flows-in-you",
    storageKey: "music-scores",
    scores: defaultScores,
  },
  {
    id: "gymnopedie-no-1",
    title: "Gymnopédie No. 1",
    subtitle: "Erik Satie · A rocking bass, soft chords, and space for melody",
    source: "https://rawl.rocks/f/Gymnopdie_No._1__Satie",
    storageKey: "music-scores:gymnopedie-no-1",
    scores: { version: 1, scores: gymnopedieNarrative },
  },
  {
    id: "vizisi",
    title: "Vizisi",
    subtitle: "Jumping bass, octave melodies, and travelling chord shapes",
    source: "https://rawl.rocks/f/vizisi",
    storageKey: "music-scores:vizisi",
    scores: { version: 1, scores: vizisiNarrative },
  },
];

export const lessonFromSearch = (search: string): Lesson =>
  lessons.find((lesson) => lesson.id === new URLSearchParams(search).get("piece")) ?? lessons[0];
