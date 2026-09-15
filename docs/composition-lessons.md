# Three composition lessons

The app now offers three lessons through the navigation at the top of the page.
Each lesson starts with a short complete example, separates its musical layers,
and rebuilds the passage before following its development and ending.

| Lesson | Examples | Main compositional ideas |
| --- | ---: | --- |
| River Flows in You — Yiruma | 50 | Broken chords, melodic outlines, neighbors, low fills, returning themes |
| Gymnopédie No. 1 — Erik Satie | 27 | Bass–chord separation, seventh chords, shared notes, silence, a changed ending |
| Vizisi | 41 | Alternating bass and chords, pentatonic melody, octave doubling, transposition, chromatic motion |

The simplified Satie triads, simultaneous bass-and-chord alternative, isolated
layers, and Vizisi scale sketch are explicitly described as teaching examples.
Other excerpts use the notes from the referenced Rawl arrangements. Vizisi's
source supplies the title `vizisi` without a composer credit; no composer has
been inferred.

## Sources and extraction

### Gymnopédie No. 1

- Rawl: https://rawl.rocks/f/Gymnopdie_No._1__Satie
- Arrangement: https://musescore.com/user/35720483/scores/6989996
- Public MIDI document: https://firestore.googleapis.com/v1/projects/rawlrocks/databases/(default)/documents/midis/7WyiW0MqhvDvJxHOesTA
- SHA-256: `894c885ac04855c5af401db400689fadd4f41215610b56d3aa7a2ce773e03944`
- 455 notes, 78 bars, 3/4. The second large section repeats much of the first,
  then changes its ending from D major to D minor.

### Vizisi

- Rawl: https://rawl.rocks/f/vizisi
- Arrangement: https://musescore.com/user/146316/scores/4804640
- Public MIDI document: https://firestore.googleapis.com/v1/projects/rawlrocks/databases/(default)/documents/midis/ALZIRsxYenTE4SrNreIt
- The MIDI hash is stored in `src/data/vizisi.json`.
- 1,884 notes, 193 bars. Meter changes at MIDI quarter-note positions 204 and
  225: source bars 52–58 have three beats, surrounded by four-beat bars.
- The main F theme uses octave doubling and a pentatonic melody. Contrasting
  episodes include D♭/C runs, a whole-tone passage, a middle section moving
  through C, A, F♯, E♭, and C, and a final chromatic approach to F.

Both files were fetched from Rawl's public Firestore MIDI documents by resolving
slugs through its public index. The base64 `blob.bytesValue` was decoded and
parsed with Python `mido`. Track 0 is the right hand; track 1 is the left hand.
All note-on/off events were checked against the extracted JSON.

Each bar stores its length in ticks, its starting tempo, and per-hand tuples
`[pitch, startTick, endTick]`. Both MIDI files use 480 ticks per quarter note.
There is no network request or MIDI parser at app runtime.

## Playback and display

New lessons use one horizontal unit per source bar and a one-unit lead-in.
The grid divides each bar into its actual three or four quarter-note beats.
Playback and individual-note previews convert units using each example's meter
and tempo. Existing River Flows in You examples retain their original timing.

An excerpt uses the tempo at the start of its first bar. Excerpts around Satie's
final slowdown are separated to preserve its last two tempo changes. An internal
tempo change in Vizisi's first short bar is represented by the excerpt's starting
tempo; the next excerpt uses the new tempo. The data retains note lengths, but
performance velocities and MIDI controller automation are not reproduced.
Automatic full-bar pedal extension is disabled in the new lessons so it does not
blur Vizisi's short chord attacks. Satie's longer source note lengths still ring.

`makeExcerpt` includes notes held across the opening boundary and clips notes at
the closing boundary. Each excerpt stays within one meter and at most four bars,
so the existing five-unit editor layout can show it. Excerpts demonstrate
representative repetitions rather than putting every bar in a separate lesson row.

## Navigation and editing

- `?piece=river-flows-in-you`, `?piece=gymnopedie-no-1`, and `?piece=vizisi`
  link directly to lessons. Missing or unknown values open River Flows in You.
- Switching lessons stops playback and updates the URL. Back/Forward restores
  the selected lesson. Existing `edit` parameters are retained.
- The original lesson still uses the `music-scores` storage key. New lessons use
  `music-scores:gymnopedie-no-1` and `music-scores:vizisi`.
- Saved edits and copied examples retain meter, tempo, and pedal settings.
- Navigation and all non-note UI remain grayscale.

The new lessons allow chromatic notes in the editor, so their altered scale
notes and transposed chords can be explored. The editing pitch range includes
all existing notes, including Vizisi's low bass. On narrow screens, diagrams
scale to the available width and sit below the prose and controls.

## Validation

Build and lint pass. All 2,339 extracted notes in the new lessons were compared
with the original MIDI events. Checks also cover valid example ranges, clipping
and held notes at excerpt boundaries, three- and four-beat tempo conversion,
separate storage keys, URL selection, and Satie's final slowdown.

An isolated Chrome session checked all three lesson switches, editing and
restoring a saved description without affecting another piece, stopping playback
on a switch, browser Back, direct lesson links, and presentation mode. Desktop
and narrow-screen screenshots were inspected.
