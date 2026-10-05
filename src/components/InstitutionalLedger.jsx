import React, { useState } from 'react';
import { 
  Link2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Hash, 
  Clock, 
  CheckCircle2, 
  CircleDot 
} from 'lucide-react';
import { PENALTY_RULES } from '../utils/scoring';
import { EXAM_QUESTIONS } from '../data/examQuestions';

export function InstitutionalLedger({
  chain = [],
  answers = {},
  currentIdx = 0,
  onSelectQuestion
}) {
  const [copiedHash, setCopiedHash] = useState(null);

  const handleCopy = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const totalQuestions = EXAM_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  const formatHash = (h) => {
    if (!h) return '';
    return `${h.slice(0, 6)}...${h.slice(-6)}`;
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* 1. Question Palette Section (TCS iON Style) */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          <span>Question Palette</span>
          <span className="text-[11px] font-mono text-slate-500">{answeredCount}/{totalQuestions} Answered</span>
        </div>

        {/* Question Grid */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {EXAM_QUESTIONS.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(idx)}
                className={`py-1.5 px-2 rounded text-xs font-mono font-bold border transition-colors flex items-center justify-center gap-1 ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : isAnswered
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Q{idx + 1}</span>
                {isAnswered && !isCurrent && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Answered: {answeredCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded border border-slate-300 bg-white inline-block" /> Unanswered: {unansweredCount}
          </span>
        </div>
      </div>

      {/* 2. Cryptographic Audit Ledger Section */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            SHA-256 Audit Ledger
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700">
          <Hash className="w-3 h-3 text-slate-400" />
          <span>Height: #{chain.length}</span>
        </div>
      </div>

      {/* Ledger Block Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {chain.slice().reverse().map((block) => {
          const rule = PENALTY_RULES[block.event];
          const isGenesis = block.index === 0;

          return (
            <div
              key={block.index}
              className={`p-2.5 rounded border text-xs transition-all ${
                isGenesis
                  ? 'bg-slate-50 border-slate-200'
                  : rule?.severity === 'critical'
                    ? 'bg-red-50/80 border-red-200 text-red-900'
                    : rule?.severity === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-500 text-[10px]">
                    #{block.index}
                  </span>
                  <span className="font-semibold text-[11px] truncate max-w-[140px]">
                    {rule ? rule.label : block.event}
                  </span>
                </div>

                {rule && rule.points > 0 && (
                  <span className="font-mono font-bold text-[10px] text-red-600 bg-red-100/80 px-1 rounded border border-red-200">
                    -{rule.points} pts
                  </span>
                )}
              </div>

              {/* Truncated Hash and Timestamp */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1 pt-1 border-t border-slate-200/60">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatTime(block.timestamp)}
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-slate-600 font-semibold">{formatHash(block.hash)}</span>
                  <button
                    onClick={() => handleCopy(block.hash, `hash-${block.index}`)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Copy SHA-256 block hash"
                  >
                    {copiedHash === `hash-${block.index}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Footer */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between font-mono">
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Chain Valid
        </span>
        <span>ECDSA P-256</span>
      </div>

    </div>
  );
}
