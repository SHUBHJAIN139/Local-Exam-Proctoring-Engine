import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Clock, 
  Maximize, 
  Minimize, 
  WifiOff, 
  Lock, 
  CheckCircle2, 
  Info,
  Send
} from 'lucide-react';
import { getScoreStatus } from '../utils/scoring';

export function TopBar({ 
  courseTitle = "CS 401: Advanced Distributed Systems & Cryptographic Verification",
  timeLeftSeconds,
  trustScore,
  isFullscreen,
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

  const isLowTime = timeLeftSeconds <= 120; // 2 minutes left

  return (
    <>
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Exam Info & Privacy Badge */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Local-First Proctor</span>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-colors"
                  title="Click to view client-side architecture guarantee"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Zero Cloud Data Transfer | 0 KB Outbound</span>
                  <Info className="w-3 h-3 ml-0.5" />
                </button>
              </div>
              <h1 className="text-sm md:text-base font-bold text-gray-100 truncate max-w-md">
                {courseTitle}
              </h1>
            </div>
          </div>

          {/* Center: Timer & Trust Score */}
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-center">
            
            {/* 15-Minute Countdown Timer */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono ${
              isLowTime 
                ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse' 
                : 'bg-gray-800/80 border-gray-700 text-gray-200'
            }`}>
              <Clock className={`w-4 h-4 ${isLowTime ? 'text-red-400' : 'text-blue-400'}`} />
              <span className="text-xs text-gray-400 uppercase font-sans">Time Left:</span>
              <span className="text-sm font-bold tracking-wider">{formatTime(timeLeftSeconds)}</span>
            </div>

            {/* Trust Score Bar */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {trustScore >= 80 ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : trustScore >= 50 ? (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-400 font-sans">Trust Score:</span>
                  <span className={`text-sm font-bold font-mono ${scoreInfo.textColor}`}>
                    {trustScore}/100
                  </span>
                </div>
                <div className="w-32 bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      trustScore >= 80 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Proctor Mode"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              onClick={onSubmitExam}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs md:text-sm shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>

        </div>
      </header>

      {/* Zero Cloud Data Privacy Guarantee Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">Zero Cloud Data Transfer Guarantee</h3>
                <p className="text-xs text-emerald-400 font-mono">100% Client-Side In-Browser Execution</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed mb-6">
              <p>
                Unlike traditional surveillance proctoring platforms that stream candidate camera feeds to central servers, this engine executes <span className="text-white font-semibold">100% of ML inference locally</span> on your device:
              </p>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>WebAssembly & WebGL:</strong> MediaPipe Face Mesh & TensorFlow.js run directly inside browser memory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>0 Outbound Video Packets:</strong> No video frames, audio, or biometric scans ever leave this machine.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cryptographic Ledger:</strong> Anomaly timestamps and metadata are hash-chained via SHA-256 and signed with client-side ECDSA.</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-600"
              >
                Close Architecture Brief
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
