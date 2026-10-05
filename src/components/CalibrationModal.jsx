import React, { useState, useEffect } from 'react';
import { CheckCircle2, Compass, Sparkles, Video } from 'lucide-react';

export function CalibrationModal({
  isOpen,
  videoRef,
  onCompleteCalibration,
  sampleOrientationOnce
}) {
  const [countdown, setCountdown] = useState(5);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [samples, setSamples] = useState([]);
  const [guidanceMessage, setGuidanceMessage] = useState('Position yourself directly in front of the camera and look forward.');

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(5);
    setIsCalibrating(true);
    setSamples([]);
    setGuidanceMessage('Align your face in the center and hold steady...');

    const sampleInterval = setInterval(async () => {
      if (sampleOrientationOnce) {
        const sample = await sampleOrientationOnce();
        if (sample) {
          setSamples((prev) => [...prev, sample]);
        }
      }
    }, 350);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(sampleInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(sampleInterval);
    };
  }, [isOpen, sampleOrientationOnce]);

  useEffect(() => {
    if (countdown === 0 && isCalibrating) {
      setIsCalibrating(false);

      // Compute average baseline from collected samples
      let avgYaw = 0;
      let avgPitch = 0;
      if (samples.length > 0) {
        avgYaw = Math.round(samples.reduce((acc, s) => acc + s.yaw, 0) / samples.length);
        avgPitch = Math.round(samples.reduce((acc, s) => acc + s.pitch, 0) / samples.length);
      }

      setGuidanceMessage('Calibration successful! Baseline locked.');
      setTimeout(() => {
        onCompleteCalibration({
          yaw: avgYaw,
          pitch: avgPitch,
          samplesCount: samples.length
        });
      }, 700);
    }
  }, [countdown, isCalibrating, samples, onCompleteCalibration]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          
          {/* Header */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biometric Zero-Knowledge Baseline</span>
          </div>

          <h2 className="text-xl font-bold text-gray-100 mb-1">
            5-Second Neutral Face Calibration
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Establishing neutral head orientation baseline before initializing proctoring timer.
          </p>

          {/* Visual Focus Ring with Live Video Preview */}
          <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
            
            {/* Outer animated ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40 animate-spin" style={{ animationDuration: '10s' }} />

            {/* Inner target circle with live video feed or countdown */}
            <div className="relative w-40 h-40 rounded-full bg-gray-950 border-2 border-blue-500 overflow-hidden flex flex-col items-center justify-center shadow-lg shadow-blue-500/20">
              
              {/* Countdown / Locked Indicator */}
              <div className="absolute inset-0 z-10 bg-black/40 flex flex-col items-center justify-center">
                {countdown > 0 ? (
                  <>
                    <span className="text-5xl font-extrabold font-mono text-white drop-shadow-md">
                      {countdown}
                    </span>
                    <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-widest mt-1">
                      Calibrating...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-pulse drop-shadow" />
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
                      Baseline Locked
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Radar crosshairs */}
            <div className="absolute w-full h-[1px] bg-blue-500/30 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-blue-500/30 pointer-events-none" />
          </div>

          {/* Guidance status message */}
          <div className="p-3 bg-gray-950/80 rounded-lg border border-gray-800 text-xs font-mono text-gray-300 mb-4">
            <p>{guidanceMessage}</p>
            {samples.length > 0 && (
              <p className="text-[10px] text-blue-400 mt-1">
                Captured {samples.length} valid facial pose vectors
              </p>
            )}
          </div>

          <p className="text-[11px] text-gray-500">
            Please look directly forward at the center crosshair.
          </p>

        </div>

      </div>
    </div>
  );
}
