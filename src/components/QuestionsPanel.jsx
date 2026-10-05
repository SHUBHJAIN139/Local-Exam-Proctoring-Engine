import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle, 
  CheckCircle,
  ClipboardPaste
} from 'lucide-react';
import { EXAM_QUESTIONS } from '../data/examQuestions';

export function QuestionsPanel({
  answers,
  explanations,
  onSelectAnswer,
  onChangeExplanation,
  onSubmitExam
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentQuestion = EXAM_QUESTIONS[currentIdx];

  const totalQuestions = EXAM_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Panel Header */}
      <div className="bg-gray-950/80 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
            Assessment Viewport
          </span>
        </div>

        {/* Question Selector Tabs */}
        <div className="flex items-center gap-1.5">
          {EXAM_QUESTIONS.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Q{idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-6">
        
        {/* Question Title & Counter */}
        <div>
          <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Question {currentIdx + 1} of {totalQuestions}</span>
            <span className="text-gray-400 font-mono text-[11px]">{currentQuestion.title}</span>
          </div>
          <h2 className="text-base font-semibold text-gray-100 leading-snug">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Multiple Choice Radio Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-gray-400 block mb-1">
            Select the most accurate response:
          </label>
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.id;
            return (
              <div
                key={option.id}
                onClick={() => onSelectAnswer(currentQuestion.id, option.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/60 text-white shadow-sm'
                    : 'bg-gray-800/40 border-gray-700/60 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500 text-white' 
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {option.id}
                </div>
                <div className="text-xs md:text-sm leading-relaxed select-none">
                  {option.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Free-form Written Explanation Textarea */}
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <span>Technical Justification / Proof:</span>
            </label>
            <span className="text-[10px] text-amber-400/80 font-mono flex items-center gap-1">
              <ClipboardPaste className="w-3 h-3" />
              External paste guarded
            </span>
          </div>

          <p className="text-[11px] text-gray-400">
            {currentQuestion.explanationPrompt}
          </p>

          <textarea
            value={explanations[currentQuestion.id] || ''}
            onChange={(e) => onChangeExplanation(currentQuestion.id, e.target.value)}
            placeholder="Type your rationale here... (Note: Clipboard pasting is actively audited by browser guard)"
            rows={4}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans transition-all resize-none"
          />
        </div>

      </div>

      {/* Panel Footer: Navigation & Completion Action */}
      <div className="bg-gray-950/80 px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIdx === totalQuestions - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Answered: <strong className="text-gray-200">{answeredCount}/{totalQuestions}</strong>
          </span>

          <button
            onClick={onSubmitExam}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Assessment</span>
          </button>
        </div>
      </div>

    </div>
  );
}
