import { useMemo } from "react";

const COLORS = [
  "#ffffff",
  "#820000",
  "#ff0000",
  "#007000",
  "#00fb47",
  "#9500b3",
  "#ea7eff",
  "#787878",
  "#0000ff",
  "#03b9d5",
  "#ff7328",
  "#ffff00",
];

const PX_PER_SECOND = 200;
const PITCH_DISTANCE = 10;
const NOTE_HEIGHT = 2 * PITCH_DISTANCE;
const HEADER_HEIGHT = 20;

type Second = number;
type MidiNumber = number;
type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

type Note = {
  start: Second;
  end: Second;
  pitch: MidiNumber;
};

type Score = {
  notes: Note[];
  tonic: PitchClass;
};

const notes: Note[] = [
  { start: 0, end: 0.25, pitch: 60 },
  { start: 0.25, end: 0.5, pitch: 61 },
  { start: 0.5, end: 0.75, pitch: 62 },
  { start: 0.75, end: 1, pitch: 63 },
  { start: 1, end: 1.25, pitch: 64 },
  { start: 1.25, end: 1.5, pitch: 65 },
  { start: 1.5, end: 1.75, pitch: 66 },
  { start: 1.75, end: 2, pitch: 67 },
  { start: 2, end: 2.25, pitch: 68 },
  { start: 2.25, end: 2.5, pitch: 69 },
  { start: 2.5, end: 2.75, pitch: 70 },
  { start: 2.75, end: 3, pitch: 71 },
  { start: 3, end: 3.25, pitch: 72 },
];

const score: Score = { notes, tonic: 0 };

const OctaveGrid = () => {
  const lowestPitch = Math.min(...notes.map((note) => note.pitch));
  const highestPitch = Math.max(...notes.map((note) => note.pitch));
  const octaves = highestPitch - lowestPitch;
  const octaveGrid = Array.from({ length: octaves }, (_, index) => {
    const pitch = lowestPitch + index * 12;
    return <div key={pitch}>{pitch}</div>;
  });
  return <div>{octaveGrid}</div>;
};

const MeasuresGrid = ({
  measures,
  beats,
  secondToX,
  gridHeight,
}: {
  measures: number[];
  beats: number[];
  secondToX: (second: number) => number;
  gridHeight: number;
}) => {
  return (
    <>
      {/* Measure bars */}
      {measures.map((measure) => (
        <div
          key={`measure-${measure}`}
          style={{
            position: "absolute",
            left: `${secondToX(measure)}px`,
            top: 0,
            width: 0,
            height: `${gridHeight}px`,
            border: "0.5px solid #999",
            zIndex: 1,
          }}
        />
      ))}

      {/* Beat bars */}
      {beats.map((beat) => (
        <div
          key={`beat-${beat}`}
          style={{
            position: "absolute",
            left: `${secondToX(beat)}px`,
            top: 0,
            width: 0,
            height: `${gridHeight}px`,
            border: "0.5px dashed #333",
            zIndex: 2,
          }}
        />
      ))}

      {/* Measure numbers */}
      {measures.slice(0, -1).map((measure) => (
        <div
          key={`measure-number-${measure}`}
          style={{
            position: "absolute",
            left: `${secondToX(measure) + 5}px`,
            top: "5px",
            color: "#ccc",
            fontSize: "12px",
            fontWeight: "bold",
            zIndex: 3,
            fontFamily: "sans-serif",
          }}
        >
          {measure}
        </div>
      ))}
    </>
  );
};

// Scale degree mapping array
const SCALE_DEGREES = [
  "1",
  "♭2",
  "2",
  "♭3",
  "3",
  "4",
  "♯4",
  "5",
  "♭6",
  "6",
  "♭7",
  "7",
];

// Function to get scale degree from pitch and tonic
const getScaleDegree = (pitch: number, tonic: number): string => {
  const scaleDegreeIndex = ((pitch % 12) + 12 - tonic) % 12;
  return SCALE_DEGREES[scaleDegreeIndex];
};

const BRIGHT_SCALE_DEGREES = ["1", "2", "3", "♯4", "6", "7"];

const RenderedNotes = ({
  score,
  secondToX,
  pitchToY,
}: {
  score: Score;
  secondToX: (second: number) => number;
  pitchToY: (pitch: number) => number;
}) => {
  return (
    <>
      {score.notes.map((note, index) => {
        const colorIndex = ((note.pitch % 12) + 12 - score.tonic) % 12;
        const color = COLORS[colorIndex];
        const scaleDegree = getScaleDegree(note.pitch, score.tonic);
        const textColor = BRIGHT_SCALE_DEGREES.includes(scaleDegree)
          ? "#000000"
          : "#ffffff";

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${secondToX(note.start)}px`,
              top: `${pitchToY(note.pitch)}px`,
              width: `${secondToX(note.end) - secondToX(note.start)}px`,
              height: `${NOTE_HEIGHT}px`,
              backgroundColor: color,
              borderRadius: "3px",
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textColor,
              fontSize: "12px",
              fontWeight: "bold",
              fontFamily: "monospace",
            }}
          >
            {scaleDegree}
          </div>
        );
      })}
    </>
  );
};

const Grid = ({
  measures,
  beats,
  secondToX,
  gridHeight,
}: {
  measures: number[];
  beats: number[];
  secondToX: (second: number) => number;
  gridHeight: number;
}) => {
  return (
    <>
      <OctaveGrid />
      <MeasuresGrid
        measures={measures}
        beats={beats}
        secondToX={secondToX}
        gridHeight={gridHeight}
      />
    </>
  );
};

const D = ({
  gridWidth,
  gridHeight,
  children,
}: {
  gridWidth: number;
  gridHeight: number;
  children: React.ReactNode;
}) => {
  return (
    <div
      style={{
        width: `${gridWidth}px`,
        height: `${gridHeight}px`,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
};

const NoteEditor = ({ score }: { score: Score }) => {
  const { measures, beats, gridHeight, gridWidth, secondToX, pitchToY } =
    useMemo(() => {
      const highestNoteEnd = Math.max(...score.notes.map((note) => note.end));

      // Fix: Use the VERY LAST measure (ceiling of highest note end)
      const lastMeasure = Math.ceil(highestNoteEnd);
      const measures = Array.from(
        { length: lastMeasure + 1 },
        (_, index) => index
      );
      const allBeats = Array.from(
        { length: lastMeasure * 4 },
        (_, index) => index / 4
      );

      // Strip measures from beats via Set operations
      const measuresSet = new Set(measures);
      const beats = allBeats
        .filter((beat) => !measuresSet.has(beat))
        .sort((a, b) => a - b);

      // Calculate dynamic dimensions
      const minPitch = Math.min(...score.notes.map((note) => note.pitch));
      const maxPitch = Math.max(...score.notes.map((note) => note.pitch));
      const gridHeight =
        (maxPitch - minPitch) * PITCH_DISTANCE + NOTE_HEIGHT + HEADER_HEIGHT;
      const gridWidth = lastMeasure * PX_PER_SECOND; // Use lastMeasure instead of highestNoteEnd

      // Create functions
      const secondToX = (second: number) => second * PX_PER_SECOND;

      // pitchToY: minPitch gets maxY (container height), higher pitches get lower Y values
      const pitchToY = (pitch: number) => {
        return HEADER_HEIGHT + (maxPitch - pitch) * PITCH_DISTANCE;
      };

      return { measures, beats, gridHeight, gridWidth, secondToX, pitchToY };
    }, [score]);

  return (
    <D gridWidth={gridWidth} gridHeight={gridHeight}>
      <Grid
        measures={measures}
        beats={beats}
        secondToX={secondToX}
        gridHeight={gridHeight}
      />
      <RenderedNotes score={score} secondToX={secondToX} pitchToY={pitchToY} />
    </D>
  );
};

function App() {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "10px",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#0a0a0a", // Dark background instead of white
      }}
    >
      {/* Left column - NoteEditor */}
      <div style={{ flex: "1" }}>
        <NoteEditor score={score} />
      </div>

      {/* Right column - Welcome text */}
      <div
        style={{
          flex: "1",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            marginBottom: "20px",
            fontSize: "28px",
            color: "#ffffff",
          }}
        >
          Welcome to D
        </h1>
      </div>
    </div>
  );
}

export default App;
