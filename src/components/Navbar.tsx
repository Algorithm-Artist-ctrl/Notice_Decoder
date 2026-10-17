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
  ArrowRight,
  User as UserIcon,
  LogOut,
  LogIn
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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'notices', label: 'Upload', icon: <UploadCloud className="w-4 h-4 shrink-0" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4 shrink-0" /> },
    { id: 'conflicts', label: 'Conflicts', icon: <AlertTriangle className="w-4 h-4 shrink-0" />, badge: activeConflictsCount },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4 shrink-0" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand Logo & Product Identity */}
          <div 
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group shrink-0 min-w-0" 
            onClick={() => {
              onSelectTab('landing');
              setMobileMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectTab('landing');
                setMobileMenuOpen(false);
              }
            }}
            aria-label="Notice Decoder Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-xs border border-navy-800 transition group-hover:bg-brand-700 shrink-0">
              <CalendarIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-brand-300" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight whitespace-nowrap">
                Notice Decoder
              </span>
              <p className="text-[11px] text-slate-500 font-medium hidden 2xl:block leading-tight whitespace-nowrap">
                Turn Any Document into Clear, Actionable Information.
              </p>
              <p className="text-[11px] text-slate-500 font-medium hidden xl:block 2xl:hidden leading-tight whitespace-nowrap truncate max-w-[220px]">
                Turn Any Document into Action.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (>= lg / 1024px) */}
          <nav className="hidden lg:flex items-center space-x-1 shrink-0" aria-label="Main Navigation">
            {/* Landing page link */}
            <button
              onClick={() => onSelectTab('landing')}
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
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

          {/* Desktop Right Controls (Timezone, Upload CTA, Auth) (>= lg / 1024px) */}
          <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
            {/* Timezone pill */}
            <div className="hidden xl:flex items-center space-x-1.5 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap">
              <Globe className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{timezone}</span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => onSelectTab('notices')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white transition shadow-xs whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5 text-brand-300 shrink-0" />
              <span>Upload Document</span>
            </button>

            {/* Auth Button or User Profile */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 pl-2 pr-3 py-1 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shadow-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-slate-900 leading-none max-w-[100px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                    Verified
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  className="ml-1 text-[11px] text-slate-400 hover:text-red-600 font-medium pl-1.5 border-l border-slate-200 whitespace-nowrap"
                  title="Sign out"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition shadow-2xs whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Tablet & Mobile Right Action Bar (< lg / 1024px) */}
          <div className="flex lg:hidden items-center space-x-2 shrink-0">
            {/* Direct Upload Shortcut for mobile/tablet */}
            <button
              onClick={() => {
                onSelectTab('notices');
                setMobileMenuOpen(false);
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-navy-900 text-white shadow-xs"
              title="Upload Document"
            >
              <UploadCloud className="w-3.5 h-3.5 text-brand-300 shrink-0" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Mobile Auth indicator if logged in */}
            {user && (
              <div 
                className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold shadow-xs"
                title={`Signed in as ${user.name}`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Hamburger / Close Drawer Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-xl">
          
          {/* User Account Section in Drawer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {user.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Sign in to save documents & sync across devices
                </div>
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-900 text-white shadow-xs shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 text-brand-300" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>

          {/* Timezone Indicator in Mobile Drawer */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <span className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Timezone:</span>
            </span>
            <span className="font-mono font-medium text-slate-700">{timezone}</span>
          </div>

          {/* Main Navigation Links */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                onSelectTab('landing');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentTab === 'landing' 
                  ? 'bg-navy-900 text-white' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Overview (Home)
            </button>

            {navItems.map((item) => {
              const isActive = currentTab === item.id || (item.id === 'notices' && currentTab === 'review');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Upload Document Primary Button in Drawer */}
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                onSelectTab('notices');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 text-xs font-bold px-4 py-3 rounded-xl bg-navy-900 hover:bg-navy-850 text-white shadow-xs"
            >
              <UploadCloud className="w-4 h-4 text-brand-300" />
              <span>Upload & Analyze Document</span>
            </button>
          </div>

        </div>
      )}
    </header>
  );
};
