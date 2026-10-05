import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Download, 
  RotateCcw, 
  Bug, 
  Copy, 
  Check, 
  Key, 
  FileText,
  Printer
} from 'lucide-react';
import { verifyChain } from '../utils/cryptoAudit';
import { getScoreStatus } from '../utils/scoring';

export function TamperSandbox({
  chain = [],
  finalScore = 100,
  keyData = {},
  summaryData = {},
  timeElapsedSeconds = 0,
  answers = {},
  candidateName = "Aarav Sharma",
  rollNo = "2026-CS-4891",
  onResetExam
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);

  // Verification Sandbox State
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
  }, [chain]);

  const scoreInfo = getScoreStatus(finalScore);
  const totalViolations = chain.filter(b => b.event !== 'SESSION_INIT' && b.event !== 'CALIBRATION_COMPLETED').length;

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  // Export Signed Certificate & Ledger JSON
  const handleExportLedger = () => {
    const exportBundle = {
      institution: "JNU Online Assessment Terminal v2.4",
      candidateName,
      rollNumber: rollNo,
      exam: "CS 401: Advanced Distributed Systems & Cryptographic Verification",
      timestamp: new Date().toISOString(),
      finalTrustScore: finalScore,
      totalBlocks: chain.length,
      ecdsaPublicKey: keyData.publicKeyHex,
      ecdsaSignature: keyData.signatureHex,
      summary: summaryData,
      auditChain: chain
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-certificate-${rollNo}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simulate Tamper: Mutate score / payload in a block
  const handleSimulateTamper = () => {
    if (sandboxChain.length <= 1) return;

    const targetIdx = sandboxChain.length > 2 ? 1 : sandboxChain.length - 1;
    const cloned = JSON.parse(JSON.stringify(sandboxChain));

    // Maliciously alter payload without updating SHA-256 hash
    cloned[targetIdx].payload = {
      ...cloned[targetIdx].payload,
      tamperedScoreOverride: 100,
      forgedIntegrityStatus: "CLEARED_WITHOUT_PENALTY"
    };

    setSandboxChain(cloned);
    setIsTampered(true);
    setTamperedIndex(targetIdx);
    setVerificationResult(null);
  };

  // Restore untampered chain
  const handleRestoreChain = () => {
    setSandboxChain(JSON.parse(JSON.stringify(chain)));
    setIsTampered(false);
    setTamperedIndex(null);
    setVerificationResult(null);
  };

  // Cryptographic Verification
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyChain(
        sandboxChain,
        keyData.signatureHex,
        keyData.publicKeyHex,
        summaryData
      );
      setVerificationResult(result);
    } catch (err) {
      setVerificationResult({
        valid: false,
        brokenIndex: null,
        signatureValid: false,
        details: `Cryptographic engine error: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 animate-fadeIn">
      
      {/* 1. Official Institutional Certificate Card */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
        
        {/* Certificate Header Banner */}
        <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
              JNU
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">
                Institutional Integrity Certificate
              </h2>
              <p className="text-xs text-slate-400">
                JNU Online Assessment Terminal v2.4 | Cryptographically Sealed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider border ${
              finalScore >= 80 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : finalScore >= 50 
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300' 
                  : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}>
              {scoreInfo.badge}
            </span>
          </div>
        </div>

        {/* Candidate Details & Metrics Grid */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Candidate Name:</span>
              <strong className="text-slate-800 text-sm">{candidateName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Roll Number:</span>
              <strong className="text-slate-800 text-sm font-mono">{rollNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Final Trust Score:</span>
              <strong className={`text-sm font-mono ${scoreInfo.textColor}`}>{finalScore}/100</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Duration / Height:</span>
              <strong className="text-slate-800 text-sm font-mono">{formatSeconds(timeElapsedSeconds)} ({chain.length} Blocks)</strong>
            </div>
          </div>

          {/* Cryptographic Signature & Public Key Badges */}
          <div className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-slate-500" />
                ECDSA P-256 Digital Signature & Proofs:
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded">
                Verified via WebCrypto API
              </span>
            </div>

            {/* Public Key */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                <span>SPKI Public Key:</span>
                <button
                  onClick={() => copyText(keyData.publicKeyHex || '', 'key')}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 bg-white rounded border border-slate-300 font-mono text-[10px] text-slate-600 break-all select-all">
                {keyData.publicKeyHex || 'Generating...'}
              </div>
            </div>

            {/* Signature */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                <span>ECDSA Signature (Over Terminal Hash + Score):</span>
                <button
                  onClick={() => copyText(keyData.signatureHex || '', 'sig')}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {copiedSig ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSig ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 bg-white rounded border border-slate-300 font-mono text-[10px] text-emerald-700 font-medium break-all select-all">
                {keyData.signatureHex || 'Generating...'}
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Actions Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleExportLedger}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Signed Ledger (.json)</span>
          </button>

          <button
            onClick={onResetExam}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors"
          >
            Start New Session
          </button>
        </div>

      </div>

      {/* 2. Interactive Tamper Demo Sandbox */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Cryptographic Tamper Sandbox
            </h3>
            <p className="text-xs text-slate-500">
              Simulate an adversarial attack by altering a ledger block, then verify downstream SHA-256 cascade detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isTampered ? (
              <button
                onClick={handleSimulateTamper}
                disabled={sandboxChain.length <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded text-xs font-semibold transition-colors disabled:opacity-40"
              >
                <Bug className="w-3.5 h-3.5 text-red-600" />
                <span>Simulate Tamper</span>
              </button>
            ) : (
              <button
                onClick={handleRestoreChain}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Original Ledger</span>
              </button>
            )}

            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Verify Cryptographic Chain'}</span>
            </button>
          </div>
        </div>

        {/* Tamper Notification Banner */}
        {isTampered && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-0.5">
            <strong className="block">Adversarial Mutation Injected at Block #{tamperedIndex}</strong>
            <span className="text-slate-600 block">
              Block payload was modified without updating downstream SHA-256 hash links. Run "Verify Cryptographic Chain" to confirm mathematical detection.
            </span>
          </div>
        )}

        {/* Verification Engine Result */}
        {verificationResult && (
          <div className={`p-4 rounded border text-xs font-mono transition-all ${
            verificationResult.valid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
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
            <p className="text-xs text-slate-600 mt-1">
              {verificationResult.details}
            </p>
          </div>
        )}

        {/* Raw Ledger JSON Viewer */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Raw Ledger Data ({sandboxChain.length} Blocks):</span>
            <span className={isTampered ? 'text-red-600 font-bold' : 'text-slate-400'}>
              {isTampered ? '● MODIFIED / TAMPERED' : '● ORIGINAL LEDGER'}
            </span>
          </div>
          <div className="p-3 bg-slate-900 text-slate-200 rounded border border-slate-700 font-mono text-[11px] max-h-56 overflow-y-auto select-all">
            <pre>{JSON.stringify(sandboxChain, null, 2)}</pre>
          </div>
        </div>

      </div>

    </div>
  );
}
