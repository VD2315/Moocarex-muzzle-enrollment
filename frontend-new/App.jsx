import React, { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.startsWith('172.');

const API_BASE = isLocal
  ? `http://${window.location.hostname}:8000`
  : 'http://35.172.180.49:8000';

/* ─── tiny feedback store (localStorage) ─── */
async function saveFeedback(entry) {
  try {
    await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scan_id: entry.result.scan_id,
        feedback: entry.vote === "yes"
      })
      
    })

    console.log("Feedback saved")
  }
  catch(err) {
    console.error("Feedback error:", err)
  }
}



/* ─── Spinner ─── */
function Spinner({ size = 28, color = '#0F766E' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ animation: 'spin 0.8s linear infinite', display: 'block' }}>
      <circle cx="14" cy="14" r="11" fill="none" stroke="#E2E8F0" strokeWidth="3" />
      <path d="M14 3 A11 11 0 0 1 25 14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Confidence bar ─── */
function ConfBar({ value }) {
  const pct = parseFloat(value)
  const color = pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

/* ─── Feedback widget ─── */
function FeedbackWidget({ result }) {
  const [voted, setVoted] = useState(null)
  function vote(v) {
    setVoted(v)
    saveFeedback({ result, vote: v })
  }
  return (
    <div className="feedback-row">
      <span className="feedback-label">Was this result correct?</span>
      <div className="feedback-btns">
        <button
          className={`fb-btn ${voted === 'yes' ? 'fb-yes-active' : ''}`}
          onClick={() => vote('yes')}
          disabled={voted !== null}
          aria-label="Yes, correct"
        >
          👍 Yes
        </button>
        <button
          className={`fb-btn ${voted === 'no' ? 'fb-no-active' : ''}`}
          onClick={() => vote('no')}
          disabled={voted !== null}
          aria-label="No, incorrect"
        >
          👎 No
        </button>
      </div>
      {voted && <p className="feedback-thanks">{voted === 'yes' ? 'Thanks for confirming!' : 'Noted — we\'ll improve.'}</p>}
    </div>
  )
}

/* ─── Result: Success ─── */
function ResultSuccess({ data, onRescan }) {
  return (
    <div className="result-card fade-in">
     <div className="save-banner">
      <span className="save-icon">✓</span>
       <div>
       <p className="save-title">Muzzle image saved successfully</p>
       <p className="save-sub">
        The image has been stored for biometric enrollment.
       </p>
      </div>
      </div>
      {data.crop && <img src={data.crop} alt="Cropped muzzle" className="crop-img" />}
      <div className="metrics">
        <div className="metric-row">
          <span className="metric-label">Detection Confidence</span>
          <span className="metric-value mono">{data.detectionConfidence}%</span>
        </div>
        <ConfBar value={data.detectionConfidence} />
        <div className="metric-row" style={{ marginTop: 14 }}>
          <span className="metric-label">Quality Assessment</span>
          <span className={`badge badge-${(data.quality || "good").toLowerCase()}`}>{data.quality || "Good"}</span>
        </div>
        <div className="metric-row" style={{ marginTop: 10 }}>
          <span className="metric-label">Quality Confidence</span>
          <span className="metric-value mono">{data.qualityConfidence}%</span>
        </div>
        <ConfBar value={data.qualityConfidence} />
      </div>
      <FeedbackWidget result={data} />
      <button className="btn-primary" onClick={onRescan}>Scan Another</button>
    </div>
  )
}

/* ─── Result: Rejected ─── */
function ResultRejected({ data, onRescan }) {
  return (
    <div className="result-card fade-in">
      <div className="save-banner">
      <span className="save-icon">✓</span>
       <div>
       <p className="save-title">Muzzle image saved successfully</p>
       <p className="save-sub">
        The image has been stored for biometric enrollment.
       </p>
      </div>
      </div>
      <div className="result-header rejected-header">
        <span className="result-icon warn">⚠</span>
        <div>
          <p className="result-title">Poor Quality Image</p>
          <p className="result-sub">Not suitable for enrollment</p>
        </div>
      </div>
      {data.crop && <img src={data.crop} alt="Cropped muzzle" className="crop-img" />}
      <div className="metrics">
        <div className="metric-row">
          <span className="metric-label">Quality Assessment</span>
          <span className="badge badge-poor">POOR</span>
        </div>
        <div className="metric-row" style={{ marginTop: 12 }}>
          <span className="metric-label">Reason</span>
          <span className="metric-value">{data.reason}</span>
        </div>
      </div>
      <div className="tips-box">
        <p className="tips-title">Try the following:</p>
        <ul className="tips-list">
          <li>Move the camera closer to the muzzle</li>
          <li>Ensure adequate, even lighting</li>
          <li>Keep the muzzle centered in frame</li>
          <li>Hold the device steady while capturing</li>
        </ul>
      </div>
      <FeedbackWidget result={data} />
      <button className="btn-primary" onClick={onRescan}>Retake</button>
    </div>
  )
}

/* ─── Result: No detection ─── */
function ResultNoDetection({ onRescan }) {
  return (
    <div className="result-card fade-in">
      <div className="save-banner">
        <span className="save-icon">✓</span>
        <div>
         <p className="save-title">Muzzle image saved successfully</p>
         <p className="save-sub">
         The image has been stored for biometric enrollment.
         \ </p>
       </div>
      </div>
      <div className="result-header no-det-header">
        <span className="result-icon fail">✕</span>
        <div>
          <p className="result-title">No Muzzle Detected</p>
          <p className="result-sub">Could not locate a muzzle in the image</p>
        </div>
      </div>
      <div className="tips-box">
        <p className="tips-title">Try the following:</p>
        <ul className="tips-list">
          <li>Move closer — fill the frame with the muzzle</li>
          <li>Center the muzzle within the guide corners</li>
          <li>Reduce busy or cluttered backgrounds</li>
          <li>Check for adequate lighting on the subject</li>
        </ul>
      </div>
      <button className="btn-primary" onClick={onRescan}>Try Again</button>
    </div>
  )
}

/* ─── Main App ─── */
export default function App() {
  const [state, setState] = useState('idle') // idle | scanning | success | rejected | no_detection
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState(false)
  const [isAutoScanning, setIsAutoScanning] = useState(true)
  const [scanningStatus, setScanningStatus] = useState("Position muzzle inside guide")
  const [isMirrored, setIsMirrored] = useState(false)

  const showCamera = ['idle', 'scanning'].includes(state)

  // Manage camera stream lifecycle
  useEffect(() => {
    let active = true;
    let localStream = null;

    async function startCamera() {
      if (!showCamera) return;
      try {
        setCameraError(false);
        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (active) {
          localStream = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (active) {
          setCameraError(true);
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
    };
  }, [showCamera]);

  // Bind stream to video element when it mounts and stream is ready
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const shouldMirror = !settings || settings.facingMode !== 'environment';
        setIsMirrored(shouldMirror);
      } else {
        setIsMirrored(true);
      }
    }
  }, [stream]);

  // Auto-scan / Auto-capture loop
  useEffect(() => {
    if (!showCamera || !stream || state !== 'idle' || !isAutoScanning) return;

    let timerId = null;

    const captureAndScan = async () => {
      if (!videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        timerId = setTimeout(captureAndScan, 1000);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          timerId = setTimeout(captureAndScan, 1500);
          return;
        }

        const file = new File([blob], "scan.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);

        setScanningStatus("Scanning muzzle pattern...");
        try {
          const response = await fetch(`${API_BASE}/scan`, {
            method: "POST",
            body: formData
          });
          const data = await response.json();

          if (data.success) {
            const uiResult = {
              scan_id: data.scan_id,
              crop: data.crop_b64 ? `data:image/png;base64,${data.crop_b64}` : null,
              detectionConfidence: Math.round(data.det_confidence * 100),
              qualityConfidence: Math.round(data.cls_confidence * 100),
              quality: data.class_name,
              isViable: data.is_viable,
              reason: data.class_name === "poor"
                ? "Low resolution or blurry pattern"
                : data.class_name === "bad"
                  ? "Incorrect muzzle position or angle"
                  : "Not suitable for enrollment"
            };

            setResult(uiResult);
            if (data.is_viable) {
              setState("success");
            } else {
              setState("rejected");
            }
          } else {
            setScanningStatus("No muzzle detected. Adjust angle/distance.");
            timerId = setTimeout(captureAndScan, 1500);
          }
        } catch (err) {
          console.error("Auto scan error:", err);
          timerId = setTimeout(captureAndScan, 2000);
        }
      }, "image/png");
    };

    timerId = setTimeout(captureAndScan, 1500);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [showCamera, stream, state, isAutoScanning]);

  const handleManualCapture = async () => {
    if (!videoRef.current) return;
    setState("scanning");
    setScanningStatus("Capturing & analyzing...");

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setState("idle");
        setScanningStatus("Capture failed. Try again.");
        return;
      }

      const file = new File([blob], "scan.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${API_BASE}/scan`, {
          method: "POST",
          body: formData
        });
        const data = await response.json();

        if (!data.success) {
          setResult(null);
          setState("no_detection");
          return;
        }

        const uiResult = {
          scan_id: data.scan_id,
          crop: data.crop_b64 ? `data:image/png;base64,${data.crop_b64}` : null,
          detectionConfidence: Math.round(data.det_confidence * 100),
          qualityConfidence: Math.round(data.cls_confidence * 100),
          quality: data.class_name,
          isViable: data.is_viable,
          reason: data.class_name === "poor"
            ? "Low resolution or blurry pattern"
            : data.class_name === "bad"
              ? "Incorrect muzzle position or angle"
              : "Not suitable for enrollment"
        };

        setResult(uiResult);
        setState(data.is_viable ? "success" : "rejected");
      } catch (err) {
        console.error("Manual capture error:", err);
        setState("rejected");
      }
    }, "image/png");
  };

  const handleFileCapture = async (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setState("scanning")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(
        `${API_BASE}/scan`,
        {
          method: "POST",
          body: formData
        }
      )

      const data = await response.json()

      console.log(data)

      if (!data.success) {
        setResult(null)
        setState("no_detection")
        return
      }

      const uiResult = {
        scan_id: data.scan_id,
        crop: data.crop_b64
          ? `data:image/png;base64,${data.crop_b64}`
          : null,
        detectionConfidence: Math.round(data.det_confidence * 100),
        qualityConfidence: Math.round(data.cls_confidence * 100),
        quality: data.class_name,
        isViable: data.is_viable,
        reason: data.class_name === "poor"
          ? "Low resolution or blurry pattern"
          : data.class_name === "bad"
            ? "Incorrect muzzle position or angle"
            : "Not suitable for enrollment"
      }

      setResult(uiResult)

      setState(
        data.is_viable
          ? "success"
          : "rejected"
      )

    } catch (err) {
      console.error(err)
      setState("rejected")
    }
  }

  const rescan = useCallback(() => {
    setState('idle')
    setResult(null)
    setScanningStatus("Position muzzle inside guide")
  }, [])

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#0F766E"/>
                <ellipse cx="14" cy="15" rx="7" ry="5.5" fill="white" opacity="0.15"/>
                <circle cx="11" cy="13" r="2" fill="white" opacity="0.9"/>
                <circle cx="17" cy="13" r="2" fill="white" opacity="0.9"/>
                <circle cx="11" cy="13" r="0.8" fill="#0F766E"/>
                <circle cx="17" cy="13" r="0.8" fill="#0F766E"/>
                <path d="M11 16.5 Q14 18 17 16.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7"/>
                <path d="M8 9 L6 6M20 9 L22 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <h1 className="brand-name">MooCareX</h1>
              <p className="brand-tag">AI-Powered Cattle Biometric Enrollment</p>
            </div>
          </div>
          <p className="brand-steps">Capture&nbsp;•&nbsp;Validate&nbsp;•&nbsp;Enroll</p>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileCapture}
      />

      {/* ── Main ── */}
      <main className="main">

        {/* Camera + capture */}
        {showCamera && (
          <section className="scanner-section fade-in">
            <div className="camera-wrapper">
              {cameraError ? (
                <div className="cam-error">
                  <span style={{ fontSize: "2rem" }}>📷</span>
                  <p style={{ fontWeight: 600, margin: "8px 0 4px" }}>Camera Access Failed</p>
                  <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "16px" }}>
                    Please grant camera permissions, or use a browser that supports WebRTC.
                  </p>
                  <button 
                    className="fb-btn" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: "var(--primary)", color: "white", borderColor: "var(--primary)", padding: "8px 16px" }}
                  >
                    Upload Photo Manually
                  </button>
                </div>
              ) : stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`camera-video ${isMirrored ? 'mirrored' : ''}`}
                  />
                  {/* Muzzle cutout overlay */}
                  <div className="muzzle-overlay-container">
                    <svg viewBox="0 0 400 300" className="muzzle-overlay-svg" preserveAspectRatio="xMidYMid slice">
                      <defs>
                        <mask id="muzzle-mask">
                          <rect x="0" y="0" width="100%" height="100%" fill="white" />
                          <path d="M 150 110 Q 200 95 250 110 T 290 155 Q 300 195 260 215 T 200 225 T 140 215 Q 100 195 110 155 Z" fill="black" />
                        </mask>
                      </defs>
                      <rect x="0" y="0" width="100%" height="100%" fill="rgba(15, 23, 42, 0.65)" mask="url(#muzzle-mask)" />
                      <path 
                        d="M 150 110 Q 200 95 250 110 T 290 155 Q 300 195 260 215 T 200 225 T 140 215 Q 100 195 110 155 Z" 
                        fill="none" 
                        stroke="#0F766E" 
                        strokeWidth="3.5" 
                        strokeDasharray="6 4" 
                        className="muzzle-outline-glow"
                      />
                    </svg>
                    
                    {/* Sweeping scan line */}
                    {state === 'idle' && <div className="scan-line" />}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: "var(--text-3)"
                  }}
                >
                  <Spinner size={32} />
                  <span>Starting camera feed...</span>
                </div>
              )}
            </div>
            
            {state === 'idle' && (
              <div className="ready-hint">
                <span className="dot-pulse" />
                <span>{scanningStatus}</span>
              </div>
            )}

            {state === 'scanning' && (
              <div className="scanning-hint">
                <Spinner />
                <span>{scanningStatus}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className={`btn-capture ${state === 'scanning' ? 'btn-capture--busy' : ''}`}
                onClick={handleManualCapture}
                disabled={state === 'scanning' || !stream}
              >
                {state === 'scanning' ? (
                  <><Spinner size={18} color="white" /> Scanning...</>
                ) : 'Capture Muzzle'}
              </button>
              
              {!cameraError && (
                <button
                  className="fb-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={state === 'scanning'}
                  style={{ padding: "10px", fontSize: "13.5px" }}
                >
                  📂 Select Image from Gallery
                </button>
              )}
            </div>
          </section>
        )}

        {/* Result area */}
        {state === 'success' && result && (
          <ResultSuccess data={result} onRescan={rescan} />
        )}
        {state === 'rejected' && result && (
          <ResultRejected data={result} onRescan={rescan} />
        )}
        {state === 'no_detection' && (
          <ResultNoDetection onRescan={rescan} />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <span>MooCareX © 2025</span>
        <span className="footer-dot">·</span>
        <span>Cattle Biometric Platform</span>
      </footer>
    </div>
  )
}
