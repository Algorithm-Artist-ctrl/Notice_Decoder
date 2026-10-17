import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Info,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  FileCheck2,
  Share2
} from 'lucide-react';
import { NavTab } from '../components/Navbar';

const NoticeTransform3D = React.lazy(() => 
  import('../components/NoticeTransform3D').then(m => ({ default: m.NoticeTransform3D }))
);

interface LandingViewProps {
  onNavigate: (tab: NavTab) => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onLoadDemo,
  isDemoLoading,
}) => {
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<'visual' | 'code' | 'raw'>('visual');

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. Hero Section with 3D Notice Transformation */}
      <section className="relative overflow-hidden bg-white border border-slate-200/80 pt-12 pb-16 px-6 sm:px-10 lg:px-12 rounded-3xl shadow-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Editorial Value Proposition & Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <div className="inline-flex items-center space-x-2 bg-brand-50/80 border border-brand-200/80 text-brand-800 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
              <span>Turn Any Document into Clear, Actionable Information.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Turn any document into a <span className="text-brand-600 underline decoration-brand-200 decoration-wavy">clear plan.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
              Extract important dates, deadlines, tasks and directives from academic circulars, office memos, meeting minutes, interview calls, conference announcements, and public advisories. Notice Decoder converts unstructured documents into verified, calendar-ready schedules and key information summaries.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('notices')}
                className="inline-flex items-center justify-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all text-sm group"
              >
                <UploadCloud className="w-4 h-4 text-brand-300 transition-transform group-hover:-translate-y-0.5" />
                <span>Upload a Document</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={onLoadDemo}
                disabled={isDemoLoading}
                className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold px-6 py-3.5 rounded-xl transition text-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>{isDemoLoading ? 'Loading sample...' : 'Explore an example'}</span>
              </button>
            </div>

            {/* Credibility checkpoints without absolute/unverified claims */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Review extracted details</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Transparent conflict detection</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Your schedule, organized</span>
              </span>
            </div>
          </motion.div>

          {/* Right Column: 3D Notice Transformation Scene */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="lg:col-span-5 relative"
          >
            <div className="bg-gradient-to-br from-slate-50 via-white to-brand-50/40 rounded-2xl border border-slate-200/80 p-2 shadow-2xs min-h-[380px] flex items-center justify-center">
              <React.Suspense fallback={
                <div className="h-[380px] w-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading transformation scene...</span>
                </div>
              }>
                <NoticeTransform3D />
              </React.Suspense>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. Interactive Conflict Demonstration — Drawn to Scale */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          
          <div className="border-b border-slate-200 px-6 sm:px-8 py-6 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded-full">
                  Interactive Conflict Engine
                </span>
                <span className="text-xs text-slate-500 font-mono">Sample Schedule Demonstration</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                Where Academic Schedules Actually Break
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Multiple commitments buried in continuous circular text. Notice Decoder isolates each event and surfaces hidden collisions.
              </p>
            </div>

            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
              <button
                onClick={() => setActiveInteractiveTab('visual')}
                className={`px-3.5 py-1.5 rounded-lg transition ${activeInteractiveTab === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Visual Scale
              </button>
              <button
                onClick={() => setActiveInteractiveTab('code')}
                className={`px-3.5 py-1.5 rounded-lg transition ${activeInteractiveTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Math Proof
              </button>
              <button
                onClick={() => setActiveInteractiveTab('raw')}
                className={`px-3.5 py-1.5 rounded-lg transition ${activeInteractiveTab === 'raw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Raw Circular
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {activeInteractiveTab === 'raw' && (
              <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl font-mono text-sm leading-relaxed border border-slate-800 space-y-3">
                <p className="text-brand-300 text-xs font-bold uppercase tracking-wider">// Sample College Circular Text:</p>
                <p className="text-slate-200">
                  "All III-year CSE students: <span className="bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded">Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204.</span> <span className="bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded">Lab records must be submitted to the department office by 12:00 noon on 13 Nov.</span> <span className="bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded">A guest lecture on “AI in Healthcare” is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.</span>"
                </p>
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                  Notice Decoder extracts the 3 distinct events, calculates start/end bounds, and identifies the 30-minute test/lecture collision and the noon submission deadline warning.
                </div>
              </div>
            )}

            {activeInteractiveTab === 'code' && (
              <div className="space-y-4">
                <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl font-mono text-xs leading-relaxed space-y-3">
                  <div className="text-emerald-400 font-bold uppercase tracking-wider">/* Deterministic Interval Overlap Theorem */</div>
                  <div className="text-slate-300">
                    Two valid timed intervals [startA, endA) and [startB, endB) overlap if and only if:<br />
                    <span className="text-brand-400 font-bold">startA &lt; endB &amp;&amp; startB &lt; endA</span>
                  </div>
                  <div className="text-slate-400 pl-3 border-l-2 border-slate-700 space-y-1">
                    <div>overlapStart = max(10:00, 11:00) = <span className="text-white font-bold">11:00 AM</span></div>
                    <div>overlapEnd   = min(11:30, 12:30) = <span className="text-white font-bold">11:30 AM</span></div>
                    <div>overlapDuration = 11:30 - 11:00  = <span className="text-red-400 font-bold">30 MINUTES SIMULTANEOUS CLASH</span></div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 text-amber-300 space-y-1">
                    <div className="font-bold">/* Discrete Deadline-Point Rule */</div>
                    <div>A point deadline D occurs during event E if: <span className="text-white font-bold">E.start &lt;= D &lt; E.end</span></div>
                    <div className="text-amber-400 font-bold">11:00 &lt;= 12:00 (Noon) &lt; 12:30 ===&gt; DEADLINE DURING EVENT ALERT</div>
                  </div>
                </div>
              </div>
            )}

            {activeInteractiveTab === 'visual' && (
              <div className="space-y-6">
                
                {/* Visual Scale Diagram */}
                <div className="relative border border-slate-200 rounded-2xl p-6 bg-gradient-to-b from-white to-slate-50">
                  <div className="flex justify-between text-xs font-mono font-semibold text-slate-500 mb-8 border-b border-slate-200 pb-2">
                    <span>10:00 AM</span>
                    <span>11:00 AM</span>
                    <span>12:00 PM (Noon)</span>
                    <span>01:00 PM</span>
                  </div>

                  {/* Event Blocks Bar */}
                  <div className="relative h-28 space-y-2">
                    
                    {/* Event 1: Internal Test 2 (10:00 to 11:30) -> 0% to 50% */}
                    <div 
                      className="absolute top-0 h-10 rounded-xl bg-blue-100 border border-blue-400 px-3.5 py-1 flex items-center justify-between text-xs shadow-2xs"
                      style={{ left: '0%', width: '50%' }}
                    >
                      <div className="truncate font-semibold text-blue-900">
                        Internal Test 2 <span className="text-blue-700 font-normal">· Rm 204</span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-800 font-semibold">10:00–11:30</span>
                    </div>

                    {/* Event 2: Guest Lecture (11:00 to 12:30) -> 33.3% to 83.3% */}
                    <div 
                      className="absolute top-12 h-10 rounded-xl bg-purple-100 border border-purple-400 px-3.5 py-1 flex items-center justify-between text-xs shadow-2xs"
                      style={{ left: '33.33%', width: '50%' }}
                    >
                      <div className="truncate font-semibold text-purple-900">
                        Guest Lecture: AI in Healthcare <span className="text-purple-700 font-normal">· Sem Hall</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-800 font-semibold">11:00–12:30</span>
                    </div>

                    {/* Overlap Strip: 11:00 to 11:30 -> 33.33% to 50% */}
                    <div 
                      className="absolute top-0 h-22 rounded-xl border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none flex items-center justify-center"
                      style={{ left: '33.33%', width: '16.67%' }}
                    >
                      <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        30m Clash
                      </span>
                    </div>

                    {/* Deadline Point: 12:00 noon -> at 66.66% */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                      style={{ left: '66.66%' }}
                    >
                      <div className="absolute -top-3.5 -left-16 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                        📍 Lab Due 12:00
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t border-slate-200 text-xs">
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1">
                      <span className="font-bold text-red-950 block">⚠️ Direct Overlap (30 Min)</span>
                      <p className="text-red-800">Internal Test 2 and Guest Lecture collide between 11:00 AM and 11:30 AM.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                      <span className="font-bold text-amber-950 block">⏱️ Deadline Alert</span>
                      <p className="text-amber-800">12:00 noon lab submission occurs while seated in the Guest Lecture.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <span className="font-bold text-emerald-950 block">✅ Endpoint Independence</span>
                      <p className="text-emerald-800">Test ends at 11:30 AM; does not falsely flag an overlap with the noon deadline.</p>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Deterministic Interval Intersection: [10:00, 11:30) ∩ [11:00, 12:30)
            </span>
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center space-x-1 self-start sm:self-auto"
            >
              <span>Explore this example in Review Gate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* 3. The 3-Step Human-in-the-Loop Journey */}
      <section className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200">
            Human-in-the-Loop Process
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            From Raw Circular to Verified Calendar
          </h2>
          <p className="text-sm text-slate-600">
            Intelligent entity extraction pairs with explicit human review before any record enters your official schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 relative group hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-sm flex items-center justify-center">
              01
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Upload Any Document</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accepts PDF documents, photos of physical memos, or pasted announcement text up to 10 MB.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Text-layer extraction & OCR fallback</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Client & server 10 MB validation</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border-2 border-brand-500 shadow-xs space-y-4 relative">
            <div className="absolute -top-3 right-5 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              Review Gate
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 font-mono font-bold text-sm flex items-center justify-center">
              02
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Check & Correct Evidence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review proposed events side-by-side with original document evidence. Fix ambiguous times or missing venues instantly.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Every field tied to source evidence</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Flagged warnings for ambiguous dates</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 relative group hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold text-sm flex items-center justify-center">
              03
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Detect Conflicts & Export</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The conflict engine evaluates schedule intervals and exports confirmed commitments as standard RFC 5545 .ics calendars.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deterministic mathematical verification</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Universal Google, Apple & Outlook export</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* 4. Transparent Capabilities & Realistic Boundaries */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-lg">
            <Info className="w-5 h-5 text-brand-600" />
            <h3>Transparent System Capabilities & Boundaries</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                What Notice Decoder Guarantees
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Deterministic Conflict Arithmetic:</strong> Overlaps are strictly calculated with interval math. No model guesswork in clash detection.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Evidence Verification:</strong> Every proposed event links to source text. Unconfirmed records are never pushed into schedules.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>RFC 5545 Compliance:</strong> .ics files are formatted to standard timezone and escaping specifications.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-amber-700">
                Human Review Gate & Boundaries
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Ambiguous Date Expressions:</strong> Phrases like "next Monday" or "within 7 days" are flagged for user confirmation.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Degraded Physical Scans:</strong> Low-resolution camera photos of physical boards may require user review.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Unspecified Durations:</strong> If a circular lists only a start time, duration is flagged rather than guessed.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Call to Action */}
      <section className="max-w-7xl mx-auto bg-navy-900 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to turn your documents into a clear plan?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload your first document or explore our sample notice to experience conflict-free scheduling and clear action items.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('notices')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md transition text-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload a Document</span>
          </button>
          <button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl transition text-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-brand-300" />
            <span>Try sample notice</span>
          </button>
        </div>
      </section>

    </div>
  );
};
