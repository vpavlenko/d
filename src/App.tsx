import { useMemo } from "react";
import "./App.css";

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
  return <div>OctaveGrid</div>;
};

const MeasuresGrid = ({
  measures,
  beats,
  secondToX,
}: {
  measures: number[];
  beats: number[];
  secondToX: (second: number) => number;
}) => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Measure bars */}
      {measures.map((measure) => (
        <div
          key={`measure-${measure}`}
          style={{
            position: "absolute",
            left: `${secondToX(measure)}px`,
            top: 0,
            width: 0,
            height: "100%",
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
            height: "100%",
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
            color: "#666",
            fontSize: "12px",
            fontWeight: "bold",
            zIndex: 3,
            fontFamily: "sans-serif",
          }}
        >
          {measure}
        </div>
      ))}
    </div>
  );
};

const Grid = ({ score }: { score: Score }) => {
  const { measures, beats } = useMemo(() => {
    const highestNoteEnd = Math.max(...score.notes.map((note) => note.end));
    const measures = Array.from(
      { length: Math.ceil(highestNoteEnd) + 1 },
      (_, index) => index
    );
    const allBeats = Array.from(
      { length: Math.ceil(highestNoteEnd) * 4 },
      (_, index) => index / 4
    );

    // Strip measures from beats via Set operations
    const measuresSet = new Set(measures);
    const beats = allBeats
      .filter((beat) => !measuresSet.has(beat))
      .sort((a, b) => a - b);

    return { measures, beats };
  }, [score]);

  const secondToX = useMemo(() => {
    return (second: number) => second * PX_PER_SECOND;
  }, []);

  return (
    <div style={{ width: "500px", height: "500px", position: "relative" }}>
      <OctaveGrid />
      <MeasuresGrid measures={measures} beats={beats} secondToX={secondToX} />
    </div>
  );
};

function App() {
  return <Grid score={score} />;
}

export default App;
