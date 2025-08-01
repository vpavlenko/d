import type { Score } from "./types";
import { NOTE_HEIGHT } from "./RenderedNotes";

const OctaveGrid = ({
  score,
  pitchToY,
  gridWidth,
  minPitch,
  maxPitch,
}: {
  score: Score;
  pitchToY: (pitch: number) => number;
  gridWidth: number;
  minPitch: number;
  maxPitch: number;
}) => {
  const octaveLines = [];

  for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
    const pitchClass = ((pitch % 12) + 12) % 12;
    const tonic = score.tonic;

    if (pitchClass === tonic) {
      octaveLines.push(
        <div
          key={`tonic-${pitch}`}
          style={{
            position: "absolute",
            left: 0,
            top: `${pitchToY(pitch) + NOTE_HEIGHT}px`, // Bottom of the pitch
            width: `${gridWidth}px`,
            height: 0,
            borderTop: "0.5px solid #999",
            zIndex: 1,
          }}
        />
      );
    }

    if (pitchClass === (tonic - 5 + 12) % 12) {
      octaveLines.push(
        <div
          key={`dashed-${pitch}`}
          style={{
            position: "absolute",
            left: 0,
            top: `${pitchToY(pitch) + NOTE_HEIGHT}px`, // Bottom of the pitch
            width: `${gridWidth}px`,
            height: 0,
            borderTop: "0.5px dashed #666",
            zIndex: 1,
          }}
        />
      );
    }
  }

  return <>{octaveLines}</>;
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
      {measures.slice(1).map((measure, index) => (
        <div
          key={`measure-${measure}`}
          style={{
            position: "absolute",
            left: `${secondToX(measure)}px`,
            top: 0,
            width: 0,
            height: `${gridHeight}px`,
            border: `0.5px solid ${[0, 4].includes(index) ? "#fff" : "#666"}`,
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
      {measures.slice(1, -1).map((measure) => (
        <div
          key={`measure-number-${measure}`}
          style={{
            position: "absolute",
            left: `${secondToX(measure) + 7}px`,
            top: "-2px",
            color: "#ccc",
            fontSize: "12px",
            fontWeight: "bold",
            zIndex: 3,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {measure}
        </div>
      ))}
    </>
  );
};

export const Grid = ({
  measures,
  beats,
  secondToX,
  gridHeight,
  gridWidth,
  score,
  pitchToY,
  minPitch,
  maxPitch,
}: {
  measures: number[];
  beats: number[];
  secondToX: (second: number) => number;
  gridHeight: number;
  gridWidth: number;
  score: Score;
  pitchToY: (pitch: number) => number;
  minPitch: number;
  maxPitch: number;
}) => {
  return (
    <>
      <OctaveGrid
        score={score}
        pitchToY={pitchToY}
        gridWidth={gridWidth}
        minPitch={minPitch}
        maxPitch={maxPitch}
      />
      <MeasuresGrid
        measures={measures}
        beats={beats}
        secondToX={secondToX}
        gridHeight={gridHeight}
      />
    </>
  );
};
