import data from "./data/gymnopedie.json";
import { layer, makeExcerpt } from "./lessonScores";
import type { Score } from "./types";

const excerpt = (
  first: number,
  last: number,
  description: string,
  hands: ("right" | "left")[] = ["right", "left"]
) => makeExcerpt(data, first, last, 2, description, hands);

const pulse = excerpt(1, 4, "");
const melody = excerpt(5, 8, "", ["right"]);
const opening = excerpt(5, 8, "");
const bass = pulse.notes.filter((note) => note.pitch < 48);
const triads = pulse.notes.filter((note) =>
  Math.floor(note.start) % 2 === 1 ? note.pitch % 12 !== 6 : note.pitch % 12 !== 1
);

export const gymnopedieNarrative: Score[] = [
  excerpt(5, 8,
    'How to compose "Gymnopédie No. 1" by Erik Satie? Listen to these four bars. A low note, a soft chord, and a melody with plenty of room around it. Let’s take the layers apart.'),
  layer(pulse,
    "Start with just two bass notes: G, then D. Repeat. D is our color 1, so the bass rocks between 4 and 1. We already have somewhere to leave from and somewhere to return to.", bass),
  layer(pulse,
    "We count three beats in each bar: ONE, two, three. Put a plain major chord on beat two, after the bass. Here's a simplified version with only the three notes of each chord.", triads),
  layer(pulse,
    "Now add one note to each chord. F♯ over G gives G–B–D–F♯; C♯ over D gives D–F♯–A–C♯. These are major-seventh chords. That extra color gives our two-chord rocking motion its particular softness.", pulse.notes),
  layer(pulse,
    "Listen only to the upper chord notes. F♯ stays in place while B moves to A and D moves to C♯. The bass makes a large leap, but the chord above it barely has to move.", pulse.notes.filter((note) => note.pitch >= 48)),
  layer(pulse,
    "What if the chords landed with the bass? Here's that imagined version. All the weight falls on beat one. Compare it with the next example.", pulse.notes.map((note) => ({ ...note, start: Math.floor(note.start) }))),
  layer(pulse,
    "Satie separates the low note from the chord. Bass on ONE, chord on two, let it ring through three. Moving the same notes in time changes the character of the accompaniment.", pulse.notes),
  layer(melody,
    "Now the melody alone. It enters on beat two, rises from F♯ to A, then mostly falls. The small B–C♯–D climb interrupts that fall before the long A. A contour can be simple and still have a turn in it.", melody.notes),
  layer(opening,
    "Put just the bass under the melody. We can hear the two outlines without the middle layer. The opening melody is high above the bass; that empty space is part of the sound.", opening.notes.filter((note) => note.pitch < 48 || note.pitch >= 69)),
  layer(opening,
    "Fill the middle back in. Notice the first F♯: it belongs to the G-major-seventh chord sounding underneath. Later, the melody passes through other scale notes while the accompaniment keeps its slow pulse.", opening.notes),
  excerpt(9, 12,
    "Then the melody falls to a low F♯ and leaves several bars of space. The accompaniment can carry the piece by itself. We don't have to fill every opening with another tune."),
  excerpt(13, 16,
    "Repeat the melody exactly. Because the first phrase had so much space around it, its return feels like another breath. Repetition establishes what the listener can recognize."),
  excerpt(17, 20,
    "Now move the bass: F♯, B, E. The familiar chord shapes take us away from the G–D rocking motion. Above them, the melody uses long C♯, F♯, and E notes. Let harmony do the travelling."),
  excerpt(21, 24,
    "A new color appears: F natural instead of F♯. Then the melody uses C natural instead of C♯. These lowered notes darken the D-major palette. The bass–chord rhythm stays familiar while the harmony changes."),
  excerpt(25, 26,
    "Hold D in the bass and melody while changing the chord between them. First we hear C–E–A–D, then C–F♯–A–D. Keep the outside still and move the inside: another way to make a phrase develop."),
  excerpt(27, 30,
    "The melody climbs E–F–G–A, then drops back into the middle register. That's the biggest rise in this passage. The repeated low D gives the climb a steady floor."),
  excerpt(31, 34,
    "After another held D, G gives way to F♯, then B–A–B. The bass begins to move again. We are gathering motion for the end of this large section."),
  excerpt(35, 36,
    "Repeat C♯–D–E over two different chords. We don't need a new melody for each new harmony. The same three notes can tell a slightly different story when the middle layer changes."),
  excerpt(37, 39,
    "For the first ending, the hands briefly move together in fuller chords. A7 leads to D major. Listen for F♯ in that final D chord: we'll change just that note much later."),
  excerpt(40, 43,
    "Begin again with the bare accompaniment. The whole opening world returns. These four bars give the melody room to enter afresh."),
  excerpt(44, 47,
    "Here is the same opening melody again. The piece can reuse a long stretch of material because its slow pace makes the return itself meaningful."),
  excerpt(56, 59,
    "After the repeated theme and its pauses, take the familiar route through F♯, B, and E again. We're following the earlier section toward its ending. What if the destination changed this time?"),
  excerpt(64, 67,
    "The held D and the E–F–G–A climb return too. Keep these landmarks in place. A listener can recognize the journey even if its last few steps are different."),
  excerpt(71, 74,
    "Here is the turn: the earlier G–F♯ becomes G–F natural. C natural appears too. The melody and chords now lean toward D minor. Small pitch changes can reshape an entire ending."),
  excerpt(75, 76,
    "Repeat E–D–C, then let the hands move together toward the closing chords. The C♯ and F♯ from the first ending have become C natural and F natural. A few altered notes have changed the destination."),
  excerpt(77, 77,
    "Slow down on A7. Its notes point toward D, just as they did in the first ending. But this chord doesn't tell us yet whether that D will be major or minor."),
  excerpt(78, 78,
    "The final chord arrives more slowly still. D has F natural above it: D minor. Same root, different third. Let it settle. A two-note bass, a delayed chord, a spacious melody, and one changed ending can sustain a whole composition."),
];
