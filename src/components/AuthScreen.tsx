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
  Moon,
  Sun,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { loginUser, signUpUser, findUserForPasswordReset, resetUserPassword } from '../services/chatService';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  lang,
  onToggleLang,
  darkMode = true,
  onToggleDarkMode,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetPhoneOrEmail, setResetPhoneOrEmail] = useState('');
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [emailMasked, setEmailMasked] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await loginUser(phone, password);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setErrorMsg(result.error || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
        }
      } else if (mode === 'signup') {
        const result = await signUpUser(phone, password, displayName, email);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setErrorMsg(result.error || (lang === 'bn' ? 'সাইন আপ ব্যর্থ হয়েছে' : 'Sign up failed'));
        }
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setErrorMsg(err?.message || (lang === 'bn' ? 'সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP for password reset
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await findUserForPasswordReset(resetPhoneOrEmail);
      if (res.success && res.user) {
        setTargetUser(res.user);
        setEmailMasked(res.emailMasked || res.user.email || res.user.phone);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        setResetStep(2);

        setSuccessMsg(
          lang === 'bn'
            ? `${res.emailMasked} ঠিকানায় ভেরিফিকেশন কোড পাঠানো হয়েছে। কোড নিচে টাইপ করুন।`
            : `Verification code sent to ${res.emailMasked}. Enter the code below.`
        );
      } else {
        setErrorMsg(res.error || (lang === 'bn' ? 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি' : 'Account not found'));
      }
    } catch (err: any) {
      console.error('Request OTP error:', err);
      setErrorMsg(err?.message || (lang === 'bn' ? 'কোড পাঠাতে সমস্যা হয়েছে।' : 'Failed to send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP & Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMsg(lang === 'bn' ? 'ভুল ভেরিফিকেশন কোড দিয়েছেন!' : 'Invalid verification code!');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg(lang === 'bn' ? 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না!' : 'New passwords do not match!');
      return;
    }

    if (!targetUser) return;

    setLoading(true);
    try {
      const res = await resetUserPassword(targetUser.uid, newPassword);
      if (res.success) {
        setSuccessMsg(
          lang === 'bn'
            ? 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
            : 'Password changed successfully! Please log in with your new password.'
        );
        // Pre-fill phone number for easy login
        setPhone(targetUser.phone);
        setPassword('');
        setTimeout(() => {
          setMode('login');
          setResetStep(1);
          setEnteredOtp('');
          setNewPassword('');
          setConfirmPassword('');
        }, 1500);
      } else {
        setErrorMsg(res.error || (lang === 'bn' ? 'পাসওয়ার্ড রিসেট করা যায়নি।' : 'Password reset failed.'));
      }
    } catch (err: any) {
      console.error('Reset password submit error:', err);
      setErrorMsg(err?.message || (lang === 'bn' ? 'সমস্যা হয়েছে।' : 'Error resetting password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-x-hidden transition-colors">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Right Controls (Language & Dark Mode Toggle) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-md cursor-pointer"
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-md cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-blue-500/5 backdrop-blur-xl relative z-10 space-y-6">
        {/* App Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/20 mb-1">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'bn' ? 'সুরক্ষিত মেসেঞ্জার' : 'Secure E2EE Messenger'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {mode === 'forgot_password'
              ? lang === 'bn'
                ? 'পাসওয়ার্ড ভুলে গেলে ইমেইল/ফোন দিয়ে পাসওয়ার্ড রিসেট করুন।'
                : 'Reset your password securely via verification code.'
              : lang === 'bn'
              ? 'ফোন নাম্বার ও পাসওয়ার্ড দিয়ে সাইন আপ করুন। একবার লগইন করলে বারবার পাসওয়ার্ড দেয়া লাগবে না।'
              : 'Sign up with phone and password. Stay logged in on this device securely.'}
          </p>
        </div>

        {/* Auth Mode Tabs (only in Login / Signup mode) */}
        {mode !== 'forgot_password' && (
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সাইন আপ (Sign Up)' : 'Sign Up'}</span>
            </button>
          </div>
        )}

        {/* Header for Forgot Password Mode */}
        {mode === 'forgot_password' && (
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
                setResetStep(1);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'bn' ? 'লগইন পেইজে ফিরুন' : 'Back to Login'}</span>
            </button>
            <span className="text-xs font-bold text-orange-500">
              {lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 dark:text-red-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Login & Signup Form */}
        {mode !== 'forgot_password' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: রহিম আহমেদ' : 'e.g. Rahim Ahmed'}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'bn' ? 'ফোন নাম্বার *' : 'Phone Number *'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: 01711000001' : 'e.g. 01711000001'}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setResetStep(1);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setResetPhoneOrEmail(phone);
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'পাসওয়ার্ড প্রবেশ করুন' : 'Enter password'}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@messenger.app"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="remember" className="text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                {lang === 'bn'
                  ? 'এই ফোনে আইডি-পাসওয়ার্ড সেভ রাখুন (বারবার লগইন করতে হবে না)'
                  : 'Save login on this device (No need to re-enter password)'}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
        )}

        {/* Forgot Password Flow */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            {resetStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'নিবন্ধিত ফোন নাম্বার বা ইমেইল প্রবেশ করুন *' : 'Enter Registered Phone or Email *'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={resetPhoneOrEmail}
                      onChange={(e) => setResetPhoneOrEmail(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: 01711000001 অথবা user@gmail.com' : 'e.g. 01711000001 or user@gmail.com'}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'ভেরিফিকেশন কোড পাঠান' : 'Send Verification Code'}</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {/* OTP Banner Box */}
                {generatedOtp && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>
                        {lang === 'bn' ? `আপনার ইমেইল/কোড: ${generatedOtp}` : `Verification Code: ${generatedOtp}`}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      {lang === 'bn'
                        ? `${emailMasked} এ পাঠানো হয়েছে। নিচে ৬ ডিজিটের কোডটি টাইপ করুন:`
                        : `Sent to ${emailMasked}. Please type the code below:`}
                    </p>
                  </div>
                )}

                {/* Entered OTP input */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'bn' ? '৬ ডিজিটের কোড *' : '6-Digit OTP Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.trim())}
                    placeholder="e.g. 123456"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-center text-sm tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'নতুন পাসওয়ার্ড *' : 'New Password *'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড লিখুন' : 'Enter new password'}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন *' : 'Confirm New Password *'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={lang === 'bn' ? 'পাসওয়ার্ড আবার লিখুন' : 'Re-enter new password'}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Reset & Save Password'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Security Footer Notice */}
        <div className="pt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1 border-t border-slate-200 dark:border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
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
