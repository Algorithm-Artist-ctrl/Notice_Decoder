import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  FileText, 
  Info,
  Layers,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { format12Hour } from '../lib/conflict-engine';
import { apiClient } from '../lib/api-client';

interface DemoScenario {
  id: string;
  title: string;
  category: string;
  domain: string;
  analysisCase: string;
  description: string;
  badge: string;
  text: string;
}

interface DemoSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const DemoSandboxModal: React.FC<DemoSandboxModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario-academic-conflict');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiClient.get('/api/demo/scenarios')
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setScenarios(res.data);
          if (res.data.length > 0) {
            setSelectedScenarioId(res.data[0].id);
          }
        }
      })
      .catch(err => {
        console.warn('Failed to fetch demo scenarios:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sandbox Notice Banner */}
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse"></span>
            <span>Demo Sandbox — Running Isolated Evaluation Dataset (No Database Changes Saved)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-900 hover:text-white p-1 rounded transition"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Interactive Demo Sandbox</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                4 Scenarios
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Test universal AI entity extraction, conflict detection, and policy handling without signing in.
            </p>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition self-start sm:self-auto shrink-0"
          >
            <span>Sign In to Upload Real Documents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="bg-slate-100/80 p-2 border-b border-slate-200 overflow-x-auto flex space-x-2 scrollbar-none">
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{sc.title.split(':')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  sc.analysisCase === 'A' ? 'bg-blue-100 text-blue-800' :
                  sc.analysisCase === 'B' ? 'bg-amber-100 text-amber-800' :
                  sc.analysisCase === 'C' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  Case {sc.analysisCase}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body: Two-Column Demo View */}
        {currentScenario && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Scenario Description Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{currentScenario.title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                  {currentScenario.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentScenario.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Raw Source Notice Text */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>Unstructured Input Document</span>
                </span>
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-2xl border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[340px] overflow-y-auto">
                  {currentScenario.text}
                </div>
              </div>

              {/* Right Column: AI Extraction & Mathematical Conflict Verification */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Extracted Structured Information</span>
                </span>

                {/* Scenario 1: Academic Overlap */}
                {currentScenario.id === 'scenario-academic-conflict' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2">
                      <div className="flex items-center space-x-2 text-red-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Hard Overlap Detected: [11:00 – 11:30] (30 Minutes)</span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-snug">
                        Mathematical Proof: Examination interval [10:00, 11:30) overlaps with Guest Lecture interval [11:00, 12:30).
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="font-bold text-slate-900">CS401 Mid-Term Examination</div>
                        <div className="text-slate-500 font-mono text-[11px]">25 Nov 2026 · 10:00 – 11:30 · Main Exam Hall A</div>
                      </div>
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50/30 shadow-2xs">
                        <div className="font-bold text-slate-900">Guest Lecture: Modern AI Agents</div>
                        <div className="text-red-700 font-mono text-[11px]">25 Nov 2026 · 11:00 – 12:30 · Auditorium B</div>
                      </div>
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs">
                        <div className="font-bold text-slate-900">Lab Record Submission Deadline</div>
                        <div className="text-amber-800 font-mono text-[11px]">25 Nov 2026 · Cut-off at 12:00</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scenario 2: Research Grant Point Deadline */}
                {currentScenario.id === 'scenario-point-deadline' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Zero Interval Clashes · Single Point Deadline</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Classified as Case B (Point Deadline). No false duration generated.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Research Proposal Submission Cut-Off</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">DEADLINE</span>
                      </div>
                      <div className="text-slate-600 font-mono">Date: 15 Dec 2026 at 23:59 IST</div>
                      <p className="text-slate-500 text-[11px]">
                        Hard cut-off timestamp. Automatic calendar reminder will be scheduled 2 hours prior to portal lock.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scenario 3: Zero-Date Policy Directive */}
                {currentScenario.id === 'scenario-zero-date-policy' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
                      <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Pure Informational Policy · 0 Hallucinated Events</span>
                      </div>
                      <p className="text-[11px] text-indigo-800">
                        Classified as Case D (Informational). Extracted 4 binding directives without scheduling fake calendar events.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs">
                      <span className="font-bold text-slate-900 block">Extracted Directives:</span>
                      <ul className="space-y-1.5 text-slate-600 pl-2">
                        <li>• 3rd Floor designated as 24/7 Silent Study Zone.</li>
                        <li>• Mandatory automated RFID checkout at self-service kiosks.</li>
                        <li>• Overnight textbook loans active 20:00 to 09:00 next day.</li>
                        <li>• Non-compliance results in 14-day borrowing suspension.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Scenario 4: Corporate Interview */}
                {currentScenario.id === 'scenario-corporate-interview' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Corporate Multi-Stage Interview Plan</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Classified as Case C (Interview Rounds & Prep Tasks).
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="font-bold text-slate-900">Round 1: System Architecture Studio</div>
                        <div className="text-slate-500 font-mono text-[11px]">04 Dec 2026 · 09:30 – 11:00 · Conference Room 4A</div>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="font-bold text-slate-900">Round 2: Engineering Culture Alignment</div>
                        <div className="text-slate-500 font-mono text-[11px]">04 Dec 2026 · 11:30 – 12:30 · Executive Boardroom</div>
                      </div>
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
                        <div className="font-bold text-slate-900">Portfolio & Architecture Submission</div>
                        <div className="text-amber-800 font-mono text-[11px]">04 Dec 2026 · Deadline at 17:00</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Call to Action */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-850 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white">Ready to decode your own documents?</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sign in or create an account to upload documents, customize personal reminders, and export schedules.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-navy-900 hover:bg-slate-100 font-bold text-xs transition shrink-0 shadow-xs"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
