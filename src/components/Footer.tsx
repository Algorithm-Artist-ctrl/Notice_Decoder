import React from 'react';
import { Shield, FileText, Calendar, Code, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 text-xs border-t border-navy-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-base">
              <span>Notice Decoder</span>
              <span className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded font-mono">
                Byte_Brains
              </span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed">
              Turning unstructured academic circulars, exam notices, and event circulars into deterministic,
              verifiable, conflict-free schedules with RFC 5545 calendar export.
            </p>
            <div className="flex items-center space-x-4 pt-1 text-slate-400">
              <span className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Math Engine</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>RFC 5545 Standard</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Engineering Guarantees</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• Half-Open Intervals: [start, end)</li>
              <li>• Discrete point-in-time deadline detection</li>
              <li>• Zero false alarms on adjacent boundaries</li>
              <li>• Side-by-side human-in-the-loop review</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Repository & Specs</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Repository: <span className="text-brand-300 font-mono">notice-decoder</span></li>
              <li>Team: <span className="text-slate-200 font-medium">Byte_Brains</span></li>
              <li>Problem Statement: <span className="text-slate-200">PS-02</span></li>
              <li>Database: <span className="text-emerald-400">Neon Serverless PostgreSQL</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-4">
          <p>© 2026 Byte_Brains · Notice Decoder. Built for real academic scheduling challenges.</p>
          <p className="text-[11px] text-slate-400">
            Ground-truth verified against PS-02 baseline circular · No fabricated user metrics
          </p>
        </div>
      </div>
    </footer>
  );
};
