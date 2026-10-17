import React from 'react';
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
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
}) => {
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
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold px-6 py-3.5 rounded-xl transition text-sm"
              >
                <span>Go to Dashboard</span>
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

      {/* 2. General-Purpose 5-Step Document-to-Action Workflow */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-3 max-w-2xl text-left">
              <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>AI-Powered Document Understanding</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                Turn Any Document into Clear, Actionable Information.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Extract important information, summarize key points, identify tasks and deadlines, and detect scheduling conflicts when dates or events are present.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => onNavigate('notices')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-semibold px-6 py-3.5 rounded-xl shadow-xs hover:shadow transition text-sm group"
              >
                <UploadCloud className="w-4 h-4 text-brand-300 transition-transform group-hover:-translate-y-0.5" />
                <span>Upload a Document</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* 5-Step Process Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Step 1 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-navy-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                    Input
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Upload Any File</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  PDF documents, photos of physical memos, or pasted announcement text up to 10 MB.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                Text layer & OCR ready
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-brand-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    Multimodal
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">AI Extraction</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Multi-domain analysis across circulars, office memos, minutes, interview schedules, and advisories.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-brand-700 font-medium">
                Schema Cases A–F
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    Synthesis
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Summarize Key Points</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Synthesizes executive summary, urgent action items, institutional directives, and policy notes.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-indigo-700 font-medium">
                Key points & directives
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-amber-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                    04
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Timeline
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Events & Deadlines</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Isolates start/end timestamps, venues, submission deadlines, and discrete tasks.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-amber-700 font-medium">
                ISO dates & venues
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                    05
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Verification
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Review & Confirm</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Side-by-side human-in-the-loop verification, conflict detection, and 1-click calendar export.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-emerald-700 font-medium">
                RFC 5545 .ics export
              </div>
            </div>

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
            From Raw Document to Verified Schedule
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
                  <span><strong>Unspecified Durations:</strong> If a document lists only a start time, duration is flagged rather than guessed.</span>
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
            Upload your document to experience accurate date extraction, conflict-free scheduling, and structured action items.
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
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl transition text-sm"
          >
            <ArrowRight className="w-4 h-4 text-brand-300" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </section>

    </div>
  );
};
