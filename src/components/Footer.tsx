import React from 'react';
import { Shield, Calendar, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 text-xs border-t border-navy-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-base">
              <span>Notice Decoder</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed">
              Understand important dates, detect scheduling conflicts, and keep your academic commitments organized.
              Built for students, class coordinators, and academic departments.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Conflict Engine</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>RFC 5545 Calendar Standard</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Reliability Principles</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• Human-in-the-loop review gate</li>
              <li>• Half-open interval arithmetic: [start, end)</li>
              <li>• Discrete point-in-time deadline detection</li>
              <li>• Zero false alarms on adjacent boundaries</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Product & Standards</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• Universal .ics calendar export</li>
              <li>• Google Calendar, Apple Calendar, Outlook</li>
              <li>• Enforced 10 MB document boundaries</li>
              <li>• Zero third-party data tracking</li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-4">
          <p>© 2026 Notice Decoder. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">
            Independent academic productivity software · Designed for students and faculty
          </p>
        </div>
      </div>
    </footer>
  );
};
