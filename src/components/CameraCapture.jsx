import React, { useRef, useState, useEffect } from "react";
import "./CameraCapture.css";

/* ─── helpers ─────────────────────────────────────────────────────────── */

// Only block strings that are clearly HTTP/Java errors — NOT real AI text
function isErrorText(text) {
  if (!text || text.trim() === "") return false;
  const t = text.toLowerCase();
  return (
    t.includes("400 bad request")   ||
    t.includes("500 internal")      ||
    t.includes("api_key_invalid")   ||
    t.includes("googleapis.com")    ||
    t.includes("invalidargument")   ||
    t.includes("httpservletrequest")||
    t.includes("nested exception")  ||
    t.includes("org.springframework")
  );
}

function compressImage(dataUrl, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

/* ─── component ───────────────────────────────────────────────────────── */

function CameraCapture({ onDetect }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef   = useRef(null);

  // "idle" | "camera" | "preview"
  const [mode,      setMode]      = useState("idle");
  const [preview,   setPreview]   = useState(null);
  const [camError,  setCamError]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMsg,     setAiMsg]     = useState({ text: "", type: "" });

  // ── KEY FIX: attach stream AFTER React renders the <video> element ──────
  // When mode becomes "camera", React re-renders first (video mounts),
  // then this effect runs — videoRef.current is guaranteed to exist here.
  useEffect(() => {
    if (mode === "camera" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err =>
        console.warn("Video play error:", err)
      );
    }
  }, [mode]);   // runs every time mode changes

  // ── Clean up stream when component unmounts ──────────────────────────────
  useEffect(() => {
    return () => stopStream();
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  /* ── Open camera ── */
  const openCamera = async () => {
    setCamError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Browser does not support camera. Please use Upload Image.");
      return;
    }

    try {
      // Try rear camera first, fall back to any
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setMode("camera");   // <-- triggers useEffect above after re-render

    } catch (err) {
      console.error("Camera error:", err.name);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamError(
          "Camera permission denied. Click the 🔒 icon in the address bar → allow Camera, then try again."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCamError(
          "Camera is in use by another app or tab. Close other tabs using the camera, then try again."
        );
      } else if (err.name === "NotFoundError") {
        setCamError("No camera detected on this device. Please use Upload Image.");
      } else {
        setCamError("Camera could not start (" + err.name + "). Try Upload Image instead.");
      }
    }
  };

  /* ── Capture photo from live video ── */
  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopStream();
    setPreview(dataUrl);
    setMode("preview");
    runAI(dataUrl);
  };

  /* ── Cancel camera ── */
  const closeCamera = () => {
    stopStream();
    setMode("idle");
  };

  /* ── File upload ── */
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setMode("preview");
      runAI(reader.result, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ── Send to AI backend ── */
  const runAI = async (rawDataUrl, fileName = "issue.jpg") => {
    setAnalyzing(true);
    setAiMsg({ text: "", type: "" });

    let compressed = rawDataUrl;
    try { compressed = await compressImage(rawDataUrl); } catch {}

    try {
      const blob = await (await fetch(compressed)).blob();
      const fd   = new FormData();
      fd.append("image", blob, fileName);

      const res = await fetch("https://tt-backend-j73r.onrender.com/analyze", {
        method: "POST",
        body:   fd
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Backend explicitly signalled an error
      if (data.aiError && data.aiError.trim().length > 0) {
        setAiMsg({
          text: "⚠️ " + data.aiError,
          type: "warn"
        });
        if (onDetect) onDetect("", "", compressed);
        setAnalyzing(false);
        return;
      }

      // Sanity check: make sure fields don't contain raw error text
      if (isErrorText(data.issueType) || isErrorText(data.description)) {
        setAiMsg({
          text: "⚠️ AI could not analyse this image. Please fill in the fields manually.",
          type: "warn"
        });
        if (onDetect) onDetect("", "", compressed);
        setAnalyzing(false);
        return;
      }

      // Success
      setAiMsg({
        text: "✅ AI detected the issue — review the fields below before submitting.",
        type: "success"
      });
      if (onDetect) onDetect(
        data.issueType   || "",
        data.description || "",
        compressed
      );

    } catch (err) {
      console.warn("AI fetch error:", err.message);
      setAiMsg({
        text: "⚠️ AI unavailable — fill in Issue Type and Description manually.",
        type: "warn"
      });
      if (onDetect) onDetect("", "", compressed);
    }

    setAnalyzing(false);
  };

  /* ── Clear everything ── */
  const clearAll = () => {
    stopStream();
    setMode("idle");
    setPreview(null);
    setAiMsg({ text: "", type: "" });
    setCamError("");
    if (onDetect) onDetect("", "", null);
  };

  /* ── Render ── */
  return (
    <div className="camera-wrap">

      {/* ══ IDLE ══ */}
      {mode === "idle" && (
        <div className="upload-area">
          <button type="button" className="cam-btn cam-open" onClick={openCamera}>
            📷 Open Camera
          </button>

          <div className="divider"><span>or</span></div>

          <button type="button" className="cam-btn cam-upload"
            onClick={() => fileRef.current?.click()}>
            📁 Upload Image
          </button>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={handleUpload} hidden />

          <p className="hint">
            Image is optional — AI will auto-detect the issue ✨
          </p>

          {camError && (
            <div className="cam-error-box">
              ⚠️ {camError}
            </div>
          )}
        </div>
      )}

      {/* ══ CAMERA LIVE ══ */}
      {mode === "camera" && (
        <div className="camera-live">
          {/* video element is in the DOM now — useEffect attaches the stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="live-video"
          />
          <div className="cam-controls">
            <button type="button" className="cam-btn capture-btn"
              onClick={capturePhoto}>
              📸 Take Photo
            </button>
            <button type="button" className="cam-btn close-btn"
              onClick={closeCamera}>
              ✕ Cancel
            </button>
          </div>
          <p className="cam-hint">Camera is live — click Take Photo when ready</p>
        </div>
      )}

      {/* ══ PREVIEW ══ */}
      {mode === "preview" && (
        <div className="preview-box">
          <img src={preview} alt="Issue" className="preview-img" />

          {analyzing && (
            <div className="ai-badge analyzing">
              <span className="spinner" /> Analysing with AI…
            </div>
          )}

          {!analyzing && aiMsg.text && (
            <div className={`ai-badge ${aiMsg.type}`}>
              {aiMsg.text}
            </div>
          )}

          <button type="button" className="clear-btn" onClick={clearAll}>
            ✕ Remove &amp; retake
          </button>
        </div>
      )}

      <canvas ref={canvasRef} hidden />
    </div>
  );
}

export default CameraCapture;
