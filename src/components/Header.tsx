import React from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Users, 
  Globe, 
  Maximize2, 
  Minimize2, 
  Lock,
  PlusCircle,
  HelpCircle,
  LogOut,
  Phone,
  Sun,
  Moon
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
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  lang,
  onToggleLang,
  onOpenProfile,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-2xs z-20 transition-colors">
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
      <div className="flex items-center gap-2">
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

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-md shadow-red-600/20 cursor-pointer"
          title={lang === 'bn' ? 'লগআউট করুন' : 'Log Out'}
        >
          <LogOut className="w-3.5 h-3.5 text-white" />
          <span className="inline">{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
};

