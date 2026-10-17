import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { NoticeRecord } from '../types';

interface HistoryViewProps {
  notices: NoticeRecord[];
  onOpenNotice: (noticeId: string) => void;
  onDeleteNotice: (noticeId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  notices,
  onOpenNotice,
  onDeleteNotice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.rawText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Document Processing History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Archived circulars, office memos, recruitment notices, and extraction records.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search saved documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">No matching documents found</h2>
          <p className="text-xs text-slate-500">
            {searchQuery ? 'Try another search term.' : 'Uploaded documents will be listed here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
          {filteredNotices.map((n) => (
            <div key={n.id} className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    n.status === 'confirmed' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : n.status === 'review_required'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : n.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {n.status.replace(/_/g, ' ')}
                  </span>

                  {n.documentDomain && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                      {n.documentDomain}
                    </span>
                  )}

                  {n.documentType && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded">
                      {n.documentType.replace(/_/g, ' ')}
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                
                {n.summary ? (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {n.summary}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 line-clamp-1 font-mono">
                    "{n.rawText}"
                  </p>
                )}

                <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                  <span>
                    {n.extractedEventsCount > 0 
                      ? `${n.extractedEventsCount} events extracted` 
                      : 'Reference Document (0 events)'}
                  </span>
                  <span>Format: {n.fileType.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => onOpenNotice(n.id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 transition"
                >
                  <span>Open Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete notice "${n.title}"?`)) {
                      onDeleteNotice(n.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Delete notice from database"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
