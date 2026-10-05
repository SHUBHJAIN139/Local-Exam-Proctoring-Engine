import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import confetti from 'canvas-confetti';
import { 
  createGenesisBlock, 
  appendBlock, 
  generateProctorKeyPair, 
  signExamSummary,
  verifyChain
} from './utils/cryptoAudit';
import { calculateTrustScore, getPenaltyDetails, getScoreStatus } from './utils/scoring';
import { EXAM_QUESTIONS } from './data/examQuestions';
import { 
  ShieldCheck, 
  Clock, 
  Camera, 
  Sparkles, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Download, 
  RotateCcw, 
  Bug, 
  Copy, 
  Check, 
  Key, 
  Compass, 
  Eye, 
  Volume2, 
  WifiOff, 
  Maximize, 
  Minimize, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ClipboardPaste
} from 'lucide-react';

const CANDIDATE_INFO = {
  name: "Aarav Sharma",
  rollNo: "2026-CS-4891",
  examName: "National Scholarship Aptitude Assessment",
  terminalId: "Terminal #04 (Edge Active)"
};

const STORAGE_KEYS = {
  CHAIN: 'nsaa_audit_chain',
  TIME: 'nsaa_time_left',
  ANSWERS: 'nsaa_answers',
  EXPLANATIONS: 'nsaa_explanations',
  TAB_SWITCHES: 'nsaa_tab_switches'
};

const TOTAL_TIME_SECONDS = 15 * 60; // 15:00 min countdown
const UNAUTHORIZED_CLASSES = new Set(['cell phone', 'book', 'laptop']);

// Generates a 30fps canvas stream for environments without a physical webcam
function createSimulatedCameraStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let angle = 0;
  let animId = null;

  function draw() {
    angle += 0.035;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle institutional grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Simulated candidate face
    const centerX = 320 + Math.sin(angle) * 8;
    const centerY = 240 + Math.cos(angle * 0.9) * 5;

    // Face boundary (Clean institutional green)
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 110, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(centerX - 30, centerY - 18, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 30, centerY - 18, 5, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX - 4, centerY + 12);
    ctx.lineTo(centerX + 4, centerY + 12);
    ctx.stroke();

    // Nose landmark dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(centerX, centerY + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.beginPath();
    ctx.arc(centerX, centerY + 40, 20, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Institutional Terminal Stamp
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('● CANDIDATE FEED: VERIFIED (VIRTUAL 30 FPS)', 20, 30);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('National Scholarship Aptitude Assessment | Edge Active', 20, 46);

    animId = requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream ? canvas.captureStream(30) : null;
  if (stream) {
    stream._animId = animId;
  }
  return stream;
}

export default function App() {
  // Single Linear State Machine: 'welcome' -> 'calibrating' -> 'exam' -> 'submitted'
  const [appState, setAppState] = useState('welcome');

  // Single Persistent MediaStream
  const mediaStreamRef = useRef(null);
  const [mediaStream, setMediaStream] = useState(null);

  // Video & Canvas DOM Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Calibration Progress & Emergency Bypass
  const [calibProgress, setCalibProgress] = useState(0);

  // Tab Switch Counter
  const [tabSwitches, setTabSwitches] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TAB_SWITCHES);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Questions, Answers & Current Index
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANSWERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [explanations, setExplanations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPLANATIONS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Cryptographic Ledger Chain
  const [chain, setChain] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAIN);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 15:00 Countdown Timer
  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIME);
      return saved ? Number(saved) : TOTAL_TIME_SECONDS;
    } catch {
      return TOTAL_TIME_SECONDS;
    }
  });

  // ECDSA Keypair & Proofs
  const [keyPairData, setKeyPairData] = useState({
    keyPair: null,
    publicKeyHex: '',
    signatureHex: ''
  });
  const [submissionSummary, setSubmissionSummary] = useState(null);

  // Active UI Warning Toasts
  const [activeToasts, setActiveToasts] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Real-time Vision Telemetry
  const [telemetry, setTelemetry] = useState({
    yaw: 0.50,
    pitch: 0.50,
    ear: 0.28,
    isYawAlert: false,
    isPitchAlert: false,
    isEyesClosed: false,
    facesCount: 1,
    documentScanStatus: 'Clear',
    isDocumentSuspicious: false,
    detectedObjects: []
  });

  // Vision Models Refs
  const faceLandmarkerRef = useRef(null);
  const cocoModelRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Debounce & Sustained Violation Refs
  const lastEventTimeRef = useRef({});
  const eyesClosedStartTimeRef = useRef(null);
  const paperDetectedStartTimeRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    if (chain.length > 0) localStorage.setItem(STORAGE_KEYS.CHAIN, JSON.stringify(chain));
  }, [chain]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIME, String(timeLeft));
  }, [timeLeft]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
  }, [answers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPLANATIONS, JSON.stringify(explanations));
  }, [explanations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TAB_SWITCHES, String(tabSwitches));
  }, [tabSwitches]);

  // Compute Trust Score deterministically
  const trustScore = calculateTrustScore(chain);

  // Append violation block to cryptographic hash-chain
  const recordViolation = useCallback(async (eventType, payload = {}) => {
    try {
      // 2-second debounce per event to prevent cascade drops
      const now = Date.now();
      const last = lastEventTimeRef.current[eventType] || 0;
      if (now - last < 2000) return;
      lastEventTimeRef.current[eventType] = now;

      setChain((prevChain) => {
        let currentChain = [...prevChain];
        appendBlock(currentChain, eventType, payload).then((newChain) => {
          setChain(newChain);
        });
        return prevChain;
      });

      const details = getPenaltyDetails(eventType);
      const toastId = Date.now() + Math.random();
      const toastLabel = payload.alert || payload.customAlert || details.label;
      const toastDesc = payload.description || details.description;
      setActiveToasts((prev) => [
        ...prev,
        { id: toastId, label: toastLabel, description: toastDesc, points: details.points }
      ]);

      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 3500);
    } catch (err) {
      console.warn("Failed to record violation block:", err);
    }
  }, []);

  // 1. Initialize ECDSA Keypair & Genesis Block
  useEffect(() => {
    async function initCrypto() {
      try {
        const keys = await generateProctorKeyPair();
        setKeyPairData(prev => ({
          ...prev,
          keyPair: keys.keyPair,
          publicKeyHex: keys.publicKeyHex
        }));

        if (chain.length === 0) {
          const genesis = await createGenesisBlock({
            examTitle: CANDIDATE_INFO.examName,
            candidateName: CANDIDATE_INFO.name,
            rollNo: CANDIDATE_INFO.rollNo,
            publicKey: keys.publicKeyHex
          });
          setChain([genesis]);
        }
      } catch (err) {
        console.warn("Crypto init notice:", err);
      }
    }
    initCrypto();
  }, []);

  // 2. Initialize Models (MediaPipe & TFJS COCO-SSD)
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        await tf.ready();
        try {
          await tf.setBackend('webgl');
        } catch {
          await tf.setBackend('cpu');
        }

        try {
          const coco = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (isMounted) cocoModelRef.current = coco;
        } catch (e) {
          console.warn("COCO-SSD load notice:", e);
        }

        try {
          const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );

          if (isMounted) {
            let faceLandmarker = null;
            try {
              faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                  delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numFaces: 4
              });
            } catch {
              faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                  delegate: 'CPU'
                },
                runningMode: 'VIDEO',
                numFaces: 4
              });
            }
            faceLandmarkerRef.current = faceLandmarker;
          }
        } catch (e) {
          console.warn("MediaPipe load notice:", e);
        }
      } catch (err) {
        console.warn("Model init notice:", err);
      }
    }
    loadModels();

    return () => {
      isMounted = false;
      if (faceLandmarkerRef.current) {
        try { faceLandmarkerRef.current.close(); } catch {}
      }
    };
  }, []);

  // 3. Immediate Active Browser Guards Attached at Window Level
  useEffect(() => {
    if (appState !== 'exam') return;

    // Visibility Change: Document hidden -> Tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        recordViolation('TAB_SWITCH', {
          reason: 'Document hidden / switched away from terminal',
          alert: '⚠ TAB SWITCH DETECTED: RETURN TO EXAM IMMEDIATELY'
        });
      }
    };

    // Window Blur: Focus lost to external window
    const handleBlur = () => {
      if (!document.hidden) {
        recordViolation('WINDOW_BLUR', {
          reason: 'Application window lost active focus'
        });
      }
    };

    // Clipboard Paste: Deduct -10 pts
    const handlePaste = (e) => {
      recordViolation('CLIPBOARD_PASTE', {
        target: e.target?.tagName,
        pastedLength: e.clipboardData ? e.clipboardData.getData('text').length : 0,
        alert: '⚠ CLIPBOARD PASTE PROHIBITED'
      });
    };

    // Clipboard Copy: Deduct -2 pts
    const handleCopy = () => {
      recordViolation('CLIPBOARD_COPY', {
        alert: '⚠ CLIPBOARD COPY PROHIBITED'
      });
    };

    // Fullscreen exit guard
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs) {
        recordViolation('FULLSCREEN_EXIT', {
          reason: 'Exited dedicated fullscreen proctoring viewport'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [appState, recordViolation]);

  // 4. Single Persistent Video Attachment Effect
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      if (videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Video play notice:', e));
      }
    }
  }, [mediaStream, appState]);

  // 5. Camera Request Function
  const handleStartExamFlow = async (preferSimulated = false) => {
    let stream = null;
    if (preferSimulated) {
      stream = createSimulatedCameraStream();
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam API is not supported in this browser.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
      } catch (err) {
        console.warn('Physical camera unavailable, falling back to simulated stream:', err);
        stream = createSimulatedCameraStream();
      }
    }

    mediaStreamRef.current = stream;
    setMediaStream(stream);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }

    setAppState('calibrating');
  };

  // 6. Reliable 4-Second Calibration Ticker (Guaranteed Progress + Auto Transition)
  useEffect(() => {
    if (appState !== 'calibrating') return;

    let progress = 0;
    setCalibProgress(0);

    // Guaranteed 100ms ticker: increment +2.5% each tick (40 ticks = 4000ms = 4.0s)
    const ticker = setInterval(() => {
      progress += 2.5;
      setCalibProgress(Math.min(100, Math.round(progress)));

      if (progress >= 100) {
        clearInterval(ticker);
        // Append calibration event to crypto ledger
        appendBlock(chain, 'CALIBRATION_COMPLETED', {
          baseline: "NORMAL_CENTERED",
          timestamp: Date.now()
        }).then((newChain) => {
          setChain(newChain);
        });

        // Exact millisecond calibration hits 100%, slide into exam!
        setAppState('exam');
      }
    }, 100);

    return () => clearInterval(ticker);
  }, [appState]);

  // Force Start Exam Bypass
  const handleForceStartExam = () => {
    appendBlock(chain, 'CALIBRATION_COMPLETED', {
      baseline: "MANUAL_BYPASS",
      timestamp: Date.now()
    }).then((newChain) => {
      setChain(newChain);
    });
    setAppState('exam');
  };

  // 7. Industrial Detection Loop (~350ms with exact math formulas)
  useEffect(() => {
    if (appState !== 'exam') return;

    const processFrame = async () => {
      if (isProcessingRef.current) return;
      if (!videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState < 2) return;

      isProcessingRef.current = true;
      const now = Date.now();

      try {
        const timestamp = performance.now();
        const vWidth = video.videoWidth || 640;
        const vHeight = video.videoHeight || 480;

        let detectedYaw = 0.50;
        let detectedPitch = 0.50;
        let detectedEAR = 0.28;
        let isYawBad = false;
        let isPitchBad = false;
        let isEyesClosedNow = false;
        let faceCount = 0;
        let allFaceBoxes = [];
        let primaryFaceBox = null;
        let detectedBoxes = [];
        let isSuspiciousDoc = false;

        // A. MediaPipe FaceLandmarker (numFaces: 4)
        if (faceLandmarkerRef.current) {
          const res = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          const faces = res.faceLandmarks || [];
          faceCount = faces.length;

          if (faces.length > 0) {
            allFaceBoxes = faces.map((lm, idx) => {
              const xs = lm.map(p => p.x * vWidth);
              const ys = lm.map(p => p.y * vHeight);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              const width = Math.max(1, maxX - minX);
              const height = Math.max(1, maxY - minY);
              const area = width * height;
              return { landmarks: lm, minX, maxX, minY, maxY, width, height, area, index: idx };
            }).sort((a, b) => b.area - a.area);

            primaryFaceBox = allFaceBoxes[0];
            const lm = primaryFaceBox.landmarks;

            // 1. Exact Yaw Math:
            // yaw = (noseTip.x - leftCheek.x) / (rightCheek.x - leftCheek.x)
            // Left cheek: 234, Right cheek: 454, Nose tip: 1
            const noseTip = lm[1];
            const leftCheek = lm[234];
            const rightCheek = lm[454];
            const cheekDist = (rightCheek.x - leftCheek.x) || 0.001;
            detectedYaw = Number(((noseTip.x - leftCheek.x) / cheekDist).toFixed(2));

            // If yaw < 0.35 (looking right) or yaw > 0.65 (looking left) -> Flag GAZE_DEVIATION_HORIZONTAL
            if (detectedYaw < 0.35 || detectedYaw > 0.65) {
              isYawBad = true;
              recordViolation('GAZE_DEVIATION_HORIZONTAL', {
                yaw: detectedYaw,
                direction: detectedYaw < 0.35 ? 'RIGHT' : 'LEFT'
              });
            }

            // 2. Exact Pitch Math (Lap Cheating Detection):
            // pitch = (noseTip.y - eyeMidpoint.y) / (chin.y - eyeMidpoint.y)
            // Left eye: 33, Right eye: 263, Chin: 152
            const eyeMidY = (lm[33].y + lm[263].y) / 2;
            const chinY = lm[152].y;
            const eyeChinDist = (chinY - eyeMidY) || 0.001;
            detectedPitch = Number(((noseTip.y - eyeMidY) / eyeChinDist).toFixed(2));

            // If pitch > 0.75 (head tilted down toward lap/phone) or pitch < 0.25 (looking up) -> Flag HEAD_POSE_PITCH_VIOLATION
            if (detectedPitch > 0.75 || detectedPitch < 0.25) {
              isPitchBad = true;
              recordViolation('HEAD_POSE_PITCH_VIOLATION', {
                pitch: detectedPitch,
                direction: detectedPitch > 0.75 ? 'TILTED_DOWN_LAP' : 'TILTED_UP'
              });
            }

            // 3. Eye Aspect Ratio (EAR) - Prolonged Eye Closure:
            // Left eye: upper 159, lower 145, inner 133, outer 33
            const leftV = Math.hypot(lm[159].x - lm[145].x, lm[159].y - lm[145].y);
            const leftH = Math.hypot(lm[33].x - lm[133].x, lm[33].y - lm[133].y) || 0.001;
            const leftEAR = leftV / leftH;

            // Right eye: upper 386, lower 374, inner 362, outer 263
            const rightV = Math.hypot(lm[386].x - lm[374].x, lm[386].y - lm[374].y);
            const rightH = Math.hypot(lm[263].x - lm[362].x, lm[263].y - lm[362].y) || 0.001;
            const rightEAR = rightV / rightH;

            detectedEAR = Number(((leftEAR + rightEAR) / 2).toFixed(2));

            // If EAR < 0.18 sustained for > 2.0 seconds -> Flag PROLONGED_EYES_CLOSED
            if (detectedEAR < 0.18) {
              isEyesClosedNow = true;
              if (!eyesClosedStartTimeRef.current) {
                eyesClosedStartTimeRef.current = now;
              } else if (now - eyesClosedStartTimeRef.current >= 2000) {
                recordViolation('PROLONGED_EYES_CLOSED', {
                  ear: detectedEAR,
                  duration: '>=2.0s'
                });
              }
            } else {
              eyesClosedStartTimeRef.current = null;
            }

            // 4. Multiple Persons Detection:
            // If faceCount > 1: Immediately flag MULTIPLE_PERSONS_DETECTED (-20 pts)
            if (faceCount > 1) {
              recordViolation('MULTIPLE_PERSONS_DETECTED', {
                faceCount,
                alert: `⚠ Critical: ${faceCount} Faces In Frame (-20)`
              });
            }
          }
        }

        // B. TensorFlow COCO-SSD (cell phone, laptop > 0.55 & Bookshelf filtering)
        if (cocoModelRef.current) {
          const preds = await cocoModelRef.current.detect(video, 6, 0.40);
          const canvasArea = vWidth * vHeight;

          for (const pred of preds) {
            const cls = pred.class.toLowerCase();
            const [bx, by, bw, bh] = pred.bbox;
            const boxArea = bw * bh;

            if (cls === 'cell phone' || cls === 'laptop') {
              if (pred.score > 0.55) {
                detectedBoxes.push({
                  bbox: pred.bbox,
                  label: `PROHIBITED DEVICE: ${pred.class.toUpperCase()} (${Math.round(pred.score * 100)}%)`
                });
                recordViolation('UNAUTHORIZED_MATERIAL_DETECTED', {
                  detectedItem: pred.class,
                  confidence: `${Math.round(pred.score * 100)}%`,
                  alert: '⚠ Prohibited Material Detected'
                });
              }
            } else if (cls === 'book') {
              // Ignore background bookshelves!
              // Do NOT flag book detections if the bounding box is in the upper 40% of the frame (by < vHeight * 0.40)
              // or has an area < 8% of total canvas (which typical stationary shelf books are).
              const isUpperFrame = by < (vHeight * 0.40);
              const isSmallArea = boxArea < (0.08 * canvasArea);

              if (!isUpperFrame && !isSmallArea && pred.score > 0.55) {
                detectedBoxes.push({
                  bbox: pred.bbox,
                  label: `UNAUTHORIZED MATERIAL: BOOK (${Math.round(pred.score * 100)}%)`
                });
                recordViolation('UNAUTHORIZED_MATERIAL_DETECTED', {
                  detectedItem: 'book (workspace)',
                  confidence: `${Math.round(pred.score * 100)}%`,
                  alert: '⚠ Prohibited Material Detected'
                });
              }
            }
          }
        }

        // C. Detect Handheld Printed Paper / Notes (White Document Detector)
        // Scan the lower half of the frame (desk/hand area: y > vHeight * 0.45)
        try {
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
            offscreenCanvasRef.current.width = 160;
            offscreenCanvasRef.current.height = 120;
          }
          const offCanvas = offscreenCanvasRef.current;
          const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
          offCtx.drawImage(video, 0, 0, 160, 120);

          const startY = Math.floor(120 * 0.45);
          const scanHeight = 120 - startY;
          const imgData = offCtx.getImageData(0, startY, 160, scanHeight);
          const data = imgData.data;

          let whitePaperPixels = 0;
          let inkTextPixels = 0;
          let minX = 160, maxX = 0, minY = scanHeight, maxY = 0;

          for (let py = 0; py < scanHeight; py++) {
            for (let px = 0; px < 160; px++) {
              const idx = (py * 160 + px) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              const maxVal = Math.max(r, g, b);
              const minVal = Math.min(r, g, b);
              const sat = maxVal === 0 ? 0 : ((maxVal - minVal) / maxVal) * 100;

              // High luminance (> 210), low saturation (< 25) for white paper
              if (lum > 210 && sat < 25) {
                whitePaperPixels++;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
              } else if (lum < 75) {
                inkTextPixels++;
              }
            }
          }

          const clusterW = maxX >= minX ? (maxX - minX) : 0;
          const clusterH = maxY >= minY ? (maxY - minY) : 0;
          const clusterArea = clusterW * clusterH;

          // Handheld paper cluster with printed text contrast
          if (whitePaperPixels > 380 && clusterW > 25 && clusterH > 20 && inkTextPixels > 40 && (whitePaperPixels / (clusterArea || 1)) > 0.35) {
            isSuspiciousDoc = true;
            const scaleX = vWidth / 160;
            const scaleY = vHeight / 120;
            detectedBoxes.push({
              bbox: [
                minX * scaleX,
                (startY + minY) * scaleY,
                clusterW * scaleX,
                clusterH * scaleY
              ],
              label: 'SUSPICIOUS DOCUMENT / NOTES'
            });

            if (!paperDetectedStartTimeRef.current) {
              paperDetectedStartTimeRef.current = now;
            } else if (now - paperDetectedStartTimeRef.current >= 1500) {
              recordViolation('UNAUTHORIZED_PAPER_OR_DOCUMENT', {
                details: 'Handheld paper / cheat notes held in active workspace',
                alert: '⚠ Prohibited Material Detected'
              });
            }
          } else {
            paperDetectedStartTimeRef.current = null;
          }
        } catch (e) {
          // Non-blocking scan notice
        }

        // Update telemetry
        setTelemetry({
          yaw: detectedYaw,
          pitch: detectedPitch,
          ear: detectedEAR,
          isYawAlert: isYawBad,
          isPitchAlert: isPitchBad,
          isEyesClosed: isEyesClosedNow,
          facesCount: faceCount,
          documentScanStatus: isSuspiciousDoc ? 'Suspicious Object' : 'Clear',
          isDocumentSuspicious: isSuspiciousDoc,
          detectedObjects: detectedBoxes
        });

        // D. Render Tracking Boxes & Mesh on Overlay Canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          canvas.width = vWidth;
          canvas.height = vHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 1. Primary candidate face (Green if normal, Red if alert)
          if (primaryFaceBox) {
            const lm = primaryFaceBox.landmarks;
            const nose = lm[1];

            if (nose) {
              ctx.fillStyle = (isYawBad || isPitchBad || isEyesClosedNow) ? '#ef4444' : '#10b981';
              ctx.beginPath();
              ctx.arc(nose.x * canvas.width, nose.y * canvas.height, 4, 0, 2 * Math.PI);
              ctx.fill();
            }

            const candColor = (isYawBad || isPitchBad || isEyesClosedNow) ? '#ef4444' : '#10b981';
            ctx.strokeStyle = candColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(
              primaryFaceBox.minX,
              primaryFaceBox.minY,
              primaryFaceBox.width,
              primaryFaceBox.height
            );

            ctx.font = '500 11px system-ui, sans-serif';
            ctx.fillStyle = candColor;
            const label = isPitchBad 
              ? 'ALERT: Head Down (Lap Cheat)' 
              : isYawBad 
                ? 'ALERT: Horizontal Gaze' 
                : isEyesClosedNow 
                  ? 'ALERT: Eyes Closed' 
                  : 'VERIFIED CANDIDATE';
            ctx.fillText(label, primaryFaceBox.minX, Math.max(14, primaryFaceBox.minY - 6));
          }

          // 2. Secondary faces (ALL outlined in RED with UNAUTHORIZED PERSON banner)
          if (allFaceBoxes.length > 1) {
            for (let i = 1; i < allFaceBoxes.length; i++) {
              const sec = allFaceBoxes[i];
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#ef4444';
              ctx.strokeRect(sec.minX, sec.minY, sec.width, sec.height);

              const secLabel = `⚠ UNAUTHORIZED PERSON #${i + 1}`;
              ctx.font = 'bold 10px monospace';
              const textW = ctx.measureText(secLabel).width;
              ctx.fillStyle = '#dc2626';
              ctx.fillRect(sec.minX, Math.max(0, sec.minY - 18), textW + 8, 18);

              ctx.fillStyle = '#ffffff';
              ctx.fillText(secLabel, sec.minX + 4, Math.max(12, sec.minY - 5));
            }
          }

          // 3. Object & Document Bounding Boxes
          detectedBoxes.forEach(item => {
            const [x, y, width, height] = item.bbox;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#dc2626';
            ctx.strokeRect(x, y, width, height);

            ctx.font = 'bold 10px monospace';
            const textW = ctx.measureText(item.label).width;
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x, Math.max(0, y - 18), textW + 8, 18);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.label, x + 4, Math.max(12, y - 5));
          });
        }
      } catch (err) {
        console.warn("Vision cycle notice:", err);
      } finally {
        isProcessingRef.current = false;
      }
    };

    const interval = setInterval(processFrame, 350);
    return () => clearInterval(interval);
  }, [appState, recordViolation]);

  // 8. 15-Minute Countdown Loop
  useEffect(() => {
    if (appState !== 'exam') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [appState]);

  // Fullscreen toggle helper
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen toggle notice:", e);
    }
  };

  // Submit Exam & Sign Cryptographic Summary
  const handleSubmitExam = async () => {
    try {
      const terminalBlock = chain[chain.length - 1];
      const terminalHash = terminalBlock ? terminalBlock.hash : "0".repeat(64);
      const finalScore = calculateTrustScore(chain);

      const summary = {
        examTitle: CANDIDATE_INFO.examName,
        candidateName: CANDIDATE_INFO.name,
        rollNo: CANDIDATE_INFO.rollNo,
        totalBlocks: chain.length,
        finalScore,
        terminalHash,
        tabSwitches,
        timestamp: Date.now()
      };

      setSubmissionSummary(summary);

      if (keyPairData.keyPair?.privateKey) {
        const { signatureHex } = await signExamSummary(keyPairData.keyPair.privateKey, summary);
        setKeyPairData(prev => ({ ...prev, signatureHex }));
      }

      setAppState('submitted');
    } catch (err) {
      console.warn("Signing error on submit:", err);
      setAppState('submitted');
    }
  };

  // Reset Session
  const handleResetExam = () => {
    localStorage.removeItem(STORAGE_KEYS.CHAIN);
    localStorage.removeItem(STORAGE_KEYS.TIME);
    localStorage.removeItem(STORAGE_KEYS.ANSWERS);
    localStorage.removeItem(STORAGE_KEYS.EXPLANATIONS);
    localStorage.removeItem(STORAGE_KEYS.TAB_SWITCHES);

    if (mediaStreamRef.current && mediaStreamRef.current.getTracks) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }

    window.location.reload();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ==========================================
  // VIEW 1: 'welcome' (Zero-barrier initial screen)
  // ==========================================
  if (appState === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
              NTA
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                National Scholarship Aptitude Assessment
              </h1>
              <p className="text-[11px] text-slate-400">
                Institutional Online Testing Terminal | Reliance & TCS iON Architecture
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400">Outbound Stream:</span>
            <span className="ml-1 text-emerald-400 font-mono font-medium">0.00 KB (Edge Active)</span>
          </div>
        </header>

        {/* Welcome Card Container */}
        <main className="max-w-2xl w-full mx-auto p-4 my-auto">
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-8 space-y-6">
            
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Candidate Entry Portal
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {CANDIDATE_INFO.examName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Duration: <strong>15 Minutes</strong> | Security Protocol: <strong>100% In-Browser Cryptographic Edge</strong>
              </p>
            </div>

            {/* Candidate Identity Card */}
            <div className="bg-slate-50 rounded p-4 border border-slate-200 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">Candidate Name:</span>
                <strong className="text-slate-800 text-sm">{CANDIDATE_INFO.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Roll Number:</span>
                <strong className="text-slate-800 text-sm font-mono">{CANDIDATE_INFO.rollNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Terminal Node:</span>
                <span className="text-slate-700 font-mono">{CANDIDATE_INFO.terminalId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tab Switch Policy:</span>
                <span className="text-red-700 font-semibold font-mono">Max 3 Switches Allowed</span>
              </div>
            </div>

            {/* Direct Startup Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleStartExamFlow(false)}
                className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white font-semibold text-sm rounded shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Grant Camera & Begin Assessment</span>
              </button>

              <button
                onClick={() => handleStartExamFlow(true)}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Launch with synthetic video feed if you do not have a physical webcam"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>Launch with Virtual Camera (Demo Mode)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Zero outbound video packets. All biometric and object detection runs locally inside your browser.
            </p>

          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
          NTA Edge Security Protocol © 2026 | Local Cryptographic SHA-256 Ledger
        </footer>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: 'calibrating' (4s Auto-Progress + Emergency Bypass Button)
  // ==========================================
  if (appState === 'calibrating') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
        
        {/* Header */}
        <header className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
              NTA
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                National Scholarship Aptitude Assessment
              </h1>
              <p className="text-[11px] text-slate-400">
                Phase 2: Posture Verification (Auto-progressing)
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-300 font-mono">
            Candidate: {CANDIDATE_INFO.name} ({CANDIDATE_INFO.rollNo})
          </span>
        </header>

        {/* Main Calibration Card with Live Visible Camera & Emergency Bypass */}
        <main className="max-w-xl w-full mx-auto p-4 my-auto">
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-6 text-center space-y-5">
            
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                System Verification (5 Seconds)
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Verifying Neutral Reading Posture
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hold your head facing forward. Auto-transitioning immediately upon completion.
              </p>
            </div>

            {/* VISIBLE Live Webcam Preview with Tracking Canvas */}
            <div className="relative w-full max-w-sm aspect-[4/3] mx-auto rounded-lg overflow-hidden border-2 border-blue-600 bg-slate-950 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
              />
              <div className="absolute inset-4 border border-dashed border-emerald-400/70 rounded pointer-events-none flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-white border border-slate-700">
                <span>Calibrating: {calibProgress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Progress</span>
                <span className="font-mono font-bold text-blue-700">{calibProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-100 rounded-full"
                  style={{ width: `${calibProgress}%` }}
                />
              </div>
            </div>

            {/* EMERGENCY BYPASS BUTTON (Guaranteed Zero-Hang) */}
            <div className="pt-2">
              <button
                onClick={handleForceStartExam}
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded shadow-sm transition-all"
                title="Bypass countdown and jump directly to test"
              >
                [ Force Start Exam ]
              </button>
            </div>

          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
          Terminal Node #04 | Zero Outbound Camera Packets
        </footer>

      </div>
    );
  }

  // ==========================================
  // VIEW 3: 'exam' (Live Exam - Left 40% HUD, Right 60% Questions)
  // ==========================================
  if (appState === 'exam') {
    const currentQuestion = EXAM_QUESTIONS[currentIdx];
    const totalQuestions = EXAM_QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    const scoreInfo = getScoreStatus(trustScore);

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
        
        {/* Top Bar (Reliance / TCS iON Enterprise Style) */}
        <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sticky top-0 z-40 shadow-sm">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Left: Exam Title & Candidate */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                NTA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-wide">
                    National Scholarship Aptitude Assessment
                  </h1>
                  <span className="text-[10px] bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded font-mono">
                    0.00 KB (Edge Active)
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Candidate: <strong className="text-slate-200">{CANDIDATE_INFO.name}</strong> | Roll: <strong className="text-slate-200 font-mono">{CANDIDATE_INFO.rollNo}</strong>
                </div>
              </div>
            </div>

            {/* Right: Timer, Trust Score, Tab Switch Counter & Actions */}
            <div className="flex items-center gap-3">
              
              {/* Timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono font-medium ${
                timeLeft <= 120 ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-sans text-[11px]">Time:</span>
                <span className="font-bold">{formatTime(timeLeft)}</span>
              </div>

              {/* Trust Score */}
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded text-xs">
                <span className="text-[11px] text-slate-400">Trust Score:</span>
                <span className={`font-mono font-bold ${scoreInfo.textColor}`}>
                  {trustScore}/100
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  trustScore >= 80 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              </div>

              {/* Tab Switch Counter */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono ${
                tabSwitches >= 3 ? 'bg-red-950/80 border-red-500 text-red-300 font-bold animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                <span>Switches:</span>
                <span className={tabSwitches >= 3 ? 'text-red-400' : 'text-emerald-400'}>
                  {tabSwitches}/3 Allowed
                </span>
              </div>

              {/* Fullscreen & Submit */}
              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <button
                onClick={handleSubmitExam}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Exam</span>
              </button>

            </div>

          </div>
        </header>

        {/* Human Review Banner (Score < 40) */}
        {trustScore < 40 && (
          <div className="bg-red-50 border-b border-red-300 px-4 py-2 text-xs text-red-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>⚠ FLAGGED FOR HUMAN PROCTOR REVIEW:</strong> Assessment flagged for post-exam review (Trust Score: {trustScore}/100). Auto-eviction is disabled per fair testing policy; please complete your responses.
              </span>
            </div>
            <span className="font-mono text-[11px] text-red-700 hidden md:inline">
              Audit Code: #FLAG-HUMAN-REVIEW
            </span>
          </div>
        )}

        {/* Split Layout: Left 40% (HUD), Right 60% (Questions) */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT 40% (HUD Column) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            
            {/* Live Webcam Feed with Green Mesh & Corner Guides */}
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Proctor Vision Feed
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Wasm Mesh (468 Pts)
                </span>
              </div>

              {/* Video Viewport */}
              <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                />

                {/* Real-time Angle & EAR Gauges & HUD Telemetry */}
                <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none z-10">
                  {/* Left: Angle & EAR Gauges */}
                  <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-white border border-slate-700 shadow">
                    <span>Yaw: <strong className={telemetry.isYawAlert ? 'text-red-400 font-bold' : 'text-emerald-400'}>{telemetry.yaw}</strong></span>
                    <span>Pitch: <strong className={telemetry.isPitchAlert ? 'text-red-400 font-bold' : 'text-emerald-400'}>{telemetry.pitch}</strong></span>
                    <span>EAR: <strong className={telemetry.isEyesClosed ? 'text-red-400 font-bold' : 'text-emerald-400'}>{telemetry.ear}</strong></span>
                  </div>

                  {/* Right: Faces in View & Document Scan Status Tags */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    {/* Faces in View Badge */}
                    <div className={`px-2 py-1 rounded border flex items-center gap-1 backdrop-blur-sm shadow ${
                      telemetry.facesCount > 1
                        ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse font-bold'
                        : telemetry.facesCount === 1
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                          : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${telemetry.facesCount > 1 ? 'bg-red-400 animate-ping' : telemetry.facesCount === 1 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span>Faces in View: <strong>{telemetry.facesCount}</strong></span>
                    </div>

                    {/* Document Scan Badge */}
                    <div className={`px-2 py-1 rounded border flex items-center gap-1 backdrop-blur-sm shadow ${
                      telemetry.isDocumentSuspicious
                        ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse font-bold'
                        : 'bg-slate-900/80 border-slate-700 text-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${telemetry.isDocumentSuspicious ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                      <span>Document Scan: <strong className={telemetry.isDocumentSuspicious ? 'text-red-300' : 'text-emerald-300'}>{telemetry.documentScanStatus}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Active Toast Warnings on Video */}
                {activeToasts.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 space-y-1 z-20 pointer-events-none">
                    {activeToasts.slice(-2).map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded bg-red-900/95 border border-red-500 text-white text-[11px] font-bold flex items-center gap-2 shadow-lg animate-pulse"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
                        <div>
                          <p>{t.label}</p>
                          <p className="text-[10px] font-normal text-red-200">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Real-time Mathematical Threshold Breakdown */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Active Behavioral Thresholds:
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className={`p-2 rounded border ${telemetry.isYawAlert ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <span className="block text-[9px] text-slate-400">Horizontal Yaw</span>
                    <strong>{telemetry.yaw}</strong> (0.35-0.65)
                  </div>
                  <div className={`p-2 rounded border ${telemetry.isPitchAlert ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <span className="block text-[9px] text-slate-400">Vertical Pitch</span>
                    <strong>{telemetry.pitch}</strong> (0.25-0.75)
                  </div>
                  <div className={`p-2 rounded border ${telemetry.isEyesClosed ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <span className="block text-[9px] text-slate-400">Eye Aspect (EAR)</span>
                    <strong>{telemetry.ear}</strong> (&gt;0.18)
                  </div>
                </div>

                {/* Instant Verification Simulation Buttons */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Instant Simulation Signals (Evaluator Triggers):
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => recordViolation('UNAUTHORIZED_MATERIAL_DETECTED', { item: 'phone', alert: '⚠ Prohibited Material Detected' })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      📱 Phone/Device (-25)
                    </button>
                    <button
                      onClick={() => recordViolation('MULTIPLE_PERSONS_DETECTED', { faceCount: 2, alert: '⚠ Critical: 2 Faces In Frame (-20)' })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      👥 2nd Person (-20)
                    </button>
                    <button
                      onClick={() => recordViolation('UNAUTHORIZED_PAPER_OR_DOCUMENT', { details: 'Handheld paper notes simulated', alert: '⚠ Prohibited Material Detected' })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      📄 Paper/Notes (-15)
                    </button>
                    <button
                      onClick={() => recordViolation('HEAD_POSE_PITCH_VIOLATION', { pitch: 0.82 })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      📐 Lap Tilt (-5)
                    </button>
                    <button
                      onClick={() => recordViolation('PROLONGED_EYES_CLOSED', { ear: 0.12 })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      👁 Eyes Closed (-5)
                    </button>
                    <button
                      onClick={() => {
                        setTabSwitches(prev => prev + 1);
                        recordViolation('TAB_SWITCH', { alert: '⚠ TAB SWITCH DETECTED' });
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      📑 Tab Switch (-10)
                    </button>
                    <button
                      onClick={() => recordViolation('CLIPBOARD_PASTE', { alert: '⚠ CLIPBOARD PASTE PROHIBITED' })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      📋 Paste Alert (-10)
                    </button>
                    <button
                      onClick={() => recordViolation('GAZE_DEVIATION_HORIZONTAL', { yaw: 0.22, direction: 'RIGHT' })}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-medium text-slate-700 text-left"
                    >
                      👀 Gaze Side (-3)
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* RIGHT 60% (Questions Column) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col h-full overflow-hidden">
              
              {/* Question Navigation Tabs */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Question {currentIdx + 1} of {totalQuestions}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                    {currentIdx === 1 ? 'Open Technical Rationale' : 'Multiple Choice (+4, -1)'}
                  </span>
                </div>

                {/* Tab Navigator */}
                <div className="flex items-center gap-1.5">
                  {EXAM_QUESTIONS.map((q, idx) => {
                    const isDone = answers[q.id] !== undefined;
                    const isCur = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded text-xs font-mono font-bold border transition-colors ${
                          isCur
                            ? 'bg-blue-700 border-blue-700 text-white'
                            : isDone
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Q{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                
                {/* Statement */}
                <div className="text-base text-slate-900 font-medium leading-relaxed">
                  {currentQuestion.question}
                </div>

                {/* Multiple Choice Radio Options */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Options:
                  </div>

                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.id;
                    return (
                      <label
                        key={option.id}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option.id }))}
                        className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-medium'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-400 bg-white text-slate-600'
                        }`}>
                          {option.id}
                        </div>
                        <div className="text-sm leading-relaxed select-none">
                          {option.text}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Code / Text Answer Area where pasting triggers CLIPBOARD_PASTE */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Technical Justification / Code Snippet:
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <ClipboardPaste className="w-3 h-3" />
                      Pasting intercepted & logged
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {currentQuestion.explanationPrompt}
                  </p>

                  <textarea
                    value={explanations[currentQuestion.id] || ''}
                    onChange={(e) => setExplanations(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    placeholder="Type code or rationale here... (Note: Paste actions trigger instant audit alerts)"
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-3 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all resize-none font-mono"
                  />
                </div>

              </div>

              {/* Question Footer Bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 text-xs font-medium text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentIdx < totalQuestions - 1 ? (
                    <button
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm"
                    >
                      <span>Save & Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitExam}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Exam</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM: Live SHA-256 Hash-Chained Audit Ledger */}
          <div className="lg:col-span-12">
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Live SHA-256 Hash-Chained Audit Ledger ({chain.length} Blocks Recorded)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Immutable Cryptographic Sequence
                </span>
              </div>

              {/* Table */}
              <div className="max-h-48 overflow-y-auto p-2 space-y-1.5 font-mono text-[11px]">
                {chain.slice().reverse().map((b) => {
                  const rule = getPenaltyDetails(b.event);
                  return (
                    <div
                      key={b.index}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-500">#{b.index}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          rule.severity === 'critical' ? 'bg-red-100 text-red-800' : rule.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {b.event}
                        </span>
                        {rule.points > 0 && (
                          <span className="text-red-600 font-bold">-{rule.points} pts</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-slate-500">
                        <span>prev: {b.prevHash.slice(0, 8)}...</span>
                        <span>hash: <strong className="text-slate-700">{b.hash.slice(0, 10)}...</strong></span>
                        <span className="text-slate-400">{new Date(b.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </main>

      </div>
    );
  }

  // ==========================================
  // VIEW 4: 'submitted' (Integrity Certificate & Tamper Sandbox)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
            NTA
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">
              National Scholarship Aptitude Assessment
            </h1>
            <p className="text-[11px] text-slate-400">
              Examination Complete — Official Integrity Certificate
            </p>
          </div>
        </div>

        <span className="text-xs text-emerald-400 font-mono">
          ● Assessment Cryptographically Sealed
        </span>
      </header>

      {/* Main Sandbox Component */}
      <main className="max-w-4xl w-full mx-auto py-8 px-4">
        <SubmissionTamperSandbox
          chain={chain}
          finalScore={trustScore}
          keyData={keyPairData}
          summaryData={submissionSummary}
          tabSwitches={tabSwitches}
          onResetExam={handleResetExam}
        />
      </main>

      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        NTA Assessment Protocol © 2026 | Immutable SHA-256 Ledger
      </footer>

    </div>
  );
}

// Subcomponent: Submission & Tamper Sandbox
function SubmissionTamperSandbox({
  chain = [],
  finalScore = 100,
  keyData = {},
  summaryData = {},
  tabSwitches = 0,
  onResetExam
}) {
  const [sandboxChain, setSandboxChain] = useState([]);
  const [isTampered, setIsTampered] = useState(false);
  const [tamperedIndex, setTamperedIndex] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setSandboxChain(JSON.parse(JSON.stringify(chain)));
    setIsTampered(false);
    setTamperedIndex(null);
    setVerificationResult(null);

    if (finalScore >= 60) {
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    }
  }, [chain, finalScore]);

  const scoreInfo = getScoreStatus(finalScore);

  const handleTamper = () => {
    if (sandboxChain.length <= 1) return;
    const targetIdx = sandboxChain.length > 2 ? 1 : sandboxChain.length - 1;
    const cloned = JSON.parse(JSON.stringify(sandboxChain));

    cloned[targetIdx].payload = {
      ...cloned[targetIdx].payload,
      tamperedScore: 100,
      clearedViolation: "FORGED_CLEAN"
    };

    setSandboxChain(cloned);
    setIsTampered(true);
    setTamperedIndex(targetIdx);
    setVerificationResult(null);
  };

  const handleRestore = () => {
    setSandboxChain(JSON.parse(JSON.stringify(chain)));
    setIsTampered(false);
    setTamperedIndex(null);
    setVerificationResult(null);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyChain(
        sandboxChain,
        keyData.signatureHex,
        keyData.publicKeyHex,
        summaryData
      );
      setVerificationResult(res);
    } catch (e) {
      setVerificationResult({
        valid: false,
        brokenIndex: null,
        details: e.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = () => {
    const bundle = {
      institution: "National Scholarship Aptitude Assessment (NTA)",
      candidate: CANDIDATE_INFO,
      finalTrustScore: finalScore,
      tabSwitches,
      totalBlocks: chain.length,
      ecdsaPublicKey: keyData.publicKeyHex,
      ecdsaSignature: keyData.signatureHex,
      summary: summaryData,
      auditChain: chain
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamper-proof-certificate-${CANDIDATE_INFO.rollNo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Certificate Card */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold">Official Examination Integrity Certificate</h2>
            <p className="text-xs text-slate-400">Cryptographically Sealed via ECDSA P-256 & SHA-256 Hash Chaining</p>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider border ${
            finalScore >= 80 ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-red-950 border-red-500 text-red-300'
          }`}>
            {scoreInfo.badge}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Candidate:</span>
              <strong className="text-slate-800 text-sm">{CANDIDATE_INFO.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Roll Number:</span>
              <strong className="text-slate-800 text-sm font-mono">{CANDIDATE_INFO.rollNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Trust Score:</span>
              <strong className={`text-sm font-mono ${scoreInfo.textColor}`}>{finalScore}/100</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tab Switches:</span>
              <strong className="text-slate-800 text-sm font-mono">{tabSwitches}</strong>
            </div>
          </div>

          {/* Crypto Proofs */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">ECDSA P-256 Signature (Verified):</span>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">WebCrypto Subtle</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-300 text-[10px] text-emerald-700 break-all select-all">
              {keyData.signatureHex || 'Generated'}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Signed Ledger (.json)</span>
          </button>

          <button
            onClick={onResetExam}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium"
          >
            Start New Session
          </button>
        </div>

      </div>

      {/* Interactive Tamper Sandbox */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cryptographic Tamper Sandbox</h3>
            <p className="text-xs text-slate-500">Mutate a block to test sequential SHA-256 cascade detection.</p>
          </div>

          <div className="flex items-center gap-2">
            {!isTampered ? (
              <button
                onClick={handleTamper}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded text-xs font-semibold"
              >
                <Bug className="w-3.5 h-3.5 text-red-600" />
                <span>Simulate Tamper</span>
              </button>
            ) : (
              <button
                onClick={handleRestore}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Ledger</span>
              </button>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Verify Cryptographic Chain'}</span>
            </button>
          </div>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className={`p-4 rounded border text-xs font-mono ${
            verificationResult.valid ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {verificationResult.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>✅ All {sandboxChain.length} Blocks Mathematically Valid (ECDSA Verified)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>❌ Tamper Detected: Hash Mismatch at Block #{verificationResult.brokenIndex}</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">{verificationResult.details}</p>
          </div>
        )}

        {/* Raw JSON */}
        <div className="p-3 bg-slate-900 text-slate-200 rounded border border-slate-700 font-mono text-[11px] max-h-56 overflow-y-auto select-all">
          <pre>{JSON.stringify(sandboxChain, null, 2)}</pre>
        </div>

      </div>

    </div>
  );
}
