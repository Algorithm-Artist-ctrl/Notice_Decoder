import React, { useState } from 'react';
import { 
  Calendar, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Check, 
  ExternalLink,
  Info
} from 'lucide-react';
import { NavTab } from '../components/Navbar';

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
    <div className="space-y-16 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
              <span>Byte_Brains · Problem Statement PS-02</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Turn College Notices into <br className="hidden sm:inline" />
              <span className="text-brand-600">Clear, Conflict-Free Schedules.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              College circulars bury exam dates, lecture slots, and lab deadlines in unstructured paragraphs. 
              Notice Decoder extracts them with full provenance, detects overlaps mathematically, and exports verified <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-slate-800 font-mono">.ics</code> calendars.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => onNavigate('upload')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-medium px-6 py-3.5 rounded-xl shadow-md transition text-sm"
              >
                <UploadCloud className="w-4 h-4 text-brand-300" />
                <span>Upload a Notice</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onLoadDemo}
                disabled={isDemoLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium px-6 py-3.5 rounded-xl transition text-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{isDemoLoading ? 'Loading Demo Notice...' : 'Try PS-02 Demo Notice'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-xs text-slate-500 pt-3">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Hallucinations</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deterministic [start, end) Math</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Client Privacy</span>
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Interactive Conflict Demonstration — Drawn to Scale */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          
          <div className="border-b border-slate-200 px-6 py-5 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                  Live Mathematical Demonstration
                </span>
                <span className="text-xs text-slate-500 font-mono">PS-02 Baseline Circular</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Where the Schedule Actually Breaks
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Same morning, three events in five lines of prose. The notice never once mentions that two collide.
              </p>
            </div>

            <div className="flex items-center bg-slate-200 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveInteractiveTab('visual')}
                className={`px-3 py-1.5 rounded-md transition ${activeInteractiveTab === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Visual Timeline
              </button>
              <button
                onClick={() => setActiveInteractiveTab('code')}
                className={`px-3 py-1.5 rounded-md transition ${activeInteractiveTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Math Proof
              </button>
              <button
                onClick={() => setActiveInteractiveTab('raw')}
                className={`px-3 py-1.5 rounded-md transition ${activeInteractiveTab === 'raw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Raw Notice Text
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeInteractiveTab === 'raw' && (
              <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-sm leading-relaxed border border-slate-800">
                <p className="text-brand-300 mb-2">// Fictional circular given in PS-02:</p>
                <p className="text-slate-200">
                  "All III-year CSE students: <span className="bg-blue-900/60 text-blue-200 px-1 py-0.5 rounded">Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204.</span> <span className="bg-amber-900/60 text-amber-200 px-1 py-0.5 rounded">Lab records must be submitted to the department office by 12:00 noon on 13 Nov.</span> <span className="bg-purple-900/60 text-purple-200 px-1 py-0.5 rounded">A guest lecture on “AI in Healthcare” is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.</span>"
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  8 entities buried in continuous text: 3 time windows, 3 physical venues, 1 hard clash, 1 deadline warning.
                </div>
              </div>
            )}

            {activeInteractiveTab === 'code' && (
              <div className="space-y-4">
                <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-xs leading-relaxed">
                  <div className="text-emerald-400 font-semibold mb-2">/* Deterministic Interval Overlap Theorem */</div>
                  <div className="text-slate-300">
                    Two valid timed events A and B overlap if and only if:<br />
                    <span className="text-brand-400 font-bold">A.start &lt; B.end AND B.start &lt; A.end</span>
                  </div>
                  <div className="mt-3 text-slate-400">
                    overlapStart = max(10:00, 11:00) = <span className="text-white font-bold">11:00 AM</span><br />
                    overlapEnd   = min(11:30, 12:30) = <span className="text-white font-bold">11:30 AM</span><br />
                    overlapDuration = 11:30 - 11:00  = <span className="text-red-400 font-bold">30 MINUTES HARD OVERLAP</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-amber-300">
                    /* Discrete Deadline-Point Rule */<br />
                    A deadline D lands inside event E if: <span className="text-white font-bold">E.start &lt;= D &lt; E.end</span><br />
                    Guest Lecture: 11:00 &lt;= 12:00 &lt; 12:30 ===&gt; <span className="text-amber-400 font-bold">DEADLINE DURING EVENT ALERT</span>
                  </div>
                </div>
              </div>
            )}

            {activeInteractiveTab === 'visual' && (
              <div className="space-y-6">
                
                {/* Visual Scale Diagram */}
                <div className="relative border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50">
                  <div className="flex justify-between text-xs font-mono font-semibold text-slate-500 mb-6 border-b border-slate-200 pb-2">
                    <span>10:00 AM</span>
                    <span>11:00 AM</span>
                    <span>12:00 PM (Noon)</span>
                    <span>01:00 PM</span>
                  </div>

                  {/* Event Blocks Bar */}
                  <div className="relative h-28 space-y-2">
                    
                    {/* Event 1: Internal Test 2 (10:00 to 11:30) -> 0% to 50% */}
                    <div 
                      className="absolute top-0 h-10 rounded-lg bg-blue-100 border border-blue-400 px-3 py-1 flex items-center justify-between text-xs shadow-xs"
                      style={{ left: '0%', width: '50%' }}
                    >
                      <div className="truncate font-semibold text-blue-900">
                        Internal Test 2 <span className="text-blue-700 font-normal">· Rm 204</span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-800 font-medium">10:00–11:30</span>
                    </div>

                    {/* Event 2: Guest Lecture (11:00 to 12:30) -> 33.3% to 83.3% */}
                    <div 
                      className="absolute top-12 h-10 rounded-lg bg-purple-100 border border-purple-400 px-3 py-1 flex items-center justify-between text-xs shadow-xs"
                      style={{ left: '33.33%', width: '50%' }}
                    >
                      <div className="truncate font-semibold text-purple-900">
                        Guest Lecture: AI in Healthcare <span className="text-purple-700 font-normal">· Sem Hall</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-800 font-medium">11:00–12:30</span>
                    </div>

                    {/* Overlap Strip: 11:00 to 11:30 -> 33.33% to 50% */}
                    <div 
                      className="absolute top-0 h-22 rounded border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none flex items-center justify-center"
                      style={{ left: '33.33%', width: '16.67%' }}
                    >
                      <span className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow">
                        30m Clash
                      </span>
                    </div>

                    {/* Deadline Point: 12:00 noon -> at 66.66% */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                      style={{ left: '66.66%' }}
                    >
                      <div className="absolute -top-3 -left-16 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        📍 Lab Deadline 12:00
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t border-slate-200 text-xs">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <span className="font-bold text-red-900 block mb-0.5">⚠️ Hard Overlap (30 Min)</span>
                      <p className="text-red-700">Internal Test 2 and Guest Lecture collide from 11:00 to 11:30 AM.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="font-bold text-amber-900 block mb-0.5">⏱️ Deadline Alert</span>
                      <p className="text-amber-700">12:00 noon lab submission occurs while seated in the Guest Lecture.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="font-bold text-emerald-900 block mb-0.5">✅ Endpoint Independence</span>
                      <p className="text-emerald-700">Test ends at 11:30 AM; does not falsely clash with the 12:00 noon deadline.</p>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Deterministic Interval Math: <span className="font-mono text-slate-700 font-semibold">[10:00, 11:30) ∩ [11:00, 12:30)</span>
            </span>
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
            >
              <span>Explore Full Demo Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* 3. The 5-Step Human-in-the-Loop Architecture */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            One Notice In. One Verified Calendar Out.
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            AI assists with entity extraction, but nothing ever reaches your calendar without human review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-sm flex items-center justify-center">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Intake & OCR</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accepts digital PDFs, phone camera photos, or pasted WhatsApp circulars up to 10 MB.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-sm flex items-center justify-center">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Entity Extraction</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Extracts title, category, date, start, end, venue, and audience with exact evidence references.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border-2 border-brand-500 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 font-mono font-bold text-sm flex items-center justify-center">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Review Gate</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium text-brand-900">
              Side-by-side editor. Flagged fields highlight ambiguities for instant correction.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold text-sm flex items-center justify-center">
              04
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Conflict Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deterministic interval arithmetic. Calculates exact overlap durations in minutes.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold text-sm flex items-center justify-center">
              05
            </div>
            <h3 className="font-bold text-slate-900 text-sm">RFC 5545 Export</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Downloads standard <code className="font-mono">.ics</code> files compatible with Google, Apple & Outlook.
            </p>
          </div>

        </div>
      </section>

      {/* 4. Differentiator Matrix: Manual Reading vs Notice Decoder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-navy-900 rounded-2xl p-8 text-white">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Why Manual Notice Sorting Fails</h2>
            <p className="text-sm text-slate-300 mt-1">
              Comparing prose across three circulars requires mental arithmetic that breaks under exam pressure.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-700 text-slate-400">
                  <th className="py-3 px-4 font-semibold uppercase">Action</th>
                  <th className="py-3 px-4 font-semibold uppercase text-red-300">By Hand (Manual)</th>
                  <th className="py-3 px-4 font-semibold uppercase text-emerald-300">With Notice Decoder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 text-slate-200">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Finding Events</td>
                  <td className="py-3.5 px-4 text-slate-300">Re-read paragraph, underline dates with pen</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">Extracted structured fields in 1 pass</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Comparing Times</td>
                  <td className="py-3.5 px-4 text-slate-300">Mental math across sentences; overlaps missed</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">Exact overlap duration computed (e.g. 30m)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Deadlines</td>
                  <td className="py-3.5 px-4 text-slate-300">Treated loosely as "anytime that day"</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">Treated as discrete point in time</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Fixing Mistakes</td>
                  <td className="py-3.5 px-4 text-slate-300">Re-read entire document again</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">Inline field editor with real-time recalculation</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Calendar Entry</td>
                  <td className="py-3.5 px-4 text-slate-300">Type every field into Google Calendar manually</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">Single-click standard RFC 5545 .ics download</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. Transparent Capabilities & Limitations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
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
                  <span><strong>Deterministic Conflict Arithmetic:</strong> Overlaps are strictly calculated with interval math. No LLM hallucinations in clash detection.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zero Data Fabrications:</strong> All demo data is strictly labeled. Unconfirmed records are never pushed into schedules.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>RFC 5545 Compliance:</strong> .ics files are tested for standard timezones and escaping.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-amber-700">
                Current Limitations & Human Review Required
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Ambiguous Date Expressions:</strong> Expressions like "next Monday" or "within 7 days" are flagged for user confirmation.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Degraded Physical Scans:</strong> Low-resolution camera photos of dirty bulletin boards may require manual correction.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Unspecified Durations:</strong> If a circular lists only a start time, duration is never silently assumed.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Proposed Monetization & Business Assumptions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-block bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200 mb-2">
            Proposed Business Model (Hypothesis for Validation)
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Sustainable Commercial Roadmap
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            The pricing tiers below represent proposed business hypotheses. They are not active payment gateways or validated commercial facts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Free Student</h4>
            <div className="text-2xl font-extrabold text-slate-900">₹0 <span className="text-xs font-normal text-slate-500">/ forever</span></div>
            <p className="text-xs text-slate-500">Essential schedule decoding for individual university students.</p>
            <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ 15 notices per month</li>
              <li>✓ PDF text extraction</li>
              <li>✓ Deterministic conflict engine</li>
              <li>✓ RFC 5545 .ics export</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border-2 border-brand-500 shadow-md space-y-4 relative">
            <div className="absolute -top-3 right-4 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Proposed Pro
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Student Pro</h4>
            <div className="text-2xl font-extrabold text-slate-900">₹99 <span className="text-xs font-normal text-slate-500">/ sem</span></div>
            <p className="text-xs text-slate-500">For Class Representatives and heavily involved student coordinators.</p>
            <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ Unlimited notice decoding</li>
              <li>✓ Full OCR for camera scans</li>
              <li>✓ Batch circular upload</li>
              <li>✓ Conflict mitigation advice</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Department Pilot</h4>
            <div className="text-2xl font-extrabold text-slate-900">₹4,999 <span className="text-xs font-normal text-slate-500">/ sem</span></div>
            <p className="text-xs text-slate-500">For academic department coordinators releasing circulars.</p>
            <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ Pre-release conflict check</li>
              <li>✓ Automated circular drafting</li>
              <li>✓ Department timetable validation</li>
              <li>✓ Multi-faculty access</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Institutional</h4>
            <div className="text-2xl font-extrabold text-slate-900">Custom <span className="text-xs font-normal text-slate-500">/ campus</span></div>
            <p className="text-xs text-slate-500">Campus-wide deployment integrated with ERP and LMS.</p>
            <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ SSO / Campus portal sync</li>
              <li>✓ Multi-department auditing</li>
              <li>✓ Dedicated Neon Postgres DB</li>
              <li>✓ SLA & priority support</li>
            </ul>
          </div>

        </div>
      </section>

    </div>
  );
};
