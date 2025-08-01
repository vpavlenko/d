import { useMemo } from "react";
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

export const PITCH_DISTANCE = 6;
export const NOTE_HEIGHT = PITCH_DISTANCE * 2;

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

// Letter name mapping for pitch classes (using flats/sharps consistent with scale degrees)
const PITCH_CLASS_NAMES = [
  "C", // 0
  "D♭", // 1
  "D", // 2
  "E♭", // 3
  "E", // 4
  "F", // 5
  "F♯", // 6
  "G", // 7
  "A♭", // 8
  "A", // 9
  "B♭", // 10
  "B", // 11
];

// Function to get letter name from pitch class
const getPitchClassName = (pitchClass: number): string => {
  return PITCH_CLASS_NAMES[((pitchClass % 12) + 12) % 12];
};

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

export const RenderedNotes = ({
  score,
  secondToX,
  pitchToY,
  playingNotes,
  individuallyPlayingNotes,
  onNoteClick,
  isEditMode,
  playNote,
  onNoteDelete,
  hoveredNoteIndex,
  onNoteHover,
  editorId,
}: {
  score: Score;
  secondToX: (second: number) => number;
  pitchToY: (pitch: number) => number;
  playingNotes: Set<number>;
  individuallyPlayingNotes: Set<number>;
  onNoteClick: (index: number) => void;
  isEditMode?: boolean;
  playNote: (
    pitch: number,
    duration: number,
    noteIndex?: number,
    editorId?: string
  ) => void;
  onNoteDelete: (index: number) => void;
  hoveredNoteIndex?: number | null;
  onNoteHover: (index: number | null) => void;
  editorId: string;
}) => {
  // Find the index of the leftmost (earliest start time) scale degree 1 note,
  // with lowest pitch as tiebreaker
  const firstTonicIndex = useMemo(() => {
    const tonicNotes = score.notes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => {
        const scaleDegree = getScaleDegree(note.pitch, score.tonic);
        return scaleDegree === "1";
      });

    if (tonicNotes.length === 0) return -1;

    // Find the earliest start time
    const earliestStart = Math.min(...tonicNotes.map(({ note }) => note.start));

    // Among notes with earliest start time, find the one with lowest pitch
    const earliestTonicNotes = tonicNotes.filter(
      ({ note }) => note.start === earliestStart
    );
    const lowestPitchNote = earliestTonicNotes.reduce((lowest, current) =>
      current.note.pitch < lowest.note.pitch ? current : lowest
    );

    return lowestPitchNote.index;
  }, [score.notes, score.tonic]);

  return (
    <>
      {score.notes.map((note, index) => {
        const colorIndex = ((note.pitch % 12) + 12 - score.tonic) % 12;
        const color = COLORS[colorIndex];
        const scaleDegree = getScaleDegree(note.pitch, score.tonic);

        // Show letter name for the first tonic note, scale degree for all others
        const displayText =
          scaleDegree === "1" && index === firstTonicIndex
            ? getPitchClassName(score.tonic)
            : scaleDegree;

        const textColor = BRIGHT_SCALE_DEGREES.includes(scaleDegree)
          ? "#000000"
          : "#ffffff";

        // Check if note is playing either in sequence or individually (by note index)
        const isPlaying =
          playingNotes.has(index) || individuallyPlayingNotes.has(index);
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
              if (!isAdding) {
                // Always play note on hover (both edit and non-edit mode)
                // Pass noteIndex and editorId for editor-specific note animation tracking
                // Use actual note duration (end - start) instead of fixed 0.3 seconds
                playNote(note.pitch, note.end - note.start, index, editorId);
                // Only track hover state for edit mode (for delete scaling)
                if (isEditMode) {
                  onNoteHover(index);
                }
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
                fontSize: `${NOTE_HEIGHT + 1}px`,
                fontWeight: "bold",
                boxShadow: haloEffect,
                transition: "transform 0.1s ease-in-out", // No transition on box-shadow for immediate animation
                transform,
              }}
            >
              <span
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                  transform: "translateY(-0.5px)",
                }}
              >
                {displayText}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};
