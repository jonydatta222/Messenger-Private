import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Globe, 
  Lock,
  LogOut,
  Sun,
  Moon,
  Settings,
  ChevronRight,
  X
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isFloatingHeadActive?: boolean;
  onToggleFloatingHead?: () => void;
  onOpenEncryptionInfo?: () => void;
  onOpenPermissionsGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  lang,
  onToggleLang,
  onOpenProfile,
  onLogout,
  darkMode,
  onToggleDarkMode,
  isFloatingHeadActive,
  onToggleFloatingHead,
  onOpenEncryptionInfo,
  onOpenPermissionsGuide,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-2xs z-20 transition-colors relative">
      {/* Left Side: User Profile Option */}
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2.5 p-1 pr-3 rounded-2xl bg-orange-50 dark:bg-slate-800/80 hover:bg-orange-100/80 dark:hover:bg-slate-800 border border-orange-200/80 dark:border-slate-700 transition-all cursor-pointer group"
        title={lang === 'bn' ? 'প্রোফাইল সেটিংস' : 'Profile Settings'}
      >
        <div className="relative">
          <img
            src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser?.displayName || 'User'}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-500"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </div>
        <div className="text-left">
          <h1 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {currentUser.displayName}
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-none mt-0.5">
            {currentUser.phone || currentUser.email}
          </p>
        </div>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={settingsRef}>
        {/* Dark Mode Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-amber-400 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5"
          title={
            darkMode
              ? (lang === 'bn' ? 'লাইট মোড অন করুন' : 'Switch to Light Mode')
              : (lang === 'bn' ? 'ডার্ক মোড অন করুন' : 'Switch to Dark Mode')
          }
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 text-xs font-semibold border border-orange-200 dark:border-slate-700 transition-colors cursor-pointer"
          title={lang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
        >
          <Globe className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          <span className="font-bold">{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
            showSettings
              ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600'
          }`}
          title={lang === 'bn' ? 'সেটিংস' : 'Settings'}
        >
          <Settings className={`w-4 h-4 ${showSettings ? 'rotate-90 text-white' : 'text-slate-600 dark:text-slate-300'} transition-transform duration-300`} />
          <span className="hidden sm:inline text-xs font-semibold">
            {lang === 'bn' ? 'সেটিংস' : 'Settings'}
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-md shadow-red-600/20 cursor-pointer"
          title={lang === 'bn' ? 'লগআউট করুন' : 'Log Out'}
        >
          <LogOut className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold">Log Out</span>
        </button>

        {/* Settings Dropdown Popover */}
        {showSettings && (
          <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-50 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {lang === 'bn' ? 'অ্যাপ সেটিংস' : 'App Settings'}
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-2">
              {/* 1. Chat Head Option */}
              {onToggleFloatingHead && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center gap-2.5 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {lang === 'bn' ? 'চ্যাট হেড (Chat Head)' : 'Floating Chat Head'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'bn' ? 'অ্যাপসের বাইরে থাকলে ভাসমান বাটন দেখাবে' : 'Shows floating head when outside app'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onToggleFloatingHead}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isFloatingHeadActive ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isFloatingHeadActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* 2. App Permissions Guide Option */}
              {onOpenPermissionsGuide && (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onOpenPermissionsGuide();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {lang === 'bn' ? 'পারমিশন গাইড' : 'App Permissions'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'bn' ? 'অ্যান্ড্রয়েড অ্যাপের সব পারমিশন' : 'View required Android permissions'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </button>
              )}

              {/* 3. Encryption Info Option */}
              {onOpenEncryptionInfo && (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onOpenEncryptionInfo();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {lang === 'bn' ? 'এনক্রিপশন তথ্য' : 'Encryption Security'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'bn' ? 'এন্ড-টু-এন্ড সিকিউরিটি বিবরণ' : 'End-to-end security specs'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

