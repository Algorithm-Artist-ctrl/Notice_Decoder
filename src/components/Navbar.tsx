import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  AlertTriangle, 
  History, 
  Settings, 
  LayoutDashboard, 
  Menu, 
  X, 
  Sparkles,
  Globe,
  UploadCloud,
  ArrowRight
} from 'lucide-react';

export type NavTab = 'landing' | 'dashboard' | 'notices' | 'review' | 'conflicts' | 'calendar' | 'history' | 'settings';

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
    { id: 'notices', label: 'Upload Notice', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'conflicts', label: 'Conflicts', icon: <AlertTriangle className="w-4 h-4" />, badge: activeConflictsCount },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Product Identity */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => onSelectTab('landing')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectTab('landing'); }}
            aria-label="Notice Decoder Home"
          >
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-xs border border-navy-800 transition group-hover:bg-brand-700">
              <CalendarIcon className="w-4.5 h-4.5 text-brand-300" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                Notice Decoder
              </span>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Your academic schedule, made clear.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {/* Landing page link */}
            <button
              onClick={() => onSelectTab('landing')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'landing'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Overview
            </button>

            {navItems.map((item) => {
              const isActive = currentTab === item.id || (item.id === 'notices' && currentTab === 'review');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-xs'
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

          {/* Quick Action & Timezone */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Timezone pill */}
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>{timezone}</span>
            </div>

            {/* Try sample notice button */}
            <button
              onClick={onLoadDemoNotice}
              disabled={isDemoLoading}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-800 border border-brand-200 hover:bg-brand-100 transition shadow-2xs disabled:opacity-60"
              title="Load a sample circular with verified schedule items to explore the system"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>{isDemoLoading ? 'Loading sample...' : 'Try sample notice'}</span>
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => {
              onSelectTab('landing');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'landing' ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Overview (Landing)
          </button>
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
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                onLoadDemoNotice();
                setMobileMenuOpen(false);
              }}
              disabled={isDemoLoading}
              className="w-full flex items-center justify-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-50 text-brand-800 border border-brand-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Try sample notice</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
