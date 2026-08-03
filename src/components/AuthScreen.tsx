import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Phone, 
  KeyRound, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  Globe, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { loginUser, signUpUser } from '../services/chatService';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  lang,
  onToggleLang,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const result = loginUser(phone, password);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setErrorMsg(result.error || 'Login failed');
        }
      } else {
        const result = signUpUser(phone, password, displayName, email);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setErrorMsg(result.error || 'Sign up failed');
        }
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-x-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors shadow-md"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* App Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/20 mb-1">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {lang === 'bn' ? 'সুরক্ষিত মেসেঞ্জার' : 'Secure E2EE Messenger'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {lang === 'bn'
              ? 'ফোন নাম্বার ও পাসওয়ার্ড দিয়ে সাইন আপ করুন। একবার লগইন করলে বারবার পাসওয়ার্ড দেয়া লাগবে না।'
              : 'Sign up with phone and password. Stay logged in on this device securely.'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'লগইন (Login)' : 'Log In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'signup'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সাইন আপ (Sign Up)' : 'Sign Up'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {lang === 'bn' ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: রহিম আহমেদ' : 'e.g. Rahim Ahmed'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Phone Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {lang === 'bn' ? 'ফোন নাম্বার *' : 'Phone Number *'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: 01711000001' : 'e.g. 01711000001'}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {lang === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'bn' ? 'পাসওয়ার্ড প্রবেশ করুন' : 'Enter password'}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {lang === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email Address (Optional)'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@messenger.app"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Remember Credentials Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
            />
            <label htmlFor="remember" className="text-[11px] text-slate-300 cursor-pointer">
              {lang === 'bn'
                ? 'এই ফোনে আইডি-পাসওয়ার্ড সেভ রাখুন (বারবার লগইন করতে হবে না)'
                : 'Save login on this device (No need to re-enter password)'}
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{lang === 'bn' ? 'লগইন করুন' : 'Log In Now'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'bn' ? 'একাউন্ট তৈরি করুন' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="pt-2 text-[10px] text-center text-slate-500 flex items-center justify-center gap-1 border-t border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {lang === 'bn'
              ? 'TweetNaCl Curve25519 এনক্রিপশনে আপনার ডাটা সম্পূর্ণ সুরক্ষিত'
              : 'End-to-End Encrypted via TweetNaCl Curve25519'}
          </span>
        </div>
      </div>
    </div>
  );
};
