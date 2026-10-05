import React from 'react';
import { AlertOctagon, UserCheck } from 'lucide-react';
import { AUDIT_THRESHOLD } from '../utils/scoring';

export function AuditBanner({ trustScore }) {
  if (trustScore >= AUDIT_THRESHOLD) return null;

  return (
    <div className="bg-red-950/95 border-b border-red-500/60 px-4 py-2.5 shadow-xl animate-pulse">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-red-500/20 text-red-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-red-200 tracking-wide uppercase">
              ⚠️ EXAM FLAGGED FOR RIGOROUS POST-AUDIT
            </span>
            <span className="text-red-300/80 ml-2 hidden md:inline">
              (Trust Score: {trustScore}/100 falls below threshold {AUDIT_THRESHOLD})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-red-300 font-mono">
          <UserCheck className="w-3.5 h-3.5 text-red-400" />
          <span>Human-in-the-loop Review Mandated: Auto-eviction disabled. Complete your assessment.</span>
        </div>
      </div>
    </div>
  );
}
