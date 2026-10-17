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
  timezone: string;
  user?: { id: string; name: string; email: string } | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeConflictsCount,
  timezone,
  user,
  onOpenAuth,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'notices', label: 'Upload Document', icon: <UploadCloud className="w-4 h-4" /> },
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
            className="flex items-center space-x-3 cursor-pointer group shrink-0 min-w-0" 
            onClick={() => onSelectTab('landing')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectTab('landing'); }}
            aria-label="Notice Decoder Home"
          >
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-xs border border-navy-800 transition group-hover:bg-brand-700 shrink-0">
              <CalendarIcon className="w-5 h-5 text-brand-300" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight whitespace-nowrap">
                Notice Decoder
              </span>
              <p className="text-[11px] text-slate-500 font-medium hidden xl:block leading-tight whitespace-nowrap">
                Turn Any Document into Clear, Actionable Information.
              </p>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block xl:hidden leading-tight truncate max-w-[200px]">
                Turn Any Document into Action.
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

          {/* Quick Action, Timezone & Auth */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Timezone pill */}
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>{timezone}</span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => onSelectTab('notices')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white transition shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-brand-300" />
              <span>Upload Document</span>
            </button>

            {/* Auth Button or User Profile */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 pl-2 pr-3 py-1 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-none max-w-[110px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                    Verified
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  className="ml-1 text-[11px] text-slate-400 hover:text-red-600 font-medium pl-1 border-l border-slate-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white transition shadow-sm"
              >
                <span>Sign In</span>
              </button>
            )}
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
                onSelectTab('notices');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg bg-navy-900 text-white shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-brand-300" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
