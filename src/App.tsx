import { useMemo, useState, useCallback, useEffect } from "react";
import { Play, Square, Pencil } from "lucide-react";
import { usePlayback } from "./usePlayback";
import { Grid } from "./Grid";
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

export const PX_PER_SECOND = 200;
export const EIGHTH_NOTE_DURATION = 0.125; // 1/8th note in seconds
export const PITCH_DISTANCE = 10;
export const NOTE_HEIGHT = 2 * PITCH_DISTANCE;
export const HEADER_HEIGHT = 20;

const notes: Note[] = [{ start: 0, end: 0.25, pitch: 60 }];

const scores: Score[] = [
  { notes, tonic: 0, description: "First score" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
  { notes, tonic: 0, description: "Its bass line" },
];

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

// Generate a stable key for a note based on its musical properties
const generateNoteKey = (note: Note): string => {
  return `${note.pitch}_${note.start}_${note.end}`;
};

const RenderedNotes = ({
  score,
  secondToX,
  pitchToY,
  playingNotes,
  onNoteClick,
  isEditMode,
  playNote,
  onNoteDelete,
  hoveredNoteIndex,
  onNoteHover,
}: {
  score: Score;
  secondToX: (second: number) => number;
  pitchToY: (pitch: number) => number;
  playingNotes: Set<number>;
  onNoteClick: (index: number) => void;
  isEditMode?: boolean;
  playNote: (pitch: number) => void;
  onNoteDelete: (index: number) => void;
  hoveredNoteIndex?: number | null;
  onNoteHover: (index: number | null) => void;
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
        // Use same color logic for borders as text
        const borderColor = BRIGHT_SCALE_DEGREES.includes(scaleDegree)
          ? "#000000"
          : "#ffffff";
        const border = isAdding ? `2px dotted ${borderColor}` : "none";
        const borderRight = isAdding ? `2px dotted ${borderColor}` : "none";

        // Determine cursor based on edit mode and note state
        let cursor = "default";
        if (isAdding) {
          cursor = "pointer";
        } else if (isEditMode && !isAdding) {
          // Use same color logic for cursor as text
          const cursorSvg = BRIGHT_SCALE_DEGREES.includes(scaleDegree)
            ? "PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDZMNiAxOCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNNiA2TDE4IDE4IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=" // Black X for bright backgrounds
            : "PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDZMNiAxOCIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNNiA2TDE4IDE4IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo="; // White X for dark backgrounds
          cursor = `url('data:image/svg+xml;base64,${cursorSvg}') 8 8, auto`;
        }

        // Apply scale transform when hovering over existing note in edit mode
        const isHoveredForDelete =
          isEditMode && !isAdding && hoveredNoteIndex === index;
        const transform = isHoveredForDelete ? "scale(0.9)" : "none";

        return (
          <div
            key={generateNoteKey(note)}
            style={{
              position: "absolute",
              left: `${secondToX(note.start)}px`,
              top: `${pitchToY(note.pitch)}px`,
              width: `${secondToX(note.end) - secondToX(note.start)}px`,
              height: `${NOTE_HEIGHT}px`,
              zIndex: 4,
              cursor,
              pointerEvents: isAdding ? "none" : "auto",
            }}
            onClick={() => {
              if (isAdding) {
                onNoteClick(index);
              } else if (isEditMode && !isAdding) {
                onNoteDelete(index);
              }
            }}
            onMouseEnter={() => {
              if (isEditMode && !isAdding) {
                playNote(note.pitch);
                onNoteHover(index);
              }
            }}
            onMouseLeave={() => {
              if (isEditMode && !isAdding) {
                onNoteHover(null);
              }
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: color,
                borderRadius,
                border: isAdding ? border : "none",
                borderRight: isAdding ? borderRight : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: textColor,
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: "monospace",
                boxShadow: haloEffect,
                transition:
                  "box-shadow 0.1s ease-in-out, transform 0.1s ease-in-out",
                transform,
              }}
            >
              <span style={{ pointerEvents: "none", userSelect: "none" }}>
                {scaleDegree}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

const NoteEditor = ({
  score: initialScore,
  onScoreChange,
}: {
  score: Score;
  onScoreChange: (score: Score) => void;
}) => {
  const { isPlaying, playingNotes, play, stop, playNote } = usePlayback();
  const [isEditMode, setIsEditMode] = useState(false);
  const [score, setScore] = useState(initialScore);
  const [hoverNote, setHoverNote] = useState<Note | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNote, setDragNote] = useState<Note | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);

  // Update parent when score changes
  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  // Reset hover state when edit mode is disabled
  useEffect(() => {
    if (!isEditMode) {
      setHoverNote(null);
      setIsDragging(false);
      setDragNote(null);
      setHoveredNoteIndex(null);
    }
  }, [isEditMode]);

  // Quantization functions

  const quantizeY = useCallback(
    (
      y: number,
      pitchToY: (pitch: number) => number,
      minPitch: number,
      maxPitch: number,
      tonic: number
    ) => {
      for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
        if (![0, 2, 4, 5, 7, 9, 11].includes((pitch - tonic + 12) % 12)) {
          continue;
        }
        const pitchY = pitchToY(pitch);

        if (pitchY < y) {
          return pitch;
        }
      }

      return maxPitch;
    },
    []
  );

  // Fine-grained quantization for 16th notes
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

      // Find closest time point <= second for start
      let start = 0;
      for (let i = fineTimePoints.length - 1; i >= 0; i--) {
        if (fineTimePoints[i] <= second) {
          start = fineTimePoints[i];
          break;
        }
      }

      return start;
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

  const handleNoteDelete = useCallback(
    (index: number) => {
      // Remove the note from the score
      const newNotes = score.notes.filter((_, i) => i !== index);
      setScore({ ...score, notes: newNotes });

      // Reset hover state to prevent stale index references
      setHoveredNoteIndex(null);
    },
    [score]
  );

  const handleDescriptionChange = useCallback(
    (newDescription: string) => {
      setScore({ ...score, description: newDescription });
    },
    [score]
  );

  const {
    measures,
    beats,
    gridHeight,
    gridWidth,
    secondToX,
    pitchToY,
    minPitch,
    maxPitch,
  } = useMemo(() => {
    const highestNoteEnd =
      isEditMode || score.notes.length === 0
        ? 5
        : Math.max(...score.notes.map((note) => note.end));

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

    // Calculate dynamic dimensions - use hardcoded values when editing, calculated when not
    const minPitch =
      isEditMode || score.notes.length === 0
        ? 36 + score.tonic
        : Math.min(...score.notes.map((note) => note.pitch));
    const maxPitch =
      isEditMode || score.notes.length === 0
        ? 84 + score.tonic
        : Math.max(...score.notes.map((note) => note.pitch));
    const gridHeight =
      (maxPitch - minPitch) * PITCH_DISTANCE + NOTE_HEIGHT + HEADER_HEIGHT;
    const gridWidth = lastMeasure * PX_PER_SECOND; // Use lastMeasure instead of highestNoteEnd

    // Create functions
    const secondToX = (second: number) => second * PX_PER_SECOND;

    // pitchToY: minPitch gets maxY (container height), higher pitches get lower Y values
    const pitchToY = (pitch: number) => {
      return HEADER_HEIGHT + (maxPitch - pitch) * PITCH_DISTANCE;
    };

    return {
      measures,
      beats,
      gridHeight,
      gridWidth,
      secondToX,
      pitchToY,
      minPitch,
      maxPitch,
    };
  }, [score, isEditMode]);

  // Helper function to extract and quantize mouse coordinates
  const quantizeMouseToMusic = useCallback(
    (e: React.MouseEvent, targetElement: HTMLElement) => {
      const rect = targetElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const start = quantizeXFine(x, measures, beats);
      const end = start + EIGHTH_NOTE_DURATION;
      const pitch = quantizeY(y, pitchToY, minPitch, maxPitch, score.tonic);

      return { start, end, pitch, x, y };
    },
    [
      quantizeXFine,
      measures,
      beats,
      quantizeY,
      pitchToY,
      minPitch,
      maxPitch,
      score.tonic,
    ]
  );

  return (
    <div style={{ marginLeft: "30px" }}>
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

      {/* Flexbox layout: Description (200px) + Grid (rest) */}
      <div style={{ display: "flex", gap: "100px" }}>
        {/* Description column - 200px fixed */}

        {/* Grid column - takes remaining space */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: `${gridWidth}px`,
              height: `${gridHeight}px`,
              position: "relative",
            }}
          >
            <Grid
              measures={measures}
              beats={beats}
              secondToX={secondToX}
              gridHeight={gridHeight}
              gridWidth={gridWidth}
              score={score}
              pitchToY={pitchToY}
              minPitch={minPitch}
              maxPitch={maxPitch}
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
                  const { start, end, pitch } = quantizeMouseToMusic(
                    e,
                    e.currentTarget
                  );

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
                }}
                onMouseMove={(e) => {
                  if (isDragging && dragNote) {
                    // During drag: only update end position with fine quantization
                    const { end: newEnd } = quantizeMouseToMusic(
                      e,
                      e.currentTarget
                    );

                    // Ensure end is not before start
                    const finalEnd = Math.max(newEnd, dragNote.start + 0.0625); // Minimum 16th note length

                    const updatedDragNote: Note = {
                      ...dragNote,
                      end: finalEnd,
                    };
                    setDragNote(updatedDragNote);
                  } else {
                    // Normal hover behavior when not dragging
                    const { start, end, pitch } = quantizeMouseToMusic(
                      e,
                      e.currentTarget
                    );

                    // Only update if the note properties have actually changed
                    if (
                      !hoverNote ||
                      hoverNote.start !== start ||
                      hoverNote.end !== end ||
                      hoverNote.pitch !== pitch
                    ) {
                      const newHoverNote: Note = {
                        start,
                        end,
                        pitch,
                        state: "adding",
                      };
                      setHoverNote(newHoverNote);
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
                  }
                }}
                onMouseLeave={() => {
                  if (!isDragging) {
                    setHoverNote(null);
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
              isEditMode={isEditMode}
              playNote={playNote}
              onNoteDelete={handleNoteDelete}
              hoveredNoteIndex={hoveredNoteIndex}
              onNoteHover={setHoveredNoteIndex}
            />
          </div>
        </div>

        <div style={{ width: "200px", flexShrink: 0 }}>
          {isEditMode ? (
            <textarea
              value={score.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              style={{
                width: "100%",
                height: "100px",
                backgroundColor: "#333",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "4px",
                padding: "8px",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                resize: "vertical",
              }}
              placeholder="Enter description..."
            />
          ) : (
            <div
              style={{
                color: "#fff",
                fontSize: "16px",
                fontFamily: "Arial, sans-serif",
                lineHeight: "1.4",
                wordWrap: "break-word",
              }}
            >
              {score.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [appScores, setAppScores] = useState(scores);

  const handleScoreChange = useCallback(
    (index: number) => (updatedScore: Score) => {
      setAppScores((prev) =>
        prev.map((score, i) => (i === index ? updatedScore : score))
      );
    },
    []
  );

  return (
    <div
      style={{
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        gap: "20px",
      }}
    >
      {appScores.map((score, index) => (
        <div
          key={index}
          style={{ display: "flex", justifyContent: "flex-start" }}
        >
          <NoteEditor score={score} onScoreChange={handleScoreChange(index)} />
        </div>
      ))}
    </div>
  );
}

export default App;
