# River Flows in You: lesson continuation

The original 23 examples build a melody and accompaniment, then stop after
introducing the opening and pedal. The next 27 examples follow the arrangement
through its final chord. Each description is paired with playable notes; isolated
right-hand examples explain the offbeat theme and the two layers in the faster tune.

## Source

- Reference: https://rawl.rocks/f/river-flows-in-you
- Arrangement credited by Rawl: https://musescore.com/user/12461571/scores/3291706
- Public MIDI document: https://firestore.googleapis.com/v1/projects/rawlrocks/databases/(default)/documents/midis/Eowyfr8Xz9CRFyvmCqMm
- SHA-256 of the decoded MIDI: `31cbdfa3633238092470c025b4f98b321e5fbb8666fa4b361666de82ae02f53e`

The Rawl page could not be fetched directly. Its public MIDI index resolved the
slug to the document above. The MIDI's `blob.bytesValue` was base64-decoded and
its note-on/off events extracted using Python's `mido` library. No download or
MIDI parser is needed when running this app.

`src/data/river-flows-in-you.json` contains all 840 notes in the source, grouped
into 45 bars. Each tuple is `[pitch, startTick, endTick]`, relative to its bar.
Track 0 is the right hand; track 1 is the left hand. Resolution is 480 ticks per
quarter note. Note timings, short ornaments, overlaps, and note-off durations
are retained. These are excerpts of this arrangement, not a transcription of
the timing or dynamics of Yiruma's recorded performance.

## Form and listening points

| Source bars | Narrative |
| --- | --- |
| 1–4 | Repeated introductory seed, held D, A–C♯ pickup |
| 5–8 | Offbeat high-A theme and lower answering phrase |
| 9–12 | Varied theme, leap to high C♯, pickup into the faster idea |
| 13–16 | Alternating low fills and high hills; climb to E6 |
| 17–20 | Lower bass register, ornaments, descending exit |
| 21–28 | Return of the theme with increasingly filled-in lower answers |
| 29–36 | Return and repetition of the fast material, then a descending exit |
| 37–44 | Broader opening gestures and familiar answers in the closing section |
| 45 | Final F♯-minor arpeggio and A octaves |

Bar 20 has five quarter-note beats. Every other bar has four. The return at bar
21 must therefore begin at MIDI beat 81, not 80. The final bar begins at beat 177.
The key signature is A major; the last harmony is F♯ minor. The lesson keeps A as
color 1 throughout, so the final A is heard as the third of the 6 chord.

## Integration

`src/riverNarrative.ts` selects short excerpts and supplies the prose.
`src/scores.ts` appends them and increments the default version to 4505, using
the existing storage version mechanism. Locally edited lessons whose saved
version is 4505 or higher still take precedence under that mechanism.

The existing lesson uses one horizontal score unit for two MIDI quarter notes,
with the first downbeat at score position 1. New excerpts use the same scale.
Consequently the grid's local numbers are not the source's bar numbers. The
5/4 bar occupies 2.5 units; its extra beat is retained. Playback uses the app's
existing tempo, fixed velocity, and automatic pedal behavior.
