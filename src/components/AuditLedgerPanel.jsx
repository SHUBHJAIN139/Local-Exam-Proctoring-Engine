import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Link2, 
  FileCode, 
  Clock, 
  Check, 
  Copy, 
  Filter, 
  Layers, 
  Hash, 
  ChevronDown, 
  ChevronUp,
  AlertOctagon,
  Info
} from 'lucide-react';
import { PENALTY_RULES } from '../utils/scoring';

export function AuditLedgerPanel({ chain = [] }) {
  const [copiedHash, setCopiedHash] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'anomalies', 'system'
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredChain = chain.filter((block) => {
    if (filterType === 'anomalies') {
      return block.event !== 'SESSION_INIT' && block.event !== 'CALIBRATION_COMPLETED';
    }
    if (filterType === 'system') {
      return block.event === 'SESSION_INIT' || block.event === 'CALIBRATION_COMPLETED';
    }
    return true;
  });

  const formatHash = (h) => {
    if (!h) return '';
    return `${h.slice(0, 8)}...${h.slice(-8)}`;
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Ledger Stream Header */}
      <div className="bg-gray-950/80 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              Cryptographic Audit Stream
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              SHA-256 Hash-Chained Blocks
            </span>
          </div>
        </div>

        {/* Block Height Counter */}
        <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/30 px-2.5 py-1 rounded-md text-xs font-mono text-blue-300">
          <Hash className="w-3.5 h-3.5" />
          <span>Height: #{chain.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-gray-950/40 border-b border-gray-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            All ({chain.length})
          </button>
          <button
            onClick={() => setFilterType('anomalies')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterType === 'anomalies'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Anomalies ({chain.filter(b => b.event !== 'SESSION_INIT' && b.event !== 'CALIBRATION_COMPLETED').length})
          </button>
          <button
            onClick={() => setFilterType('system')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterType === 'system'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            System
          </button>
        </div>

        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Intact Chain
        </span>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredChain.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            No audit records matching filter.
          </div>
        ) : (
          filteredChain.slice().reverse().map((block) => {
            const rule = PENALTY_RULES[block.event];
            const isGenesis = block.index === 0;
            const isAnomaly = !isGenesis && block.event !== 'CALIBRATION_COMPLETED';
            const isExpanded = expandedIndex === block.index;

            return (
              <div
                key={block.index}
                className={`rounded-lg border p-3 text-xs transition-all ${
                  isGenesis
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : isAnomaly
                      ? rule?.severity === 'critical'
                        ? 'bg-red-950/20 border-red-500/40 shadow-sm'
                        : 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-gray-800/40 border-gray-700/60'
                }`}
              >
                {/* Block Header Line */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-400 text-[11px]">
                      #{block.index}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                      isGenesis
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : rule?.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : rule?.severity === 'warning'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-gray-700 text-gray-300'
                    }`}>
                      {block.event}
                    </span>
                  </div>

                  {/* Deduction Badge */}
                  {rule && rule.points > 0 && (
                    <span className="font-mono font-bold text-[11px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      -{rule.points} pts
                    </span>
                  )}
                </div>

                {/* Event Description */}
                <p className="text-gray-300 text-[11px] mb-2 leading-relaxed">
                  {rule ? rule.description : (isGenesis ? 'Genesis Block: Session initialized with client configuration.' : 'Calibration baseline set.')}
                </p>

                {/* Cryptographic Link: PrevHash -> Current Hash */}
                <div className="bg-gray-950/80 rounded p-2 border border-gray-800/80 font-mono text-[10px] space-y-1">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>prevHash:</span>
                    <span className="text-gray-400">{formatHash(block.prevHash)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-300">
                    <span className="text-gray-400">hash:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-300 font-semibold">{formatHash(block.hash)}</span>
                      <button
                        onClick={() => handleCopy(block.hash, `hash-${block.index}`)}
                        className="text-gray-400 hover:text-white p-0.5 rounded"
                        title="Copy complete SHA-256 hash"
                      >
                        {copiedHash === `hash-${block.index}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Block Meta Footer */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(block.timestamp)}
                  </span>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : block.index)}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-gray-200"
                  >
                    <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded Payload Inspector */}
                {isExpanded && (
                  <div className="mt-2 p-2 bg-black rounded border border-gray-800 text-[10px] font-mono text-gray-300 overflow-x-auto">
                    <pre>{JSON.stringify(block.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
