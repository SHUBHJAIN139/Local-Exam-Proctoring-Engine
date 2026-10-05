import React, { useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  AlertTriangle, 
  Eye, 
  Users, 
  Smartphone, 
  Activity, 
  Sparkles, 
  Compass, 
  Layers
} from 'lucide-react';
import { PENALTY_RULES } from '../utils/scoring';

export function VisionHUD({
  videoRef,
  canvasRef,
  cameraActive,
  cameraError,
  onStartCamera,
  telemetry,
  activeToasts = [],
  onSimulateViolation
}) {
  const [showSimControls, setShowSimControls] = useState(false);

  // Debounce buffer representation: 5 slots
  const bufferSlots = [0, 1, 2, 3, 4];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* HUD Header */}
      <div className="bg-gray-950/80 px-3 py-2 border-b border-gray-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              cameraActive ? 'bg-emerald-400' : 'bg-red-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              cameraActive ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
          </span>
          <span className="font-semibold text-gray-200 uppercase tracking-wider text-[11px]">
            Vision HUD (MediaPipe + TFJS)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimControls(!showSimControls)}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
            title="Toggle simulation triggers to test audit engine without physical props"
          >
            <Sparkles className="w-3 h-3" />
            <span>Simulate Anomaly</span>
          </button>
        </div>
      </div>

      {/* Video & Canvas Viewport */}
      <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transform -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Canvas Overlay for Face Mesh & Object Bounding Boxes */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
            cameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Camera Inactive / Permission Error Fallback */}
        {!cameraActive && (
          <div className="p-6 text-center max-w-sm flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-3">
              <CameraOff className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-200 mb-1">
              {cameraError ? 'Camera Access Required' : 'Webcam Standby'}
            </p>
            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
              {cameraError || 'Local-first proctoring requires webcam access to verify candidate orientation and screen boundaries.'}
            </p>
            <button
              onClick={onStartCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-blue-600/30"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Enable Camera</span>
            </button>
          </div>
        )}

        {/* Real-time Viewport Corner Metrics */}
        {cameraActive && (
          <>
            {/* Top Left: Head Pose (Yaw / Pitch) */}
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-gray-800 rounded px-2 py-1 text-[10px] font-mono text-gray-300 flex items-center gap-2">
              <Compass className="w-3 h-3 text-blue-400" />
              <span>Yaw: <strong className={Math.abs(telemetry.yaw) > 25 ? 'text-red-400' : 'text-emerald-400'}>{telemetry.yaw > 0 ? `+${telemetry.yaw}` : telemetry.yaw}°</strong></span>
              <span>Pitch: <strong className={Math.abs(telemetry.pitch) > 20 ? 'text-red-400' : 'text-emerald-400'}>{telemetry.pitch > 0 ? `+${telemetry.pitch}` : telemetry.pitch}°</strong></span>
            </div>

            {/* Top Right: Face Count */}
            <div className={`absolute top-2 right-2 backdrop-blur-md border rounded px-2 py-1 text-[10px] font-mono flex items-center gap-1.5 ${
              telemetry.faceCount === 1 
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/70 border-red-500/40 text-red-300 animate-pulse'
            }`}>
              <Users className="w-3 h-3" />
              <span>{telemetry.faceCount} {telemetry.faceCount === 1 ? 'Face' : 'Faces'}</span>
            </div>

            {/* Bottom Toasts on Camera */}
            {activeToasts.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 space-y-1 z-20 pointer-events-none">
                {activeToasts.slice(-2).map((toast) => (
                  <div
                    key={toast.id}
                    className="p-2 rounded bg-red-950/90 border border-red-500/60 backdrop-blur-md shadow-lg flex items-center gap-2 animate-bounce"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="text-[11px] leading-tight">
                      <p className="font-bold text-red-200">{toast.label}</p>
                      <p className="text-red-300/80 text-[10px]">{toast.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Telemetry & Rolling Debounce Indicator */}
      <div className="p-3 border-t border-gray-800 bg-gray-950/40 space-y-2.5 text-xs">
        
        {/* Rolling 5-Frame Debounce Status */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
            <span className="flex items-center gap-1 font-mono">
              <Layers className="w-3 h-3 text-blue-400" />
              Rolling 5-Frame Debounce Window
            </span>
            <span className="text-[10px] font-mono text-gray-500">
              Trigger: ≥3/5 frames
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {bufferSlots.map((idx) => {
              const hasAnomaly = telemetry.rawAnomalies && telemetry.rawAnomalies.length > 0;
              return (
                <div
                  key={idx}
                  className={`h-2 rounded-sm border transition-colors ${
                    hasAnomaly 
                      ? 'bg-red-500/40 border-red-500/60' 
                      : 'bg-emerald-500/20 border-emerald-500/30'
                  }`}
                  title={`Frame buffer slot #${idx + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Prohibited Devices / Object Detection Status */}
        <div className="bg-gray-900/80 rounded-lg p-2 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <span className="text-[11px] text-gray-300">Object Scanner (COCO-SSD):</span>
          </div>
          <div className="text-right">
            {telemetry.detectedObjects && telemetry.detectedObjects.some(o => o.isProhibited) ? (
              <span className="text-[11px] font-mono font-bold text-red-400 animate-pulse">
                PROHIBITED OBJECT!
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400">
                Workspace Clear
              </span>
            )}
          </div>
        </div>

        {/* Simulation Controls (Allows user to test all scenarios on demand) */}
        {showSimControls && (
          <div className="p-2.5 bg-gray-900/90 border border-blue-500/30 rounded-lg space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Rapid Test Triggers
              </span>
              <span className="text-[10px] text-gray-400">Simulates real detection events</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onSimulateViolation('PROHIBITED_DEVICE')}
                className="px-2 py-1 text-[10px] rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors text-left"
              >
                📱 Cell Phone (-25)
              </button>
              <button
                onClick={() => onSimulateViolation('MULTIPLE_FACES')}
                className="px-2 py-1 text-[10px] rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors text-left"
              >
                👥 Multiple Faces (-20)
              </button>
              <button
                onClick={() => onSimulateViolation('GAZE_AWAY')}
                className="px-2 py-1 text-[10px] rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors text-left"
              >
                👀 Look Away (-3)
              </button>
              <button
                onClick={() => onSimulateViolation('NO_FACE_DETECTED')}
                className="px-2 py-1 text-[10px] rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors text-left"
              >
                👤 Absent Face (-10)
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
