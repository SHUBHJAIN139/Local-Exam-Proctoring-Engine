import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Maximize, 
  Minimize, 
  WifiOff, 
  Info, 
  CheckCircle2,
  Send
} from 'lucide-react';
import { getScoreStatus } from '../utils/scoring';

export function InstitutionalHeader({
  candidateName = "Aarav Sharma",
  rollNo = "2026-CS-4891",
  examCode = "CS 401",
  examTitle = "Advanced Distributed Systems & Cryptographic Verification",
  timeLeftSeconds = 900,
  trustScore = 100,
  isFullscreen = false,
  onToggleFullscreen,
  onSubmitExam
}) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const scoreInfo = getScoreStatus(trustScore);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = timeLeftSeconds <= 120;

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Institutional Brand & Candidate Credentials */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                JNU
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wide uppercase text-slate-300">
                    JNU Online Assessment Terminal v2.4
                  </span>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded font-mono hover:bg-emerald-900/60 transition-colors"
                    title="Click to view client-side edge privacy verification"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Edge Engine: Active (0 B Outbound)</span>
                    <Info className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Candidate: <strong className="text-slate-200">{candidateName}</strong> | Roll: <strong className="text-slate-200 font-mono">{rollNo}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Center / Right: Timer, Trust Score, and Submit Button */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            
            {/* Countdown Timer Pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono font-medium ${
              isLowTime
                ? 'bg-red-950/70 border-red-500/60 text-red-300 animate-pulse'
                : 'bg-slate-800/90 border-slate-700 text-slate-200'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-red-400' : 'text-slate-400'}`} />
              <span className="text-slate-400 font-sans text-[11px]">Remaining:</span>
              <span className="font-bold tracking-wider">{formatTime(timeLeftSeconds)}</span>
            </div>

            {/* Trust Score Pill */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1 rounded text-xs">
              <span className="text-[11px] text-slate-400">Trust Score:</span>
              <span className={`font-mono font-bold ${
                trustScore >= 80 ? 'text-emerald-400' : trustScore >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {trustScore}/100
              </span>
              <span className={`w-2 h-2 rounded-full ${
                trustScore >= 80 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Exam Fullscreen Mode"}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onSubmitExam}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all"
              >
                <Send className="w-3 h-3" />
                <span>Submit Exam</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Privacy Guarantee Disclosure Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-300 max-w-lg w-full p-6 shadow-xl text-slate-800 relative">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-3">
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Institutional Local-First Architecture</h3>
                <p className="text-xs text-emerald-700 font-mono">0 B Outbound Video Telemetry Guarantee</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed mb-5">
              <p>
                In strict accordance with student privacy protection standards, this examination terminal runs <strong className="text-slate-800">100% of biometric and object detection locally in-browser</strong>:
              </p>
              <ul className="space-y-2 pl-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zero Video Streaming:</strong> Neither video frames nor audio are uploaded to external servers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Wasm & WebGL Models:</strong> MediaPipe Face Mesh and TensorFlow.js execute inside local memory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>SHA-256 Ledger:</strong> Only cryptographic hashes of state events are recorded and signed via ECDSA.</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded"
              >
                Close Disclosure
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
