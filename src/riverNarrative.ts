import type { Score } from "./types";
import river from "./data/river-flows-in-you.json";

// MIDI bars use the source's 4/4 (and one 5/4) meter. The existing
// lesson uses one score unit for two quarter notes, with a one-unit lead-in.
// Tuples are [MIDI pitch, note-on ticks, note-off ticks], relative to each bar.
const excerpt = (
  first: number,
  last: number,
  description: string,
  hands: ("right" | "left")[] = ["right", "left"]
): Score => {
  let offset = 1;
  const notes = river.measures.slice(first - 1, last).flatMap((bar) => {
    const barNotes = hands.flatMap((hand) =>
      bar[hand].map(([pitch, start, end]) => ({
        pitch,
        start: offset + start / (river.ticksPerBeat * 2),
        end: offset + end / (river.ticksPerBeat * 2),
      }))
    );
    offset += bar.ticks / (river.ticksPerBeat * 2);
    return barNotes;
  });
  return { notes: notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch), tonic: 9, description };
};

export const riverNarrative: Score[] = [
  excerpt(3, 4,
    "The intro says the same thing twice. After each long D, two little notes, A and C♯, lead us back up to the high A. We've planted the seed; now let's follow it through the piece."),
  excerpt(5, 5,
    "Keep the high A, but let it arrive between the beats. Slip a low A into the gaps. The same melody suddenly has a little bounce. Those low notes belong to the right hand too.", ["right"]),
  excerpt(5, 6,
    "Put the left hand back. Its steady broken chords make the melody's offbeat rhythm stand out. Then the melody drops into a lower register to answer the high A phrase."),
  excerpt(7, 8,
    "The answer grows out of a small climb: A–B–C♯, then C♯–D–E. That's 1–2–3, then 3–4–5. Come back down to B, or 2. Over the E chord, this leaves room for another beginning."),
  excerpt(9, 10,
    "Say it again, with a surprise. Roll A–C♯–A into the first high note. This time the answer leaps to C♯ an octave higher, then falls through B–A–G♯. Same starting point, a much higher ceiling."),
  excerpt(11, 12,
    "We come down again through the familiar lower answer. But listen to the last four notes: A–B–A–G♯. That's the little hill we built earlier, ready to lead into the faster tune."),
  excerpt(13, 13,
    "Here it is! High A, low A–E–A, then high A–B–A–G♯. Repeat. The low fill keeps moving while our ear connects the high notes into a melody. One hand sounds like two layers.", ["right"]),
  excerpt(13, 13,
    "Underneath, the bass now returns at the end of each broken chord. Both hands keep moving. We haven't needed a new chord loop to make the music feel more active."),
  excerpt(14, 14,
    "Could we keep circling A forever? Instead, climb A–B–C♯–D–E: 1–2–3–4–5. This bigger hill reaches E at the top, then comes down to G♯ over the E chord. A high point, followed by a way back."),
  excerpt(15, 16,
    "Repeat the pair: the small hill with its low fills, then the bigger climb. Even here, the details move. In the last little hill, a quicker A–B squeezes into the space where one B used to be."),
  excerpt(17, 18,
    "How can the next repeat feel bigger? Drop the F♯ and E bass patterns an octave. The melody stays high, so the distance between the hands opens up. Add those quick A–B decorations again."),
  excerpt(19, 19,
    "One more turn of the small hill. By now we know where it goes. Repetition gives us something to recognize, so even a tiny change in the next answer can catch our ear."),
  excerpt(20, 20,
    "This time the big hill runs down into the middle of the piano. Then an extra beat makes space for A–C♯ to pick up the tune again. This bar is 5/4 in the source: count five quarter-note beats before the next high A."),
  excerpt(21, 22,
    "The bouncy opening tune returns. After all those fast hills, its more spaced-out high A notes feel familiar. The low answer returns too. A section can come back without starting the whole piece over."),
  excerpt(23, 24,
    "But the lower answer has learned a new trick. Keep dropping to E between its melody notes, just as the high tune dropped to A. The gaps fill up while the outline A–B–C♯, C♯–D–E is still there."),
  excerpt(25, 26,
    "Repeat the opening phrase once more, including its leap to high C♯. Listen for the quick little notes around the long-range melody. They decorate a shape we already know."),
  excerpt(27, 28,
    "The busy lower answer comes back, then climbs straight into A–B–A–G♯. We've heard this doorway before. It leads us into another round of the faster tune."),
  excerpt(29, 30,
    "Now combine the wide bass, the low right-hand fills, and the high hills. Near the top, B flicks up to C♯ and back to B. That's our upper-neighbor idea compressed into a tiny ornament."),
  excerpt(31, 32,
    "Play that pair again. The repeated route lets us hear the layers together: low roots, broken chords, a middle fill, and the high melody. Much of the richness comes from where the notes sit."),
  excerpt(33, 34,
    "Another pass, with fewer tiny notes in parts of the climb. A repeat doesn't have to get busier every time. We can keep the same destination and change the path by just a note or two."),
  excerpt(35, 36,
    "For the last fast pair, let the big hill fall all the way down through G♯ and E again. This time there's no extra beat. The fall clears space for the closing section."),
  excerpt(37, 38,
    "Now the opening idea returns with the straighter rhythm of the intro. Some notes arrive together as chords. After the constant little fills, these broader gestures begin to sound like a farewell."),
  excerpt(39, 40,
    "The lower answer follows. We still have the climb to C♯, then E, then the descent to B. Leave more space around it. At the end, a quick A–C♯ invites one last statement."),
  excerpt(41, 42,
    "One last high A phrase, and one last leap to C♯ above it. The hands keep the familiar colors, but the melody has room to linger. We're remembering the tune as we leave it."),
  excerpt(43, 44,
    "The lower answer comes down to B over E. Earlier, that sound sent us into another repeat. We could do that again. Instead, listen to where the bass takes us next."),
  excerpt(45, 45,
    "F♯ in the bass, with A and C♯ above it: F♯ minor, the 6 chord in our A-major colors. The melody ends on A, but the bass makes it the third of a minor chord. Let the final A octaves ring. The ending changes how that familiar note feels."),
  excerpt(44, 45,
    "So that's the whole journey: plant a small melody, give it an answer, fill its gaps, widen its range, repeat with little changes, then leave space again. The four-chord loop carries us almost all the way. Finally, stop on F♯ minor instead of setting the loop off once more."),
];
