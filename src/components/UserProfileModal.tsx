import React, { useState, useRef } from 'react';
import { User, Phone, Mail, Shield, KeyRound, Copy, Check, X, LogOut, Edit3, Save, Lock, Camera, Upload, Image as ImageIcon, RefreshCw, Sparkles, Crop, Info } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile, isUserOnline } from '../services/chatService';
import { processProfileImageFile, readFileAsDataUrl } from '../utils/imageUtils';
import { CameraModal } from './CameraModal';
import { ImageCropModal } from './ImageCropModal';

interface UserProfileModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onLogout: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onOpenAbout?: () => void;
  lang: 'bn' | 'en';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  onClose,
  onLogout,
  onProfileUpdated,
  onOpenAbout,
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadingPhoto(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageToCrop(dataUrl);
    } catch (err: any) {
      console.error('Image processing error:', err);
      setUploadError(
        err?.message || (lang === 'bn' ? 'ছবি পড়তে সমস্যা হয়েছে।' : 'Failed to read selected image.')
      );
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    setShowCameraModal(false);
    setImageToCrop(imageDataUrl);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setPhotoURL(croppedDataUrl);
    setImageToCrop(null);

    // Auto-save cropped photo if in view mode
    if (!isEditing) {
      const updated = updateUserProfile(currentUser.uid, {
        photoURL: croppedDataUrl,
      });
      if (updated && onProfileUpdated) {
        onProfileUpdated(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    }
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
    <>
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

          {/* Hidden File Input for Direct Gallery Upload */}
          <input
            type="file"
            ref={directFileInputRef}
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />

          {/* Content Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs text-center font-medium flex items-center justify-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'bn' ? 'প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!'}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl text-red-700 dark:text-red-300 text-xs text-center font-medium">
                {uploadError}
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

                  {/* Profile Photo with Direct Phone Gallery Upload Overlay */}
                  <div className="relative pt-2 group/avatar cursor-pointer" onClick={() => directFileInputRef.current?.click()}>
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-orange-200 dark:ring-slate-700 shadow-md transition-transform group-hover/avatar:scale-105"
                    />
                    <span
                      className={`absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        isUserOnline(currentUser) ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      title={isUserOnline(currentUser) ? 'Online' : 'Offline'}
                    />
                    
                    {/* Camera Upload Badge */}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-orange-400" />
                      <span className="text-[9px] font-bold mt-0.5">{lang === 'bn' ? 'ছবি পাল্টান' : 'Change Photo'}</span>
                    </div>

                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-orange-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Quick Photo Upload Trigger Button below photo */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => directFileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'ফোন থেকে ছবি দিন' : 'Upload Photo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCameraModal(true)}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-orange-500" />
                      <span>{lang === 'bn' ? 'ক্যামেরা' : 'Camera'}</span>
                    </button>
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

                {/* About App / Developer Credit Button */}
                {onOpenAbout && (
                  <button
                    onClick={() => {
                      onOpenAbout();
                    }}
                    className="w-full p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 hover:from-orange-500/20 hover:to-amber-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Info className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-orange-600 dark:text-orange-400">
                          {lang === 'bn' ? 'অ্যাপস সম্পর্কে (About)' : 'About Application'}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {lang === 'bn' ? 'ডেভেলপার ক্রেডিট: জনি দত্ত (Jony Datta)' : 'App Credit: Jony Datta'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-500 group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </button>
                )}

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
                {/* Phone Device Photo Picker Section */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-500" />
                    <span>{lang === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করুন (Phone Gallery Photo)' : 'Change Profile Picture'}</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={photoURL || currentUser.photoURL}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-orange-500 shadow-md"
                      />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-orange-400">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />

                      {/* Primary Phone Gallery Button */}
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{lang === 'bn' ? 'ফোন থেকে ছবি সিলেক্ট করুন' : 'Select Photo from Phone'}</span>
                      </button>

                      {/* Camera Button */}
                      <button
                        type="button"
                        onClick={() => setShowCameraModal(true)}
                        className="w-full py-1.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-orange-500" />
                        <span>{lang === 'bn' ? 'ক্যামেরা দিয়ে ছবি তুলুন' : 'Take Photo with Camera'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preset Avatars & External URL Option */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {lang === 'bn' ? 'অথবা রেডিমেড অবতার:' : 'Or Presets:'}
                      </span>
                      {avatarPresets.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPhotoURL(url)}
                          className={`w-7 h-7 rounded-full overflow-hidden border-2 shrink-0 transition-transform cursor-pointer ${
                            photoURL === url ? 'border-orange-500 scale-110' : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder={lang === 'bn' ? 'অথবা ছবির লিংক টাইপ করুন (Optional Link)' : 'Or paste image URL link...'}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
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

      {/* Camera Modal */}
      {showCameraModal && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraModal(false)}
          lang={lang}
        />
      )}

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
          lang={lang}
        />
      )}
    </>
  );
};

