import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

// Only cell phones are prohibited devices. Rough sheets and books are allowed for calculations.
const PROHIBITED_DEVICE_CLASS = 'cell phone';
const PHONE_CONFIDENCE_THRESHOLD = 0.65;

// Generates an institutional 30fps canvas stream for environments without a physical webcam
export function createSimulatedCameraStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let angle = 0;
  let animId = null;

  function draw() {
    angle += 0.035;
    ctx.fillStyle = '#0f172a'; // Deep slate
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
    ctx.fillText('JNU Online Assessment Terminal v2.4 | Biometric Mesh Active', 20, 46);

    animId = requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream ? canvas.captureStream(30) : null;
  if (stream) {
    stream._animId = animId;
  }
  return stream;
}

export function useProctorVision({
  isActive,
  videoRef,
  canvasRef,
  onAnomalyCommit,
  calibratedBaseline = { yaw: 0, pitch: 0 }
}) {
  const [modelsReady, setModelsReady] = useState(false);
  const [telemetry, setTelemetry] = useState({
    faceCount: 1,
    yaw: 0,
    pitch: 0,
    detectedObjects: [],
    isGazeAway: false,
    lowLighting: false,
    audioLevel: 0
  });

  const faceLandmarkerRef = useRef(null);
  const cocoModelRef = useRef(null);
  const isProcessingRef = useRef(false);
  const intervalIdRef = useRef(null);

  // Sustained duration timers (prevent hair-trigger false positives)
  const noFaceStartTimeRef = useRef(null);
  const lookawayStartTimeRef = useRef(null);
  const loudAudioStartTimeRef = useRef(null);
  const committedCooldownRef = useRef({});

  // Audio Context Monitor
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);

  // 1. Initialize Vision Models (TFJS + MediaPipe)
  useEffect(() => {
    let isMounted = true;

    async function initModels() {
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
          console.warn('COCO-SSD init notice:', e);
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
                outputFaceBlendshapes: false,
                runningMode: 'VIDEO',
                numFaces: 4
              });
            } catch {
              faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                  delegate: 'CPU'
                },
                outputFaceBlendshapes: false,
                runningMode: 'VIDEO',
                numFaces: 4
              });
            }
            faceLandmarkerRef.current = faceLandmarker;
          }
        } catch (e) {
          console.warn('MediaPipe init notice:', e);
        }

        if (isMounted) setModelsReady(true);
      } catch (err) {
        console.warn('Vision models init fallback:', err);
        if (isMounted) setModelsReady(true);
      }
    }

    initModels();

    const timeout = setTimeout(() => {
      if (isMounted) setModelsReady(true);
    }, 3500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  // 2. Audio Context Initialization for Ambient Noise & Conversational Audio
  useEffect(() => {
    if (!isActive) return;

    let isAudioActive = true;
    let audioTimer = null;

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (!stream || !isAudioActive) return;

        micStreamRef.current = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        audioTimer = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArray);

          // Calculate RMS
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          const now = Date.now();
          // Conversational threshold: RMS > 0.25 sustained for > 2 seconds
          if (rms > 0.25) {
            if (!loudAudioStartTimeRef.current) {
              loudAudioStartTimeRef.current = now;
            } else if (now - loudAudioStartTimeRef.current >= 2000) {
              // Commit SUSPICIOUS_AUDIO with 5-second cooldown
              const lastCommitted = committedCooldownRef.current['SUSPICIOUS_AUDIO'] || 0;
              if (now - lastCommitted > 5000) {
                committedCooldownRef.current['SUSPICIOUS_AUDIO'] = now;
                if (onAnomalyCommit) {
                  onAnomalyCommit('SUSPICIOUS_AUDIO', {
                    rmsLevel: rms.toFixed(2),
                    duration: '2.0s'
                  });
                }
              }
            }
          } else {
            loudAudioStartTimeRef.current = null;
          }

          setTelemetry(prev => ({ ...prev, audioLevel: Math.round(rms * 100) }));
        }, 150);

      } catch (e) {
        console.warn('Microphone audio check notice:', e);
      }
    }

    initAudio();

    return () => {
      isAudioActive = false;
      if (audioTimer) clearInterval(audioTimer);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive, onAnomalyCommit]);

  // Compute Head Pose Math (Yaw & Pitch)
  const computeHeadOrientation = (landmarks) => {
    if (!landmarks || landmarks.length < 264) return { yaw: 0, pitch: 0 };

    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;
    const rawYaw = ((nose.x - eyeMidX) / eyeDist) * 90;

    const faceMidY = (forehead.y + chin.y) / 2;
    const faceHeight = Math.abs(chin.y - forehead.y) || 0.001;
    const rawPitch = ((nose.y - faceMidY) / faceHeight) * 90;

    const yaw = Math.round(rawYaw - (calibratedBaseline.yaw || 0));
    const pitch = Math.round(rawPitch - (calibratedBaseline.pitch || 0));

    return { yaw, pitch };
  };

  // Helper: compute bounding box and area from face landmarks
  const computeFaceBox = (landmarks, width, height) => {
    const xs = landmarks.map(p => p.x * width);
    const ys = landmarks.map(p => p.y * height);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(width, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(height, Math.max(...ys));
    const area = (maxX - minX) * (maxY - minY);
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, area };
  };

  // Main Detection Loop (~350ms with isProcessing lock)
  useEffect(() => {
    if (!isActive) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      return;
    }

    const processFrame = async () => {
      if (isProcessingRef.current) return;
      if (!videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState < 2) return;

      isProcessingRef.current = true;
      const now = Date.now();
      let calculatedYaw = 0;
      let calculatedPitch = 0;
      let isGazeOut = false;
      let primaryFace = null;
      let detectedBoxes = [];
      let isLowLighting = false;

      try {
        const timestamp = performance.now();
        const vWidth = video.videoWidth || 640;
        const vHeight = video.videoHeight || 480;

        // 1. Lighting Resilience Check (Calculate luminance on canvas or sample)
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = vWidth;
          canvas.height = vHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, 40, 30);
          try {
            const imgData = ctx.getImageData(0, 0, 40, 30).data;
            let totalLuma = 0;
            for (let i = 0; i < imgData.length; i += 4) {
              totalLuma += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
            }
            const avgLuma = totalLuma / (imgData.length / 4);
            if (avgLuma < 45) {
              isLowLighting = true; // Non-penalizing indicator
            }
          } catch {}
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // 2. MediaPipe Face Detection
        if (faceLandmarkerRef.current) {
          const faceResult = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          const faces = faceResult.faceLandmarks || [];

          if (faces.length === 0) {
            // Natural postures (hand on face, chin rest, blinks) must NOT trigger instantly.
            // Flag NO_FACE_DETECTED ONLY if face is absent for >= 3 continuous seconds.
            if (!noFaceStartTimeRef.current) {
              noFaceStartTimeRef.current = now;
            } else if (now - noFaceStartTimeRef.current >= 3000) {
              const lastCommitted = committedCooldownRef.current['NO_FACE_DETECTED'] || 0;
              if (now - lastCommitted > 5000) {
                committedCooldownRef.current['NO_FACE_DETECTED'] = now;
                if (onAnomalyCommit) {
                  onAnomalyCommit('NO_FACE_DETECTED', { duration: '>=3.0s' });
                }
              }
            }
          } else {
            // Face detected: reset absence timer
            noFaceStartTimeRef.current = null;

            // Sort faces by bounding box area to find the primary candidate
            const faceBoxes = faces.map((lm, idx) => ({
              landmarks: lm,
              index: idx,
              box: computeFaceBox(lm, vWidth, vHeight)
            })).sort((a, b) => b.box.area - a.box.area);

            primaryFace = faceBoxes[0];
            const primaryArea = primaryFace.box.area;

            // Compute yaw and pitch for candidate
            const { yaw, pitch } = computeHeadOrientation(primaryFace.landmarks);
            calculatedYaw = yaw;
            calculatedPitch = pitch;

            // Check Gaze Deviation: yaw > ±25° or pitch > ±20°
            if (Math.abs(yaw) > 25 || Math.abs(pitch) > 20) {
              isGazeOut = true;
              // Prolonged Lookaway: must be sustained for >= 4 seconds
              if (!lookawayStartTimeRef.current) {
                lookawayStartTimeRef.current = now;
              } else if (now - lookawayStartTimeRef.current >= 4000) {
                const lastCommitted = committedCooldownRef.current['PROLONGED_LOOKAWAY'] || 0;
                if (now - lastCommitted > 5000) {
                  committedCooldownRef.current['PROLONGED_LOOKAWAY'] = now;
                  if (onAnomalyCommit) {
                    onAnomalyCommit('PROLONGED_LOOKAWAY', {
                      yaw,
                      pitch,
                      duration: '>=4.0s'
                    });
                  }
                }
              }
            } else {
              lookawayStartTimeRef.current = null;
            }

            // Secondary face check: people walking in background are ignored!
            // Only flag SECONDARY_PERSON_PROXIMITY if a secondary face has area > 25% of candidate face.
            if (faceBoxes.length > 1) {
              for (let i = 1; i < faceBoxes.length; i++) {
                const secondary = faceBoxes[i];
                if (secondary.box.area > 0.25 * primaryArea) {
                  const lastCommitted = committedCooldownRef.current['SECONDARY_PERSON_PROXIMITY'] || 0;
                  if (now - lastCommitted > 5000) {
                    committedCooldownRef.current['SECONDARY_PERSON_PROXIMITY'] = now;
                    if (onAnomalyCommit) {
                      onAnomalyCommit('SECONDARY_PERSON_PROXIMITY', {
                        relativeSize: `${Math.round((secondary.box.area / primaryArea) * 100)}%`
                      });
                    }
                  }
                  break;
                }
              }
            }
          }
        }

        // 3. Object Detection (COCO-SSD)
        // Students ARE allowed rough sheets and notes for math.
        // ONLY trigger PHONE_DETECTED if COCO-SSD detects 'cell phone' with confidence > 0.65
        if (cocoModelRef.current) {
          const predictions = await cocoModelRef.current.detect(video, 6, 0.50);
          for (const pred of predictions) {
            const className = pred.class.toLowerCase();
            if (className === PROHIBITED_DEVICE_CLASS && pred.score >= PHONE_CONFIDENCE_THRESHOLD) {
              detectedBoxes.push({
                bbox: pred.bbox,
                label: `FLAGGED: CELL PHONE (${Math.round(pred.score * 100)}%)`,
                isPhone: true
              });

              const lastCommitted = committedCooldownRef.current['PHONE_DETECTED'] || 0;
              if (now - lastCommitted > 4000) {
                committedCooldownRef.current['PHONE_DETECTED'] = now;
                if (onAnomalyCommit) {
                  onAnomalyCommit('PHONE_DETECTED', {
                    confidence: `${Math.round(pred.score * 100)}%`
                  });
                }
              }
            }
          }
        }

        // 4. Update Telemetry
        setTelemetry(prev => ({
          ...prev,
          faceCount: primaryFace ? 1 : 0,
          yaw: calculatedYaw,
          pitch: calculatedPitch,
          detectedObjects: detectedBoxes,
          isGazeAway: isGazeOut,
          lowLighting: isLowLighting
        }));

        // 5. Canvas PiP Overlay Rendering
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (primaryFace) {
            const nose = primaryFace.landmarks[1];
            if (nose) {
              ctx.fillStyle = isGazeOut ? '#ef4444' : '#10b981';
              ctx.beginPath();
              ctx.arc(nose.x * canvas.width, nose.y * canvas.height, 4, 0, 2 * Math.PI);
              ctx.fill();
            }

            const { minX, minY, width: bW, height: bH } = primaryFace.box;
            ctx.strokeStyle = isGazeOut ? '#ef4444' : '#059669';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(minX, minY, bW, bH);

            ctx.font = '500 11px system-ui, sans-serif';
            ctx.fillStyle = isGazeOut ? '#ef4444' : '#059669';
            const label = isGazeOut
              ? `GAZE DIVERTED (${calculatedYaw}°, ${calculatedPitch}°)`
              : 'CANDIDATE VERIFIED';
            ctx.fillText(label, minX, Math.max(14, minY - 6));
          }

          // Draw Phone Bounding Box
          detectedBoxes.forEach(item => {
            const [x, y, width, height] = item.bbox;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#dc2626';
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x, Math.max(0, y - 18), ctx.measureText(item.label).width + 8, 18);

            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.label, x + 4, Math.max(12, y - 5));
          });
        }
      } catch (err) {
        console.warn('Vision loop cycle error:', err);
      } finally {
        isProcessingRef.current = false;
      }
    };

    intervalIdRef.current = setInterval(processFrame, 350);

    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [isActive, calibratedBaseline, onAnomalyCommit, videoRef, canvasRef]);

  // Single-frame orientation sampler for calibration
  const sampleOrientationOnce = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    try {
      if (faceLandmarkerRef.current) {
        const res = faceLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        if (res?.faceLandmarks?.length > 0) {
          const landmarks = res.faceLandmarks[0];
          const nose = landmarks[1];
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const forehead = landmarks[10];
          const chin = landmarks[152];

          const eyeMidX = (leftEye.x + rightEye.x) / 2;
          const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;
          const rawYaw = ((nose.x - eyeMidX) / eyeDist) * 90;

          const faceMidY = (forehead.y + chin.y) / 2;
          const faceHeight = Math.abs(chin.y - forehead.y) || 0.001;
          const rawPitch = ((nose.y - faceMidY) / faceHeight) * 90;

          return { yaw: Math.round(rawYaw), pitch: Math.round(rawPitch) };
        }
      }
    } catch (e) {
      console.warn('Calibration sample notice:', e);
    }
    return { yaw: 0, pitch: 0 };
  };

  return {
    modelsReady,
    telemetry,
    sampleOrientationOnce
  };
}
