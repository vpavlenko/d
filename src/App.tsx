import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { Play, Square, Pencil, Piano } from "lucide-react";
import { usePlayback } from "./usePlayback";
import { Grid } from "./Grid";
import type { Note, Score } from "./types";
import { useScoreStorage } from "./scoreStorage";
import { RenderedNotes, NOTE_HEIGHT } from "./RenderedNotes";

// Check if we should show editing/storage UI
const shouldShowEditingUI = (): boolean => {
  // Check if running on localhost
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";

  // Check for ?edit=1 flag
  const urlParams = new URLSearchParams(window.location.search);
  const hasEditFlagEnabled = urlParams.get("edit") === "1";
  const hasEditFlagDisabled = urlParams.get("edit") === "0";

  return !hasEditFlagDisabled && (isLocalhost || hasEditFlagEnabled);
};

export const MIN_PX_PER_SECOND = 100;
export const MAX_PX_PER_SECOND = 200;
export const EIGHTH_NOTE_DURATION = 0.125; // 1/8th note in seconds
export const PITCH_DISTANCE = 6;
export const HEADER_HEIGHT = 15;

// Layout constants
const DESCRIPTION_WIDTH = 400;
const BUTTON_WIDTH = 60; // Approximate width for play and edit buttons
const LAYOUT_GAP = 0; // Current gap between columns

export interface NoteEditorRef {
  exitEditMode: () => void;
}

const NoteEditor = forwardRef<
  NoteEditorRef,
  {
    score: Score;
    onScoreChange: (score: Score) => void;
    editorId: string;
    isPlaying: boolean;
    playingNotes: Set<number>;
    individuallyPlayingNotes: Set<number>;
    play: (score: Score, editorId: string) => Promise<void>;
    stop: () => void;
    playNote: (
      pitch: number,
      duration: number,
      noteIndex?: number,
      editorId?: string
    ) => void;
    onAddNewScore: () => void;
    showEditingUI: boolean;
  }
>(
  (
    {
      score: initialScore,
      onScoreChange,
      editorId,
      isPlaying,
      playingNotes,
      individuallyPlayingNotes,
      play,
      stop,
      playNote,
      onAddNewScore,
      showEditingUI,
    },
    ref
  ) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [score, setScore] = useState(initialScore);
    const [hoverNote, setHoverNote] = useState<Note | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragNote, setDragNote] = useState<Note | null>(null);
    const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(
      null
    );

    // Responsive layout state
    const [layoutType, setLayoutType] = useState<"horizontal" | "vertical">(
      "horizontal"
    );
    const [pxPerSecond, setPxPerSecond] = useState(MIN_PX_PER_SECOND);
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

    // Sync with parent score when it changes from outside
    useEffect(() => {
      setScore(initialScore);
    }, [initialScore]);

    // Calculate responsive layout
    useEffect(() => {
      const calculateLayout = () => {
        // Calculate total width needed for horizontal layout
        const fiveSecondsWidth = 5 * MIN_PX_PER_SECOND;
        const totalButtonsWidth = 2 * BUTTON_WIDTH; // play + edit buttons
        const totalRequiredWidth =
          DESCRIPTION_WIDTH + totalButtonsWidth + fiveSecondsWidth + LAYOUT_GAP;

        if (totalRequiredWidth > viewportWidth) {
          // Use vertical layout
          setLayoutType("vertical");
          // Calculate PX_PER_SECOND to fit 5 seconds into 98% of viewport width
          const availableWidth = viewportWidth * 0.98;
          const dynamicPxPerSecond = availableWidth / 5;
          setPxPerSecond(Math.max(MIN_PX_PER_SECOND, dynamicPxPerSecond));
        } else {
          // Use horizontal layout
          setLayoutType("horizontal");
          // Calculate max PX_PER_SECOND that still fits (not exceeding MAX_PX_PER_SECOND)
          const availableWidthForGrid =
            viewportWidth - DESCRIPTION_WIDTH - totalButtonsWidth - LAYOUT_GAP;
          const maxPossiblePxPerSecond = availableWidthForGrid / 5;
          const optimalPxPerSecond = Math.min(
            MAX_PX_PER_SECOND,
            maxPossiblePxPerSecond
          );
          setPxPerSecond(Math.max(MIN_PX_PER_SECOND, optimalPxPerSecond));
        }
      };

      calculateLayout();
    }, [viewportWidth]);

    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        setViewportWidth(window.innerWidth);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    // Expose exitEditMode method to parent
    useImperativeHandle(
      ref,
      () => ({
        exitEditMode: () => {
          setIsEditMode(false);
        },
      }),
      []
    );

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

        const second = x / pxPerSecond;

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
      [pxPerSecond]
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
      const gridWidth = lastMeasure * pxPerSecond; // Use dynamic pxPerSecond

      // Create functions
      const secondToX = (second: number) => second * pxPerSecond; // Use dynamic pxPerSecond

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
    }, [score, isEditMode, pxPerSecond]);

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
      <div style={{ marginBottom: "0px" }}>
        {layoutType === "horizontal" ? (
          /* Horizontal layout: Description + Play Button + Grid + Edit Button */
          <div style={{ display: "flex", gap: "0px" }}>
            {/* Description column - 400px fixed */}
            <div
              style={{
                width: "400px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
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
                    lineHeight: "1.4",
                    wordWrap: "break-word",
                  }}
                >
                  {score.description}
                </div>
              )}
            </div>

            {/* Play button column - shrink to content, full height */}
            <div
              style={{
                flex: 0,
                display: "flex",
              }}
            >
              <button
                onClick={() => (isPlaying ? stop() : play(score, editorId))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 18px",
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#888";
                }}
              >
                {isPlaying ? <Square size={20} /> : <Play size={20} />}
              </button>
            </div>

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
                        const finalEnd = Math.max(
                          newEnd,
                          dragNote.start + 0.0625
                        ); // Minimum 16th note length

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
                  individuallyPlayingNotes={individuallyPlayingNotes}
                  onNoteClick={handleNoteClick}
                  isEditMode={isEditMode}
                  playNote={playNote}
                  onNoteDelete={handleNoteDelete}
                  hoveredNoteIndex={hoveredNoteIndex}
                  onNoteHover={setHoveredNoteIndex}
                  editorId={editorId}
                />
              </div>
            </div>

            {/* Edit button column - shrink to content, full height */}
            <div
              style={{
                flex: 0,
                display: "flex",
              }}
            >
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 18px",
                  backgroundColor: isEditMode ? "#fff" : "transparent",
                  color: isEditMode ? "#000" : "#888",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                  height: "100%",
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
                    e.currentTarget.style.color = "#888";
                  }
                }}
              >
                <Pencil size={20} />
              </button>
            </div>
          </div>
        ) : (
          /* Vertical layout: Description with buttons to right, Grid below */
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* Top row: Description + Buttons */}
            <div
              style={{ display: "flex", gap: "10px", alignItems: "stretch" }}
            >
              {/* Description - takes most space */}
              <div style={{ flex: 1 }}>
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
                      fontSize: "14px",
                      resize: "vertical",
                      margin: "100px 0 200px 0",
                    }}
                    placeholder="Enter description..."
                  />
                ) : (
                  <div
                    style={{
                      color: "#fff",
                      fontSize: "16px",
                      lineHeight: "1.4",
                      wordWrap: "break-word",
                      margin: "20px 0",
                    }}
                  >
                    {score.description}
                  </div>
                )}
              </div>

              {/* Buttons row */}
              <div
                style={{ display: "flex", gap: "5px", alignItems: "stretch" }}
              >
                {/* Play button */}
                <button
                  onClick={() => (isPlaying ? stop() : play(score, editorId))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 18px",
                    backgroundColor: "transparent",
                    color: "#888",
                    border: "none",
                    cursor: "pointer",
                    transition: "color 0.2s ease",
                    minHeight: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#888";
                  }}
                >
                  {isPlaying ? <Square size={20} /> : <Play size={20} />}
                </button>

                {/* Edit button */}
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 18px",
                    backgroundColor: isEditMode ? "#fff" : "transparent",
                    color: isEditMode ? "#000" : "#888",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "4px",
                    transition: "all 0.2s ease",
                    minHeight: "100%",
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
                      e.currentTarget.style.color = "#888";
                    }
                  }}
                >
                  <Pencil size={20} />
                </button>
              </div>
            </div>

            {/* Bottom row: Grid */}
            <div style={{ width: "100%" }}>
              <div
                style={{
                  width: `${gridWidth}px`,
                  height: `${gridHeight}px`,
                  position: "relative",
                  margin: "0 auto", // Center the grid
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
                        const finalEnd = Math.max(
                          newEnd,
                          dragNote.start + 0.0625
                        ); // Minimum 16th note length

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
                  individuallyPlayingNotes={individuallyPlayingNotes}
                  onNoteClick={handleNoteClick}
                  isEditMode={isEditMode}
                  playNote={playNote}
                  onNoteDelete={handleNoteDelete}
                  hoveredNoteIndex={hoveredNoteIndex}
                  onNoteHover={setHoveredNoteIndex}
                  editorId={editorId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Add new score button - only show in editing mode */}
        {showEditingUI && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={onAddNewScore}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                color: "#ccc",
                border: "1px solid #666",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "#999";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#ccc";
                e.currentTarget.style.borderColor = "#666";
              }}
            >
              Add a new score
            </button>
          </div>
        )}
      </div>
    );
  }
);

NoteEditor.displayName = "NoteEditor";

function App() {
  // Score storage management
  const { versionedScores, handleScoreChange, addNewScore, ScoreStorageUI } =
    useScoreStorage();

  // Global playback system - singleton for all NoteEditors
  const {
    isPlaying,
    currentPlayingEditorId,
    getPlayingNotesForEditor,
    getIndividuallyPlayingNotesForEditor,
    play,
    stop,
    playNote,
    audioContextAllowed,
    enableAudioContext,
  } = usePlayback();

  // Check if we should show editing UI
  const showEditingUI = shouldShowEditingUI();

  // Track refs for all NoteEditor instances to handle Esc key
  const noteEditorRefs = useRef<(NoteEditorRef | null)[]>([]);

  // Initialize refs array when scores change
  useEffect(() => {
    noteEditorRefs.current = noteEditorRefs.current.slice(
      0,
      versionedScores.scores.length
    );
  }, [versionedScores.scores.length]);

  // Handle Esc key to exit all editing modes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Exit edit mode on all editors
        noteEditorRefs.current.forEach((ref) => {
          if (ref) {
            ref.exitEditMode();
          }
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Show audio permission splash screen if AudioContext is not allowed
  if (audioContextAllowed === false) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontFamily: "monospace",
          gap: "30px",
          cursor: "pointer",
        }}
        onClick={enableAudioContext}
      >
        <Piano size={120} color="#fff" />
        <div style={{ fontSize: "32px", fontWeight: "bold" }}>Let's play</div>
        <div style={{ fontSize: "16px", color: "#ccc" }}>
          Click anywhere to enable audio
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        minHeight: "100vh",
        marginTop: "30px",
      }}
    >
      {versionedScores.scores.map((score, index) => {
        const editorId = `editor-${index}`;
        const editorIsPlaying =
          isPlaying && currentPlayingEditorId === editorId;
        const editorPlayingNotes = getPlayingNotesForEditor(editorId);
        const editorIndividuallyPlayingNotes =
          getIndividuallyPlayingNotesForEditor(editorId);

        return (
          <div
            key={index}
            style={{
              display: "flex",
              margin: "auto",
              marginBottom: "80px",
            }}
          >
            <NoteEditor
              ref={(ref) => {
                noteEditorRefs.current[index] = ref;
              }}
              score={score}
              onScoreChange={handleScoreChange(index)}
              editorId={editorId}
              isPlaying={editorIsPlaying}
              playingNotes={editorPlayingNotes}
              individuallyPlayingNotes={editorIndividuallyPlayingNotes}
              play={play}
              stop={stop}
              playNote={playNote}
              onAddNewScore={() => addNewScore(score, index)}
              showEditingUI={showEditingUI}
            />
          </div>
        );
      })}

      {/* Score storage UI (copy button and version display) - only show in editing mode */}
      {showEditingUI && <ScoreStorageUI />}
    </div>
  );
}

export default App;
