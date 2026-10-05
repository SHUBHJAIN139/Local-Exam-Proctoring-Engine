import React, { useState } from 'react';
import { 
  Users, 
  Smartphone, 
  Compass, 
  Sparkles, 
  AlertCircle,
  Sun,
  Mic,
  Volume2
} from 'lucide-react';

export function CandidatePiP({
  videoRef,
  canvasRef,
  telemetry = {},
  activeToasts = [],
  onSimulateAnomaly
}) {
  const [showSimMenu, setShowSimMenu] = useState(false);

  const isAlert = telemetry.isGazeAway;

  return (
    <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col">
      
      {/* PiP Header */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">
            Candidate Video Verification
          </span>
        </div>

        <button
          onClick={() => setShowSimMenu(!showSimMenu)}
          className="text-[10px] text-slate-600 hover:text-slate-900 border border-slate-300 bg-white px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1"
          title="Simulate anomalies to test cryptographic ledger"
        >
          <Sparkles className="w-3 h-3 text-slate-500" />
          <span>Test Signals</span>
        </button>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Live HTML5 Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover transform -scale-x-100"
        />

        {/* Overlay Canvas for Nose Dot & Corner Guide Box */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
        />

        {/* Top Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 border border-slate-700">
          <Compass className="w-3 h-3 text-slate-400" />
          <span>Yaw: <strong className={Math.abs(telemetry.yaw) > 25 ? 'text-red-400' : 'text-emerald-400'}>{telemetry.yaw}°</strong></span>
          <span>Pitch: <strong className={Math.abs(telemetry.pitch) > 20 ? 'text-red-400' : 'text-emerald-400'}>{telemetry.pitch}°</strong></span>
        </div>

        {/* Audio & Status Indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 border border-slate-700">
          <Volume2 className="w-3 h-3 text-emerald-400" />
          <span>Mic: {telemetry.audioLevel || 0}%</span>
        </div>

        {/* Low Ambient Lighting Non-Penalizing Alert */}
        {telemetry.lowLighting && (
          <div className="absolute top-10 left-2 right-2 bg-amber-500/90 text-amber-950 px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow">
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span>Low Ambient Lighting (Adjust Lamp)</span>
          </div>
        )}

        {/* Active Toast Warnings */}
        {activeToasts.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 space-y-1 z-20 pointer-events-none">
            {activeToasts.slice(-1).map((t) => (
              <div
                key={t.id}
                className="p-1.5 rounded bg-red-900/90 border border-red-500 text-white text-[10px] font-medium flex items-center gap-1.5 shadow-md"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-300 shrink-0" />
                <span>{t.label} ({t.points > 0 ? `-${t.points} pts` : ''})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unobtrusive Test Triggers (For immediate evaluator verification) */}
      {showSimMenu && (
        <div className="p-2 bg-slate-50 border-t border-slate-200 text-xs space-y-1.5 animate-fadeIn">
          <div className="text-[10px] font-semibold text-slate-600 uppercase">
            Examiner Simulation Triggers:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onSimulateAnomaly('PHONE_DETECTED')}
              className="px-2 py-1 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-left font-medium transition-colors"
            >
              📱 Cell Phone (-20)
            </button>
            <button
              onClick={() => onSimulateAnomaly('SECONDARY_PERSON_PROXIMITY')}
              className="px-2 py-1 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-left font-medium transition-colors"
            >
              👥 Proximity Flag (-15)
            </button>
            <button
              onClick={() => onSimulateAnomaly('PROLONGED_LOOKAWAY')}
              className="px-2 py-1 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-left font-medium transition-colors"
            >
              👀 Lookaway &gt;4s (-5)
            </button>
            <button
              onClick={() => onSimulateAnomaly('NO_FACE_DETECTED')}
              className="px-2 py-1 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-left font-medium transition-colors"
            >
              👤 Missing Face &gt;3s (-10)
            </button>
            <button
              onClick={() => onSimulateAnomaly('SUSPICIOUS_AUDIO')}
              className="px-2 py-1 text-[10px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-left font-medium transition-colors col-span-2"
            >
              🔊 Conversational Audio (-5)
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Rough Sheets: Permitted</span>
        <span>0 B Outbound</span>
      </div>

    </div>
  );
}
