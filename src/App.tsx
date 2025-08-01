import { useMemo, useState, useCallback, useEffect } from "react";
import { Play, Square, Pencil, Copy } from "lucide-react";
import { usePlayback } from "./usePlayback";
import { Grid } from "./Grid";
import type { Note, Score, VersionedScores } from "./types";
import { defaultScores } from "./scores";

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

// localStorage utilities
const SCORES_STORAGE_KEY = "music-scores";

const loadScoresFromStorage = (): VersionedScores => {
  try {
    const stored = localStorage.getItem(SCORES_STORAGE_KEY);
    if (stored) {
      const parsedData = JSON.parse(stored);
      // Handle migration from old format (Score[]) to new format (VersionedScores)
      if (Array.isArray(parsedData)) {
        return { scores: parsedData, version: 1 };
      }
      return parsedData;
    }
    return defaultScores;
  } catch (error) {
    console.error("Failed to load scores from localStorage:", error);
    return defaultScores;
  }
};

const saveScoresToStorage = (versionedScores: VersionedScores): void => {
  try {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(versionedScores));
  } catch (error) {
    console.error("Failed to save scores to localStorage:", error);
  }
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
                {displayText}
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
  editorId,
  isPlaying,
  playingNotes,
  play,
  stop,
  playNote,
}: {
  score: Score;
  onScoreChange: (score: Score) => void;
  editorId: string;
  isPlaying: boolean;
  playingNotes: Set<number>;
  play: (score: Score, editorId: string) => Promise<void>;
  stop: () => void;
  playNote: (pitch: number, duration?: number) => void;
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [score, setScore] = useState(initialScore);
  const [hoverNote, setHoverNote] = useState<Note | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNote, setDragNote] = useState<Note | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);

  // Sync with parent score when it changes from outside
  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  // Update parent only when we make internal changes (not when syncing from parent)
  const notifyParentOfChange = useCallback(
    (newScore: Score) => {
      onScoreChange(newScore);
    },
    [onScoreChange]
  );

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
        const updatedScore = { ...score, notes: newNotes };
        setScore(updatedScore);
        notifyParentOfChange(updatedScore);
      }
    },
    [score, notifyParentOfChange]
  );

  const handleNoteDelete = useCallback(
    (index: number) => {
      // Remove the note from the score
      const newNotes = score.notes.filter((_, i) => i !== index);
      const updatedScore = { ...score, notes: newNotes };
      setScore(updatedScore);
      notifyParentOfChange(updatedScore);

      // Reset hover state to prevent stale index references
      setHoveredNoteIndex(null);
    },
    [score, notifyParentOfChange]
  );

  const handleDescriptionChange = useCallback(
    (newDescription: string) => {
      const updatedScore = { ...score, description: newDescription };
      setScore(updatedScore);
      notifyParentOfChange(updatedScore);
    },
    [score, notifyParentOfChange]
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
    <div style={{ marginLeft: "30px", marginBottom: "100px" }}>
      {/* Control buttons */}
      <div style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
        <button
          onClick={() => (isPlaying ? stop() : play(score, editorId))}
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
                    const updatedScore = { ...score, notes: newNotes };
                    setScore(updatedScore);
                    notifyParentOfChange(updatedScore);

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
  const [versionedScores, setVersionedScores] = useState<VersionedScores>(
    () => {
      const loaded = loadScoresFromStorage();
      return loaded;
    }
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [scoresOrigin, setScoresOrigin] = useState<"source" | "localStorage">(
    "localStorage"
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Global playback system - singleton for all NoteEditors
  const {
    isPlaying,
    currentPlayingEditorId,
    getPlayingNotesForEditor,
    play,
    stop,
    playNote,
  } = usePlayback();

  // Version comparison and origin tracking on initial load
  useEffect(() => {
    const storedData = loadScoresFromStorage();
    if (defaultScores.version > storedData.version) {
      setVersionedScores(defaultScores);
      setScoresOrigin("source");
      setHasChanges(false); // No changes yet when loading from source
    } else {
      setScoresOrigin("localStorage");
      setHasChanges(false); // No changes yet
    }
  }, []);

  const handleScoreChange = useCallback(
    (index: number) => (updatedScore: Score) => {
      // Determine if we should save based on current state
      const shouldSave = scoresOrigin === "localStorage" || !hasChanges;

      setVersionedScores((prev) => {
        const updated = {
          ...prev,
          scores: prev.scores.map((score, i) =>
            i === index ? updatedScore : score
          ),
          version: shouldSave ? prev.version + 1 : prev.version,
        };

        // Save to localStorage if needed
        if (shouldSave) {
          saveScoresToStorage(updated);
        }

        return updated;
      });

      // Update state flags after the main state update
      setHasChanges(true);
      if (shouldSave) {
        setScoresOrigin("localStorage");
      }
    },
    [scoresOrigin, hasChanges]
  );

  const copyScoresAsJson = useCallback(async () => {
    try {
      // Create a copy with bumped version only for clipboard
      const copyData = {
        ...versionedScores,
        version: versionedScores.version + 1,
      };
      const jsonString = JSON.stringify(copyData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy scores:", error);
    }
  }, [versionedScores]);

  return (
    <div
      style={{
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        gap: "20px",
        minHeight: "100vh",
      }}
    >
      {versionedScores.scores.map((score, index) => {
        const editorId = `editor-${index}`;
        const editorIsPlaying =
          isPlaying && currentPlayingEditorId === editorId;
        const editorPlayingNotes = getPlayingNotesForEditor(editorId);

        return (
          <div
            key={index}
            style={{
              display: "flex",
            }}
          >
            <NoteEditor
              score={score}
              onScoreChange={handleScoreChange(index)}
              editorId={editorId}
              isPlaying={editorIsPlaying}
              playingNotes={editorPlayingNotes}
              play={play}
              stop={stop}
              playNote={playNote}
            />
          </div>
        );
      })}

      {/* Copy button */}
      <button
        onClick={copyScoresAsJson}
        style={{
          position: "fixed",
          bottom: "70px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          backgroundColor: copySuccess ? "#333" : "transparent",
          color: copySuccess ? "#fff" : "#ccc",
          border: "1px solid #666",
          borderRadius: "4px",
          cursor: "pointer",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!copySuccess) {
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "#999";
          }
        }}
        onMouseLeave={(e) => {
          if (!copySuccess) {
            e.currentTarget.style.color = "#ccc";
            e.currentTarget.style.borderColor = "#666";
          }
        }}
      >
        <Copy size={16} />
        {copySuccess ? "Copied!" : "Copy All Scores as JSON"}
      </button>

      {/* Version display */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#333",
          color: "#ccc",
          padding: "8px 12px",
          borderRadius: "4px",
          border: "1px solid #666",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        v{versionedScores.version} ({scoresOrigin})
      </div>
    </div>
  );
}

export default App;
