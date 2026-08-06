import React, { useState } from 'react';
import { User, Phone, Mail, Shield, KeyRound, Copy, Check, X, LogOut, Edit3, Save, Lock, Camera } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../services/chatService';

interface UserProfileModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onLogout: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  lang: 'bn' | 'en';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  onClose,
  onLogout,
  onProfileUpdated,
  lang,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit form states
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [password, setPassword] = useState(currentUser.password || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !phone.trim()) return;

    const updated = updateUserProfile(currentUser.uid, {
      displayName: displayName.trim(),
      phone: phone.trim(),
      password: password.trim() || currentUser.password,
      email: email.trim(),
      bio: bio.trim(),
      photoURL: photoURL.trim() || currentUser.photoURL,
    });

    if (updated) {
      if (onProfileUpdated) onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1200);
    }
  };

  const avatarPresets = [
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || 'User1')}`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || 'User2')}`,
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80`,
    `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80`,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {isEditing
                ? (lang === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile')
                : (lang === 'bn' ? 'আমার প্রোফাইল ও নিরাপত্তা' : 'My Account & Security')}
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
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs text-center font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!'}</span>
            </div>
          )}

          {!isEditing ? (
            <>
              {/* Profile Overview Card */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 relative group">
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-3 right-3 px-2.5 py-1.5 bg-orange-100 dark:bg-slate-700 hover:bg-orange-200 dark:hover:bg-slate-600 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'এডিট সেটিং' : 'Edit Profile'}</span>
                </button>

                <div className="relative pt-2">
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-orange-200 dark:ring-slate-700 shadow-md"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" title="Online" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{currentUser.displayName}</h4>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-mono flex items-center gap-1 font-semibold">
                      <Phone className="w-3.5 h-3.5" />
                      {currentUser.phone}
                    </p>
                    <button
                      onClick={() => copyToClipboard(currentUser.phone, 'phone')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Copy Phone"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {copiedKey === 'phone' && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {lang === 'bn' ? 'ফোন নাম্বার কপি হয়েছে!' : 'Phone number copied!'}
                    </p>
                  )}

                  {/* User Unique ID */}
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-sans font-bold">ID:</span>
                    <span className="truncate max-w-[160px] font-semibold text-slate-800 dark:text-slate-200">{currentUser.uid}</span>
                    <button
                      onClick={() => copyToClipboard(currentUser.uid, 'uid')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Copy User ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {copiedKey === 'uid' && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {lang === 'bn' ? 'ইউজার আইডি কপি হয়েছে!' : 'User ID copied!'}
                    </p>
                  )}

                  {currentUser.email && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {currentUser.email}
                    </p>
                  )}
                </div>

                <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <span>{currentUser.bio || '🔐 E2EE Secured User'}</span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    {lang === 'bn' ? 'ব্যক্তিগত ও সুরক্ষিত প্রোফাইল' : 'Private & Isolated Account'}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {lang === 'bn'
                      ? 'আপনার অ্যাকাউন্টের বার্তা ও চ্যাট শুধুমাত্র আপনার লগইন সেশনে সীমাবদ্ধ। অন্য কেউ আপনার অ্যাকাউন্টে এক্সেস পাবে না।'
                      : 'Your messages and inbox are strictly isolated to your login session. No outside access permitted.'}
                  </p>
                </div>
              </div>

              {/* E2EE Key Pair Display */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                  {lang === 'bn' ? 'আপনার E2EE পাবলিক কি (Public Key):' : 'Your E2EE Public Key:'}
                </p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 break-all">
                  <span className="truncate flex-1">{currentUser.publicKey}</span>
                  <button
                    onClick={() => copyToClipboard(currentUser.publicKey, 'public')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shrink-0 transition-colors cursor-pointer"
                    title="Copy Public Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedKey === 'public' && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'পাবলিক কি কপি করা হয়েছে!' : 'Public Key copied!'}</span>
                  </p>
                )}
              </div>

              {/* Logout & Edit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'প্রোফাইল পরিবর্তন করুন' : 'Edit Settings'}</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="py-3 px-4 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          ) : (
            /* Profile Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-4 text-slate-900 dark:text-slate-100">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'bn' ? 'প্রোফাইল ছবি / অবতার নির্বাচন করুন:' : 'Profile Picture / Avatar:'}
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={photoURL || currentUser.photoURL}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-orange-500 shadow-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://image-link.com/avatar.png"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">{lang === 'bn' ? 'রেডিমেড পিক:' : 'Presets:'}</span>
                  {avatarPresets.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoURL(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 transition-transform ${
                        photoURL === url ? 'border-orange-500 scale-110' : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'আপনার নাম (Name)' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'ফোন নাম্বার (Phone Number)' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড (Password)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইমেইল এড্রেস (Email - ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'বায়ো / স্ট্যাটাস (Bio / Status)' : 'Bio / Status'}
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Busy | Available | Learning..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Save & Cancel Buttons */}
              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'সেভ করুন' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
