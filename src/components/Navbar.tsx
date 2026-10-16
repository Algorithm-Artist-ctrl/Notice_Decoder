import React, { useState } from 'react';
import { 
  Calendar, 
  UploadCloud, 
  AlertTriangle, 
  Clock, 
  History, 
  Settings, 
  LayoutDashboard, 
  Menu, 
  X, 
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';

export type NavTab = 'landing' | 'dashboard' | 'upload' | 'review' | 'conflicts' | 'schedule' | 'history' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeConflictsCount: number;
  onLoadDemoNotice: () => void;
  isDemoLoading: boolean;
  timezone: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeConflictsCount,
  onLoadDemoNotice,
  isDemoLoading,
  timezone,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload Notice', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'conflicts', label: 'Conflicts', icon: <AlertTriangle className="w-4 h-4" />, badge: activeConflictsCount },
    { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('landing')}>
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-sm border border-navy-800">
              <Calendar className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">Notice Decoder</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Byte_Brains
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Clear, Conflict-Free Schedules
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Action & System Info */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Timezone pill */}
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>{timezone}</span>
            </div>

            {/* Quick Demo Button */}
            <button
              onClick={onLoadDemoNotice}
              disabled={isDemoLoading}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition shadow-xs disabled:opacity-60"
              title="Load the PS-02 Fictional Demonstration circular with verified 30m conflict"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isDemoLoading ? 'Loading Demo...' : 'Load PS-02 Demo'}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === item.id
                  ? 'bg-navy-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          <div className="pt-2">
            <button
              onClick={() => {
                onLoadDemoNotice();
                setMobileMenuOpen(false);
              }}
              disabled={isDemoLoading}
              className="w-full flex items-center justify-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load PS-02 Demonstration Dataset</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
