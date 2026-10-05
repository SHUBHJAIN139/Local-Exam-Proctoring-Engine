import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Key, 
  FileCheck, 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Copy, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyChain } from '../utils/cryptoAudit';
import { getScoreStatus } from '../utils/scoring';

export function SubmissionModal({
  isOpen,
  onClose,
  chain = [],
  finalScore = 100,
  keyData = {},
  summaryData = {},
  timeElapsedSeconds = 0,
  answers = {},
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
    if (isOpen) {
      setSandboxChain(JSON.parse(JSON.stringify(chain)));
      setIsTampered(false);
      setTamperedIndex(null);
      setVerificationResult(null);

      // Trigger celebration if final score is respectable (>60)
      if (finalScore >= 60) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      }
    }
  }, [isOpen, chain, finalScore]);

  if (!isOpen) return null;

  const scoreInfo = getScoreStatus(finalScore);
  const totalViolations = chain.filter(b => b.event !== 'SESSION_INIT' && b.event !== 'CALIBRATION_COMPLETED').length;

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  // Export Signed Ledger (.json)
  const handleExportLedger = () => {
    const exportBundle = {
      manifest: "Private, Local-First Exam Proctoring Engine (PS 2.2)",
      exportTimestamp: new Date().toISOString(),
      summary: summaryData,
      finalTrustScore: finalScore,
      totalBlocks: chain.length,
      ecdsaPublicKey: keyData.publicKeyHex,
      ecdsaSignature: keyData.signatureHex,
      auditChain: chain
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proctor-audit-ledger-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Tamper Test Action: Mutates an event block in the sandbox chain without updating hash
  const handleTamperTest = () => {
    if (sandboxChain.length <= 1) return;

    // Pick block #1 or latest anomaly block to tamper
    const targetIdx = sandboxChain.length > 2 ? 1 : sandboxChain.length - 1;
    const cloned = JSON.parse(JSON.stringify(sandboxChain));

    // Tamper with payload
    cloned[targetIdx].payload = {
      ...cloned[targetIdx].payload,
      tamperedByAttacker: true,
      originalViolationForged: "NO_PENALTY_CLEARED"
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

  // Run Real Cryptographic Chain Verifier
  const handleVerifyIntegrity = async () => {
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
        details: `Verification engine runtime error: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text, type) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full p-6 my-8 shadow-2xl space-y-6 text-gray-100">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${scoreInfo.bgColor} ${scoreInfo.borderColor} ${scoreInfo.textColor}`}>
              {finalScore >= 80 ? <ShieldCheck className="w-7 h-7" /> : finalScore >= 50 ? <ShieldAlert className="w-7 h-7" /> : <ShieldX className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Assessment Submitted & Cryptographically Sealed</h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${scoreInfo.bgColor} ${scoreInfo.textColor} border ${scoreInfo.borderColor}`}>
                  {scoreInfo.badge}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Examination complete. Session ledger has been sealed with an immutable SHA-256 hash-chain and ECDSA signature.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Final Trust Score</span>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${scoreInfo.textColor}`}>
              {finalScore}/100
            </div>
          </div>

          <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Total Violations</span>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${totalViolations > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalViolations}
            </div>
          </div>

          <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Chain Height</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-0.5">
              #{chain.length}
            </div>
          </div>

          <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Time Elapsed</span>
            <div className="text-2xl font-bold font-mono text-gray-200 mt-0.5">
              {formatSeconds(timeElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Real Cryptography: Public Key & Digital Signature Display */}
        <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase font-mono">
              <Key className="w-4 h-4 text-blue-400" />
              ECDSA (P-256 / SHA-256) Digital Proofs
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              WebCrypto Subtle API Verified
            </span>
          </div>

          {/* Public Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Public Key (SPKI Hex):</span>
              <button
                onClick={() => copyToClipboard(keyData.publicKeyHex || '', 'key')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="bg-black/80 rounded p-2 text-[10px] font-mono text-gray-400 break-all border border-gray-800 select-all max-h-14 overflow-y-auto">
              {keyData.publicKeyHex || 'Generating...'}
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Digital Signature over Terminal Hash & Score:</span>
              <button
                onClick={() => copyToClipboard(keyData.signatureHex || '', 'sig')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
              >
                {copiedSig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSig ? 'Copied' : 'Copy Signature'}</span>
              </button>
            </div>
            <div className="bg-black/80 rounded p-2 text-[10px] font-mono text-emerald-400/90 break-all border border-gray-800 select-all">
              {keyData.signatureHex || 'Generating...'}
            </div>
          </div>
        </div>

        {/* Live Verification Sandbox */}
        <div className="bg-gray-950/90 border border-blue-500/30 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-400" />
                Live Cryptographic Verification Sandbox
              </h3>
              <p className="text-[11px] text-gray-400">
                Sequentially recompute all SHA-256 block digests and verify ECDSA signature validity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isTampered ? (
                <button
                  onClick={handleTamperTest}
                  disabled={sandboxChain.length <= 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  title="Inject payload modification into block to simulate malicious alteration"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Tamper Test</span>
                </button>
              ) : (
                <button
                  onClick={handleRestoreChain}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Ledger</span>
                </button>
              )}

              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isVerifying ? 'Verifying...' : 'Verify Chain Integrity'}</span>
              </button>
            </div>
          </div>

          {/* Tamper status notification */}
          {isTampered && (
            <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Malicious Mutation Injected at Block #{tamperedIndex}</p>
                <p className="text-[11px] text-red-300/80">
                  Block payload was modified without recalculating downstream SHA-256 links. Run "Verify Chain Integrity" to test tamper detection.
                </p>
              </div>
            </div>
          )}

          {/* Verification Engine Output Display */}
          {verificationResult && (
            <div className={`p-4 rounded-xl border text-xs font-mono transition-all ${
              verificationResult.valid
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                : 'bg-red-950/50 border-red-500 text-red-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {verificationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>CRYPTOGRAPHIC INTEGRITY VERIFIED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span>TAMPER DETECTED: INVALID HASH AT BLOCK #{verificationResult.brokenIndex}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed mt-1 opacity-90">
                {verificationResult.details}
              </p>
              <div className="mt-2 text-[10px] text-gray-400">
                <span>Signature Status: </span>
                <strong className={verificationResult.signatureValid ? 'text-emerald-400' : 'text-red-400'}>
                  {verificationResult.signatureValid ? 'VALID ECDSA P-256 SIGNATURE' : 'SIGNATURE REJECTED'}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-800">
          <button
            onClick={handleExportLedger}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 shadow transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export Signed Ledger (.json)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onResetExam}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium border border-gray-700 transition-colors"
            >
              Start New Session
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
            >
              Close Dashboard
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
