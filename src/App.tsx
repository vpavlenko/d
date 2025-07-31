import { useMemo, useState, useCallback, useEffect } from "react";
import { Play, Square, Pencil } from "lucide-react";
import { usePlayback } from "./usePlayback";
import type { Note, Score } from "./types";

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

const OctaveGrid = ({
  score,
  pitchToY,
  gridWidth,
}: {
  score: Score;
  pitchToY: (pitch: number) => number;
  gridWidth: number;
}) => {
  const minPitch = Math.min(...score.notes.map((note) => note.pitch));
  const maxPitch = Math.max(...score.notes.map((note) => note.pitch));

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
  playingNotes,
  onNoteClick,
}: {
  score: Score;
  secondToX: (second: number) => number;
  pitchToY: (pitch: number) => number;
  playingNotes: Set<number>;
  onNoteClick?: (index: number) => void;
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

        const isPlaying = playingNotes.has(index);
        const haloEffect = isPlaying
          ? `0 0 5px ${color}, 0 0 10px ${color}, 0 0 15px ${color}`
          : "none";

        const isAdding = note.state === "adding";
        const borderRadius = isAdding ? "10px 0 0 10px" : "10px";
        const border = isAdding ? "2px dotted #000" : "none";
        const borderRight = isAdding ? "2px dotted #000" : "none";

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
              borderRadius,
              border: isAdding ? border : "none",
              borderRight: isAdding ? borderRight : "none",
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textColor,
              fontSize: "12px",
              fontWeight: "bold",
              fontFamily: "monospace",
              boxShadow: haloEffect,
              transition: "box-shadow 0.1s ease-in-out",
              cursor: isAdding && onNoteClick ? "pointer" : "default",
              pointerEvents: isAdding ? "none" : "auto",
            }}
            onClick={() => isAdding && onNoteClick?.(index)}
          >
            <span style={{ pointerEvents: "none", userSelect: "none" }}>
              {scaleDegree}
            </span>
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
  gridWidth,
  score,
  pitchToY,
}: {
  measures: number[];
  beats: number[];
  secondToX: (second: number) => number;
  gridHeight: number;
  gridWidth: number;
  score: Score;
  pitchToY: (pitch: number) => number;
}) => {
  return (
    <>
      <OctaveGrid score={score} pitchToY={pitchToY} gridWidth={gridWidth} />
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

const NoteEditor = ({ score: initialScore }: { score: Score }) => {
  const { isPlaying, playingNotes, play, stop, playNote } = usePlayback();
  const [isEditMode, setIsEditMode] = useState(false);
  const [score, setScore] = useState(initialScore);
  const [hoverNote, setHoverNote] = useState<Note | null>(null);
  const [lastHoverPitch, setLastHoverPitch] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNote, setDragNote] = useState<Note | null>(null);

  // Reset hover state when edit mode is disabled
  useEffect(() => {
    if (!isEditMode) {
      setHoverNote(null);
      setLastHoverPitch(null);
      setIsDragging(false);
      setDragNote(null);
    }
  }, [isEditMode]);

  // Quantization functions
  const quantizeX = useCallback(
    (x: number, measures: number[], beats: number[]) => {
      const allTimePoints = [...measures, ...beats].sort((a, b) => a - b);
      const second = x / PX_PER_SECOND;

      // Find closest time point <= second for start
      let start = 0;
      for (let i = allTimePoints.length - 1; i >= 0; i--) {
        if (allTimePoints[i] <= second) {
          start = allTimePoints[i];
          break;
        }
      }

      // Find closest time point > second for end
      let end = start + 0.25; // Default to quarter note
      for (let i = 0; i < allTimePoints.length; i++) {
        if (allTimePoints[i] > second) {
          end = allTimePoints[i];
          break;
        }
      }

      return { start, end };
    },
    []
  );

  const quantizeY = useCallback(
    (y: number, pitchToY: (pitch: number) => number) => {
      // Find pitch where pitchToY(pitch) >= y and pitchToY(pitch-1) < y
      const minPitch = Math.min(...score.notes.map((note) => note.pitch));
      const maxPitch = Math.max(...score.notes.map((note) => note.pitch));

      for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
        const pitchY = pitchToY(pitch);
        const prevPitchY = pitchToY(pitch - 1);

        if (pitchY <= y && prevPitchY > y) {
          return pitch;
        }
      }

      // Fallback to closest pitch
      let closestPitch = minPitch;
      let minDistance = Math.abs(pitchToY(minPitch) - y);

      for (let pitch = minPitch + 1; pitch <= maxPitch; pitch++) {
        const distance = Math.abs(pitchToY(pitch) - y);
        if (distance < minDistance) {
          minDistance = distance;
          closestPitch = pitch;
        }
      }

      return closestPitch;
    },
    [score.notes]
  );

  // Fine-grained quantization for 16th notes during resize
  const quantizeXFine = useCallback(
    (x: number, measures: number[], beats: number[]) => {
      // Create union of measures and beats, then add 3 additional values between each adjacent pair
      const baseTimePoints = [...measures, ...beats].sort((a, b) => a - b);
      const fineTimePoints: number[] = [];

      for (let i = 0; i < baseTimePoints.length - 1; i++) {
        const start = baseTimePoints[i];
        const end = baseTimePoints[i + 1];
        const segment = (end - start) / 4; // Divide each segment into 4 parts for 16th notes

        fineTimePoints.push(start);
        fineTimePoints.push(start + segment);
        fineTimePoints.push(start + 2 * segment);
        fineTimePoints.push(start + 3 * segment);
      }
      // Add the last time point
      if (baseTimePoints.length > 0) {
        fineTimePoints.push(baseTimePoints[baseTimePoints.length - 1]);
      }

      const second = x / PX_PER_SECOND;

      // Find the closest time point >= second for end position
      let closestTime = fineTimePoints[0];
      let minDistance = Math.abs(closestTime - second);

      for (const timePoint of fineTimePoints) {
        const distance = Math.abs(timePoint - second);
        if (distance < minDistance) {
          minDistance = distance;
          closestTime = timePoint;
        }
      }

      return closestTime;
    },
    []
  );

  const handleNoteClick = useCallback(
    (index: number) => {
      const note = score.notes[index];
      if (note.state === "adding") {
        // Add the note permanently by removing the "adding" state
        const newNotes = [...score.notes];
        newNotes[index] = {
          start: note.start,
          end: note.end,
          pitch: note.pitch,
        };
        setScore({ ...score, notes: newNotes });
      }
    },
    [score]
  );

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
    <div>
      {/* Control buttons */}
      <div style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
        <button
          onClick={() => (isPlaying ? stop() : play(score))}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            backgroundColor: "transparent",
            color: "#ccc",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#ccc";
          }}
        >
          {isPlaying ? <Square size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            backgroundColor: isEditMode ? "#fff" : "transparent",
            color: isEditMode ? "#000" : "#ccc",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (isEditMode) {
              e.currentTarget.style.backgroundColor = "#ccc";
              e.currentTarget.style.color = "#000";
            } else {
              e.currentTarget.style.color = "#fff";
            }
          }}
          onMouseLeave={(e) => {
            if (isEditMode) {
              e.currentTarget.style.backgroundColor = "#fff";
              e.currentTarget.style.color = "#000";
            } else {
              e.currentTarget.style.color = "#ccc";
            }
          }}
        >
          <Pencil size={20} />
        </button>
      </div>

      <D gridWidth={gridWidth} gridHeight={gridHeight}>
        <Grid
          measures={measures}
          beats={beats}
          secondToX={secondToX}
          gridHeight={gridHeight}
          gridWidth={gridWidth}
          score={score}
          pitchToY={pitchToY}
        />

        {/* Hover overlay for edit mode */}
        {isEditMode && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${gridWidth}px`,
              height: `${gridHeight}px`,
              zIndex: 3,
              cursor: isDragging ? "ew-resize" : "crosshair",
            }}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              const { start, end } = quantizeX(x, measures, beats);
              const pitch = quantizeY(y, pitchToY);

              // Play note sound when starting drag
              playNote(pitch);

              // Start dragging - create initial note with fixed pitch and start
              const initialNote: Note = {
                start,
                end,
                pitch,
                state: "adding",
              };

              setIsDragging(true);
              setDragNote(initialNote);
              setHoverNote(null);
              setLastHoverPitch(pitch);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              if (isDragging && dragNote) {
                // During drag: only update end position with fine quantization
                const newEnd = quantizeXFine(x, measures, beats);

                // Ensure end is not before start
                const finalEnd = Math.max(newEnd, dragNote.start + 0.0625); // Minimum 16th note length

                const updatedDragNote: Note = {
                  ...dragNote,
                  end: finalEnd,
                };
                setDragNote(updatedDragNote);
              } else {
                // Normal hover behavior when not dragging
                const { start, end } = quantizeX(x, measures, beats);
                const pitch = quantizeY(y, pitchToY);

                // Only update if the note properties have actually changed
                if (
                  !hoverNote ||
                  hoverNote.start !== start ||
                  hoverNote.end !== end ||
                  hoverNote.pitch !== pitch
                ) {
                  // Play note sound if pitch changed
                  if (lastHoverPitch !== pitch) {
                    playNote(pitch);
                  }

                  const newHoverNote: Note = {
                    start,
                    end,
                    pitch,
                    state: "adding",
                  };
                  setHoverNote(newHoverNote);
                  setLastHoverPitch(pitch);
                }
              }
            }}
            onMouseUp={() => {
              if (isDragging && dragNote) {
                // Finalize the note - add it to the score
                const newNotes = [
                  ...score.notes,
                  {
                    start: dragNote.start,
                    end: dragNote.end,
                    pitch: dragNote.pitch,
                  },
                ];
                setScore({ ...score, notes: newNotes });

                // Reset drag state
                setIsDragging(false);
                setDragNote(null);
                setHoverNote(null);
                setLastHoverPitch(null);
              }
            }}
            onMouseLeave={() => {
              if (!isDragging) {
                setHoverNote(null);
                setLastHoverPitch(null);
              }
            }}
          />
        )}

        <RenderedNotes
          score={{
            ...score,
            notes: dragNote
              ? [...score.notes, dragNote]
              : hoverNote
              ? [...score.notes, hoverNote]
              : score.notes,
          }}
          secondToX={secondToX}
          pitchToY={pitchToY}
          playingNotes={playingNotes}
          onNoteClick={handleNoteClick}
        />
      </D>
    </div>
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
