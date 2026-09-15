# Compose in layers

Interactive composition lessons built from colored piano-roll examples. Listen
to a passage, take its bass, chords, and melody apart, then rebuild it one idea
at a time.

## Lessons

- **River Flows in You — Yiruma:** broken chords, melodic hills, and flowing fills.
- **Gymnopédie No. 1 — Erik Satie:** bass–chord separation, seventh chords, and space.
- **Vizisi:** jumping bass, octave melodies, and travelling chord shapes.

Use the lesson navigation to switch pieces. The selected piece is recorded in
`?piece=...`, so each lesson can be linked directly. Each piece keeps its own
local edits; the original River Flows in You storage key is preserved.

## Implementation

React, TypeScript, and Vite render the lesson examples. Tone.js plays bundled
piano samples. Notes are colored by pitch relative to the example's tonic;
the rest of the interface is grayscale.

- `src/lessons.ts` registers the three lessons and their storage keys.
- `src/scores.ts` and `src/riverNarrative.ts` contain the original lesson.
- `src/gymnopedieNarrative.ts` and `src/vizisiNarrative.ts` build the new lessons.
- `src/lessonScores.ts` selects MIDI excerpts and their isolated layers.
- `src/data/` contains extracted note data; playback needs no Rawl connection.

See [source notes and lesson behavior](docs/composition-lessons.md) and the
[River Flows in You analysis](docs/river-flows-in-you.md).

## Checks

```sh
npm run build
npm run lint
```
