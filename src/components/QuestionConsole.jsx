import React from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Send, 
  ShieldAlert,
  ClipboardPaste
} from 'lucide-react';
import { EXAM_QUESTIONS } from '../data/examQuestions';

export function QuestionConsole({
  currentIdx,
  setCurrentIdx,
  answers,
  explanations,
  onSelectAnswer,
  onChangeExplanation,
  onClearAnswer,
  onSubmitExam
}) {
  const currentQuestion = EXAM_QUESTIONS[currentIdx];
  const totalQuestions = EXAM_QUESTIONS.length;

  return (
    <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Question Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">
            Question {currentIdx + 1}
          </span>
          <span className="text-xs text-slate-400">of {totalQuestions}</span>
          <span className="ml-2 text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
            Single Choice (+4, -1)
          </span>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {currentQuestion.title}
        </span>
      </div>

      {/* Question Content */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        
        {/* Question Statement */}
        <div className="text-base text-slate-900 font-medium leading-relaxed">
          {currentQuestion.question}
        </div>

        {/* Multiple Choice Options */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Select an Option:
          </div>

          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.id;
            return (
              <label
                key={option.id}
                onClick={() => onSelectAnswer(currentQuestion.id, option.id)}
                className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-medium'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-400 bg-white text-slate-600'
                }`}>
                  {option.id}
                </div>
                <div className="text-sm leading-relaxed select-none">
                  {option.text}
                </div>
              </label>
            );
          })}
        </div>

        {/* Written Explanation / Proof */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Candidate Rationale / Technical Explanation:
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <ClipboardPaste className="w-3 h-3" />
              External paste guarded
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {currentQuestion.explanationPrompt}
          </p>

          <textarea
            value={explanations[currentQuestion.id] || ''}
            onChange={(e) => onChangeExplanation(currentQuestion.id, e.target.value)}
            placeholder="Type your rationale here... (Clipboard pasting is actively audited on the cryptographic ledger)"
            rows={4}
            className="w-full bg-slate-50 border border-slate-300 rounded p-3 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all resize-none font-sans"
          />
        </div>

      </div>

      {/* Action Footer (TCS iON / Canvas Style) */}
      <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-300 text-xs font-medium text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => onClearAnswer(currentQuestion.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-medium text-slate-600 transition-colors"
            title="Clear current selection"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Response</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentIdx < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="flex items-center gap-1 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Save & Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSubmitExam}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
