import React from 'react';
import { Info, ShieldCheck, Heart, Code2, Sparkles, CheckCircle2, X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose, lang }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800/80 dark:to-slate-800/50">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {lang === 'bn' ? 'অ্যাপস সম্পর্কে (About App)' : 'About Application'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* App Logo & Title Banner */}
          <div className="flex flex-col items-center text-center p-5 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent rounded-2xl border border-orange-200/60 dark:border-slate-800 space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {lang === 'bn' ? 'সিকিউর মেসেঞ্জার' : 'Secure SMS Messenger'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 text-[11px] font-bold border border-orange-200 dark:border-orange-800 font-mono">
              Version 2.5.0 Pro
            </span>
          </div>

          {/* Developer Credit Highlight Box */}
          <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl text-white shadow-md shadow-orange-500/20 space-y-2 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
              <Code2 className="w-32 h-32 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-200 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-100">
                {lang === 'bn' ? 'অ্যাপস ডেভেলপমেন্ট ক্রেডিট' : 'App Development Credit'}
              </span>
            </div>
            <div className="pt-1">
              <p className="text-xs text-orange-100 font-medium">
                {lang === 'bn' ? 'এই সিকিউর মেসেজিং অ্যাপলিকেশনটির সম্পূর্ণ ক্রেডিট:' : 'Developed and Designed with craftsmanship by:'}
              </p>
              <h3 className="text-xl font-black text-white mt-0.5 tracking-wide flex items-center gap-2">
                <span>জনি দত্ত</span>
                <span className="text-xs font-normal text-amber-200 font-sans">(Jony Datta)</span>
              </h3>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{lang === 'bn' ? 'প্রধান বৈশিষ্ট্যসমূহ' : 'Key Highlights'}</span>
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === 'bn' ? 'এন্ড-টু-এন্ড এনক্রিপ্টেড সিকিউর মেসেজিং' : 'End-to-End Encrypted Secure Messaging'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === 'bn' ? 'ইনস্ট্যান্ট গ্রুপ চ্যাট ও অফলাইন মেসেজ সিঙ্ক' : 'Instant Group Chat & Offline SMS Sync'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === 'bn' ? 'নোটিফিকেশন থেকে ডিরেক্ট রিপ্লাই ও ফ্লোটিং চ্যাট হেড' : 'Direct Reply from Notification & Floating Chat Head'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === 'bn' ? 'হাই-কোয়ালিটি ভয়েস চ্যাট ও অডিও রেকর্ডার' : 'High Quality Voice Chat & Audio Recording'}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              © 2026 Secure SMS Messenger. All Rights Reserved.
            </p>
            <p className="text-[10px] text-orange-500 font-semibold mt-0.5">
              Designed & Developed by জনি দত্ত (Jony Datta)
            </p>
          </div>
        </div>

        {/* Close Button Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
