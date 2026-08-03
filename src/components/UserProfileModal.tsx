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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">
              {isEditing
                ? (lang === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile')
                : (lang === 'bn' ? 'আমার প্রোফাইল ও নিরাপত্তা' : 'My Account & Security')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {saveSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!'}</span>
            </div>
          )}

          {!isEditing ? (
            <>
              {/* Profile Overview Card */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 relative group">
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-3 right-3 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'এডিট সেটিং' : 'Edit Profile'}</span>
                </button>

                <div className="relative pt-2">
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-600/30 shadow-xl"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-slate-950" title="Online" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{currentUser.displayName}</h4>
                  <p className="text-xs text-blue-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {currentUser.phone}
                  </p>
                  {currentUser.email && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {currentUser.email}
                    </p>
                  )}
                </div>

                <div className="w-full pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>{currentUser.bio || '🔐 E2EE Secured User'}</span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-emerald-200">
                    {lang === 'bn' ? 'ব্যক্তিগত ও সুরক্ষিত প্রোফাইল' : 'Private & Isolated Account'}
                  </p>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    {lang === 'bn'
                      ? 'আপনার অ্যাকাউন্টের বার্তা ও চ্যাট শুধুমাত্র আপনার লগইন সেশনে সীমাবদ্ধ। অন্য কেউ আপনার অ্যাকাউন্টে এক্সেস পাবে না।'
                      : 'Your messages and inbox are strictly isolated to your login session. No outside access permitted.'}
                  </p>
                </div>
              </div>

              {/* E2EE Key Pair Display */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  {lang === 'bn' ? 'আপনার E2EE পাবলিক কি (Public Key):' : 'Your E2EE Public Key:'}
                </p>
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 font-mono text-[10px] text-emerald-400 break-all">
                  <span className="truncate flex-1">{currentUser.publicKey}</span>
                  <button
                    onClick={() => copyToClipboard(currentUser.publicKey, 'public')}
                    className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white shrink-0 transition-colors"
                    title="Copy Public Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedKey === 'public' && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'পাবলিক কি কপি করা হয়েছে!' : 'Public Key copied!'}</span>
                  </p>
                )}
              </div>

              {/* Logout & Edit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'প্রোফাইল পরিবর্তন করুন' : 'Edit Settings'}</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
                </button>
              </div>
            </>
          ) : (
            /* Profile Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {lang === 'bn' ? 'প্রোফাইল ছবি / অবতার নির্বাচন করুন:' : 'Profile Picture / Avatar:'}
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={photoURL || currentUser.photoURL}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500 shadow-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://image-link.com/avatar.png"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-500 shrink-0">{lang === 'bn' ? 'রেডিমেড পিক:' : 'Presets:'}</span>
                  {avatarPresets.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoURL(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 transition-transform ${
                        photoURL === url ? 'border-blue-500 scale-110' : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'আপনার নাম (Name)' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ফোন নাম্বার (Phone Number)' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড (Password)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইমেইল এড্রেস (Email - ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'বায়ো / স্ট্যাটাস (Bio / Status)' : 'Bio / Status'}
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Busy | Available | Learning..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Save & Cancel Buttons */}
              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all"
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
