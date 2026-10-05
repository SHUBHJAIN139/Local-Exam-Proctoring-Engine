# Private, Local-First Exam Proctoring Engine (PS 2.2)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Zero-Cloud Privacy](https://img.shields.io/badge/Privacy-100%25%20In--Browser%20(0B%20Outbound)-emerald.svg)](#)

A high-integrity, institutional-grade examination and proctoring engine built with **React**, **Vite**, and **Tailwind CSS**. It runs **100% in-browser WebAssembly and WebGL computer vision** combined with **real client-side cryptography (`window.crypto.subtle`)**, ensuring zero video packets or candidate biometric streams leave the device.

---

## 🛡️ Core Architectural Pillars

### 1. 100% Client-Side Inference (Zero Outbound Video Packets)
- **Zero Video Streaming:** Unlike conventional surveillance proctoring systems, raw video feeds and audio never leave the candidate's browser.
- **In-Browser Models:**
  - **MediaPipe FaceLandmarker (v0.10.14 Wasm/GPU):** 468-point 3D facial landmark mesh for gaze tracking, yaw/pitch pose estimation, and eye closure analysis.
  - **TensorFlow.js COCO-SSD (MobileNet v2 WebGL):** Real-time prohibited device and material detection.
- **Privacy Audit Indicator:** Discreet status badge: `● Edge Engine: Active (0.00 KB Outbound)`.

### 2. Multi-Person & Unauthorized Material Vision Pipeline
- **Multi-Person Detection (`numFaces: 4`):** MediaPipe monitors up to 4 concurrent faces in the camera frame. The candidate face is outlined in **Green** (`VERIFIED CANDIDATE`), while any secondary face entering the frame is outlined in **Red** (`⚠ UNAUTHORIZED PERSON`) and triggers an immediate penalty: `MULTIPLE_PERSONS_DETECTED` (-20 pts).
- **Handheld Printed Paper & Cheat Notes Scanner:** Scans the candidate workspace zone ($y > 0.45 \times \text{height}$) for clusters of high luminance ($L > 210$) and low saturation ($S < 25$) with high-frequency print contrast (ink transitions). Holding cheat sheets or notes triggers `UNAUTHORIZED_PAPER_OR_DOCUMENT` (-15 pts).
- **Bookshelf False Alarm Suppression:** Intelligently ignores background bookshelves (objects in upper 40% of the frame or $< 8\%$ canvas area) to prevent false alerts while strictly detecting active devices (`cell phone`, `laptop` $> 0.55$ confidence).

### 3. Cryptographic Audit Engine (`window.crypto.subtle`)
- **Immutable SHA-256 Hash Chain:** Every session event forms a cryptographically linked block:
  ```
  block[i].hash = SHA-256(`${index}|${timestamp}|${prevHash}|${event}|${JSON.stringify(payload)}`)
  ```
- **Genesis Block:** Initialized with Roll Number, Candidate Name, and Exam Metadata linked to `0`.repeat(64).
- **ECDSA (P-256 / SHA-256) Digital Signatures:** Automatically generates a public/private keypair at launch. At test submission, the final summary `{ totalBlocks, finalScore, terminalHash }` is signed with ECDSA.
- **Chain Verification Engine:** Sequentially recomputes all hashes from Genesis to terminal block and verifies the digital signature. Detects single-character tampering instantly.

### 4. Active Browser Guards
- **Tab Switching Guard:** `visibilitychange` listener intercepts tab switches (-10 pts, max 3 switches allowed).
- **Window Blur:** Focus lost to external desktop applications (-5 pts).
- **Clipboard Interceptor:** Intercepts and blocks paste attempts in response areas (-10 pts).
- **Fullscreen Lockdown:** Enforces full-screen viewport; exiting triggers critical warning (-15 pts).
- **2-Second Debounce:** Prevents cascading multi-deductions during transient movements.

---

## 📊 Trust Score & Penalty Matrix

Base Score: **100** (Floored at **0**)

| Severity | Event Type | Penalty | Heuristic / Condition |
| :--- | :--- | :---: | :--- |
| **Critical** | `UNAUTHORIZED_MATERIAL_DETECTED` | **-25** | Cell phone or second laptop detected (COCO-SSD > 0.55) |
| **Critical** | `MULTIPLE_PERSONS_DETECTED` | **-20** | Secondary face detected in camera viewport |
| **Critical** | `FULLSCREEN_EXIT` | **-15** | Candidate exited dedicated full-screen exam mode |
| **Warning** | `UNAUTHORIZED_PAPER_OR_DOCUMENT`| **-15** | Handheld printed paper/notes held in workspace $\ge 1.5$s |
| **Warning** | `TAB_SWITCH` | **-10** | Tab lost visibility (document.hidden) |
| **Warning** | `CLIPBOARD_PASTE` | **-10** | Attempted to paste text into answer textarea |
| **Warning** | `WINDOW_BLUR` | **-5** | Browser window unfocused |
| **Warning** | `HEAD_POSE_PITCH_VIOLATION` | **-5** | Lap cheating / pitch tilt ($< 0.25$ or $> 0.75$) |
| **Warning** | `PROLONGED_EYES_CLOSED` | **-5** | Eye Aspect Ratio (EAR) $< 0.18$ sustained $\ge 2.0$s |
| **Warning** | `GAZE_DEVIATION_HORIZONTAL` | **-3** | Horizontal yaw deviation ($< 0.35$ or $> 0.65$) |
| **Info** | `CLIPBOARD_COPY` | **-2** | Copy action intercepted |

> **Fair Testing Policy:** If score drops below 40, assessment is flagged for post-exam review (`#FLAG-HUMAN-REVIEW`). Candidates are never auto-evicted.

---

## 🗂️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── InstitutionalHeader.jsx  # Institutional TCS iON / NTA top bar
│   │   ├── VisionHUD.jsx            # Webcam viewport with tracking overlays
│   │   ├── AuditLedgerPanel.jsx     # Live immutable block list
│   │   ├── SubmissionModal.jsx      # Certificate & verification modal
│   │   └── TamperSandbox.jsx        # Interactive tamper injection simulator
│   ├── data/
│   │   └── examQuestions.js         # Computer Science examination questions
│   ├── hooks/
│   │   ├── useBrowserGuards.js      # Window-level browser listeners
│   │   └── useProctorVision.js      # MediaPipe + COCO-SSD detection loop
│   ├── utils/
│   │   ├── cryptoAudit.js           # SHA-256 hash chaining & ECDSA signing
│   │   └── scoring.js               # Deterministic scoring engine
│   ├── App.jsx                      # Single linear state-machine orchestrator
│   └── main.jsx
├── test-crypto-proctor.js           # Node.js automated test suite
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js $\ge$ 18.x
- Modern browser with WebGL & Web Crypto API support (Chrome, Edge, Firefox, Brave)

### Installation
```bash
git clone https://github.com/SHUBHJAIN139/Local-Exam-Proctoring-Engine.git
cd Local-Exam-Proctoring-Engine
npm install
```

### Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
npm run build
```

### Running Automated Test Suite
```bash
node test-crypto-proctor.js
```

---

## 🔒 Security & Privacy Guarantees
- **No Video Streaming:** Camera frames are processed strictly in RAM and discarded immediately.
- **No Remote Telemetry:** All inference models run locally via WebAssembly and WebGL.
- **Cryptographic Tamper Proofing:** Public verification key and SHA-256 terminal digest provide mathematical verification of test integrity without cloud storage.

---

## 📄 License
This project is licensed under the MIT License.
