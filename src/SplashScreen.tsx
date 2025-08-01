interface LoadingProgress {
  startTime: number;
  totalSamples: number;
  loadedSamples: number;
  failedSamples: number;
  samples: Map<
    string,
    {
      status: "pending" | "loading" | "loaded" | "error";
      startTime?: number;
      endTime?: number;
      url?: string;
      error?: string;
    }
  >;
}

interface SplashScreenProps {
  loadingProgress: LoadingProgress | null;
}

export const SplashScreen = ({ loadingProgress }: SplashScreenProps) => {
  const progress = loadingProgress;
  const currentTime = Date.now();
  const elapsedSeconds = progress
    ? (currentTime - progress.startTime) / 1000
    : 0;

  // Calculate progress percentages
  const totalSamples = progress?.totalSamples || 30;
  const loadedSamples = progress?.loadedSamples || 0;
  const failedSamples = progress?.failedSamples || 0;
  const pendingSamples = totalSamples - loadedSamples - failedSamples;
  const progressPercent =
    totalSamples > 0 ? Math.round((loadedSamples / totalSamples) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "monospace",
        padding: "40px 20px",
        gap: "20px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "28px", color: "#fff", marginBottom: "8px" }}>
          🎹 Loading Salamander Grand Piano
        </div>
        <div style={{ fontSize: "16px", color: "#ccc" }}>
          {progressPercent}% complete • {elapsedSeconds.toFixed(1)}s elapsed
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: "100%", maxWidth: "600px", marginBottom: "20px" }}>
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#333",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              backgroundColor: failedSamples > 0 ? "#ff4444" : "#666",
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#999",
            marginTop: "4px",
          }}
        >
          <span>✅ {loadedSamples} loaded</span>
          <span>⏳ {pendingSamples} pending</span>
          <span style={{ color: failedSamples > 0 ? "#ff4444" : "#999" }}>
            ❌ {failedSamples} failed
          </span>
        </div>
      </div>

      {/* Network & System Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          width: "100%",
          maxWidth: "800px",
          fontSize: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#111",
            padding: "12px",
            borderRadius: "4px",
          }}
        >
          <div
            style={{ color: "#fff", fontWeight: "bold", marginBottom: "8px" }}
          >
            📊 Loading Statistics
          </div>
          <div style={{ color: "#ccc" }}>Total Samples: {totalSamples}</div>
          <div style={{ color: "#8f8" }}>Loaded: {loadedSamples}</div>
          <div style={{ color: "#ff4444" }}>Failed: {failedSamples}</div>
          <div style={{ color: "#888" }}>Pending: {pendingSamples}</div>
          <div style={{ color: "#ccc", marginTop: "4px" }}>
            Avg Speed:{" "}
            {loadedSamples > 0
              ? (loadedSamples / Math.max(elapsedSeconds, 0.1)).toFixed(1)
              : "0"}{" "}
            samples/sec
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#111",
            padding: "12px",
            borderRadius: "4px",
          }}
        >
          <div
            style={{ color: "#fff", fontWeight: "bold", marginBottom: "8px" }}
          >
            🌐 Network Info
          </div>
          <div style={{ color: "#ccc" }}>Base URL: tonejs.github.io</div>
          <div style={{ color: "#ccc" }}>Protocol: HTTPS</div>
          <div style={{ color: "#ccc" }}>CDN: GitHub Pages</div>
          <div style={{ color: "#ccc" }}>
            Connection: {navigator.onLine ? "Online" : "Offline"}
          </div>
          <div style={{ color: "#ccc" }}>
            Type:{" "}
            {(navigator as { connection?: { effectiveType?: string } })
              ?.connection?.effectiveType || "Unknown"}
          </div>
        </div>
      </div>

      {/* Individual Sample Status */}
      <div style={{ width: "100%", maxWidth: "1000px" }}>
        <div
          style={{
            color: "#fff",
            fontWeight: "bold",
            marginBottom: "12px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          🔍 Individual Sample Status
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "6px",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "8px",
            backgroundColor: "#111",
            borderRadius: "4px",
            border: "1px solid #333",
          }}
        >
          {progress ? (
            Array.from(progress.samples.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([noteName, sample]) => {
                const statusColor =
                  sample.status === "loaded"
                    ? "#8f8"
                    : sample.status === "error"
                    ? "#ff4444"
                    : sample.status === "loading"
                    ? "#ffa500"
                    : "#666";

                const statusIcon =
                  sample.status === "loaded"
                    ? "✅"
                    : sample.status === "error"
                    ? "❌"
                    : sample.status === "loading"
                    ? "⏳"
                    : "⏸️";

                const duration =
                  sample.endTime && sample.startTime
                    ? ` ${sample.endTime - sample.startTime}ms`
                    : "";

                return (
                  <div
                    key={noteName}
                    style={{
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 4px",
                      backgroundColor:
                        sample.status === "error" ? "#330000" : "transparent",
                      borderRadius: "2px",
                      minWidth: 0, // Allow text truncation
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>{statusIcon}</span>
                    <span
                      style={{
                        color: statusColor,
                        fontWeight: "bold",
                        minWidth: "28px",
                        flexShrink: 0,
                      }}
                    >
                      {noteName}
                    </span>
                    <span
                      style={{
                        color: "#666",
                        fontSize: "9px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                      title={sample.error || `${sample.url}${duration}`}
                    >
                      {sample.error || duration}
                    </span>
                  </div>
                );
              })
          ) : (
            <div
              style={{
                color: "#666",
                textAlign: "center",
                gridColumn: "1 / -1",
              }}
            >
              Initializing sample tracking...
            </div>
          )}
        </div>
      </div>

      {/* Debug Console */}
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          fontSize: "10px",
          color: "#666",
          textAlign: "center",
          borderTop: "1px solid #333",
          paddingTop: "12px",
        }}
      >
        💡 Debug Tip: Open browser console (F12) for detailed loading logs
        <br />
        🔧 If samples fail to load, check network connectivity and CORS settings
      </div>
    </div>
  );
};
