import React, { useState, useCallback, useEffect } from "react";
import { Copy } from "lucide-react";
import type { VersionedScores, Score } from "./types";
import { defaultScores } from "./scores";

// localStorage utilities
export const SCORES_STORAGE_KEY = "music-scores";

export const loadScoresFromStorage = (): VersionedScores => {
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

export const saveScoresToStorage = (versionedScores: VersionedScores): void => {
  try {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(versionedScores));
  } catch (error) {
    console.error("Failed to save scores to localStorage:", error);
  }
};

interface ScoreStorageHook {
  versionedScores: VersionedScores;
  handleScoreChange: (index: number) => (updatedScore: Score) => void;
  ScoreStorageUI: React.FC;
}

export const useScoreStorage = (): ScoreStorageHook => {
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

  const ScoreStorageUI: React.FC = () => (
    <>
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
    </>
  );

  return {
    versionedScores,
    handleScoreChange,
    ScoreStorageUI,
  };
};
