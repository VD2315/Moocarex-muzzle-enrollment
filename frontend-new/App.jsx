import React, { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'

/* ─── tiny feedback store (localStorage) ─── */
function saveFeedback(entry) {
  try {
    const all = JSON.parse(localStorage.getItem('moocarex_feedback') || '[]')
    all.push({ ...entry, ts: Date.now() })
    localStorage.setItem('moocarex_feedback', JSON.stringify(all))
  } catch (_) {}
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

const API_URL = "http://10.21.5.106:8000/scan";

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
      <div className="result-header success-header">
        <span className="result-icon">✓</span>
        <div>
          <p className="result-title">Enrollment Quality Confirmed</p>
          <p className="result-sub">Accepted for biometric enrollment</p>
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
  
  
 

const handleFileCapture = async (e) => {
  const file = e.target.files?.[0]

  if (!file) return

  setState("scanning")

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(
      "http://10.21.5.106:8000/scan",
      {
        method: "POST",
        body: formData
      }
    )

    const data = await response.json()

console.log(data)

const uiResult = {
  crop: data.crop_b64
    ? `data:image/png;base64,${data.crop_b64}`
    : null,

  detectionConfidence: Math.round(
    data.det_confidence * 100
  ),

  qualityConfidence: Math.round(
    data.cls_confidence * 100
  ),

  quality: data.class_name,

  isViable: data.is_viable
}

setResult(uiResult)

setState(
  data.success
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
  }, [])

  const showCamera = ['idle','scanning'].includes(state)

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
  capture="environment"
  style={{ display: 'none' }}
  onChange={handleFileCapture}
/>

      {/* ── Main ── */}
      <main className="main">

        {/* Camera + capture */}
        {showCamera && (
          <section className="scanner-section fade-in">
            <div className="camera-wrapper">
  {selectedImage ? (
    <img
      src={selectedImage}
      alt="Captured muzzle"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }}
    />
  ) : (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      📷 Tap Capture Muzzle
    </div>
  )}
</div>
            

            {state === 'idle' && (
              <div className="ready-hint">
                <span className="dot-pulse" />
                <span>Ready to scan — position the muzzle in front of the camera</span>
              </div>
            )}

            {state === 'scanning' && (
              <div className="scanning-hint">
                <Spinner />
                <span>Analyzing image…</span>
              </div>
            )}

            <button
              className={`btn-capture ${state === 'scanning' ? 'btn-capture--busy' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={state === 'scanning'}
            >
              {state === 'scanning' ? (
                <><Spinner size={18} color="white" /> Detecting muzzle…</>
              ) : 'Capture Muzzle'}
            </button>
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
