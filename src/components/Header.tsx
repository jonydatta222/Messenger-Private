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
  Phone
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenProfile: () => void;
  onOpenAddContact: () => void;
  isFloatingHeadActive?: boolean;
  onToggleFloatingHead?: () => void;
  onOpenEncryptionInfo: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  lang,
  onToggleLang,
  onOpenProfile,
  onOpenAddContact,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-md">
      {/* Left Side: User Profile Option (Replaced App Branding Text) */}
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2.5 p-1 pr-3 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer group"
        title={lang === 'bn' ? 'প্রোফাইল সেটিংস' : 'Profile Settings'}
      >
        <div className="relative">
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/60"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
        </div>
        <div className="text-left">
          <h1 className="font-bold text-xs text-white leading-tight group-hover:text-blue-300 transition-colors">
            {currentUser.displayName}
          </h1>
          <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
            {currentUser.phone || currentUser.email}
          </p>
        </div>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Add Contact Button */}
        <button
          onClick={onOpenAddContact}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          title={lang === 'bn' ? 'নতুন কন্টাক্ট যোগ করুন' : 'Add New Contact'}
        >
          <PlusCircle className="w-4 h-4 text-slate-300" />
        </button>

        {/* Language Toggle */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          title={lang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold">{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
        </button>

        {/* Logout Button Brought Directly Upfront */}
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
