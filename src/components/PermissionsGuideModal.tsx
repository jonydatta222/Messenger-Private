import React, { useState, useEffect } from 'react';
import { ShieldCheck, Camera, Mic, Layers, Bell, CheckCircle2, X, AlertTriangle, ExternalLink, Settings, RefreshCw } from 'lucide-react';

interface PermissionsGuideModalProps {
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const PermissionsGuideModal: React.FC<PermissionsGuideModalProps> = ({
  onClose,
  lang,
}) => {
  const [cameraStatus, setCameraStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [micStatus, setMicStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [notifStatus, setNotifStatus] = useState<string>('default');
  const [testingMedia, setTestingMedia] = useState(false);

  const checkPermissions = async () => {
    // Check Notification status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    }

    // Check Camera & Mic if Permissions API is supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const camRes = await navigator.permissions.query({ name: 'camera' as any });
        setCameraStatus(camRes.state as any);
        camRes.onchange = () => setCameraStatus(camRes.state as any);
      } catch {
        setCameraStatus('unknown');
      }

      try {
        const micRes = await navigator.permissions.query({ name: 'microphone' as any });
        setMicStatus(micRes.state as any);
        micRes.onchange = () => setMicStatus(micRes.state as any);
      } catch {
        setMicStatus('unknown');
      }
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const requestCameraAndMic = async () => {
    setTestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStatus('granted');
      setMicStatus('granted');
      // Stop stream after testing
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      console.warn('Camera/Mic permission request error:', err);
      setCameraStatus('denied');
      setMicStatus('denied');
    } finally {
      setTestingMedia(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-100">
              {lang === 'bn' ? 'অ্যান্ড্রয়েড অ্যাপ পারমিশন ও সেটিংস' : 'Android App Permissions & Settings'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Top Banner Notice */}
          <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold text-orange-300">
                {lang === 'bn' ? 'APK পারমিশন কনফিগারেশন আপডেট করা হয়েছে' : 'APK Permissions Configured'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {lang === 'bn'
                  ? 'বিল্ড ফাইলে ক্যামেরা, মাইক্রোফোন, পপ-আপ উইন্ডো ও নোটিফিকেশনের সব প্রয়োজনীয় পারমিশন যুক্ত করা হয়েছে। নিচে পারমিশন স্ট্যাটাস টেস্ট করতে পারেন:'
                  : 'All AndroidManifest permissions for camera, microphone, overlay windows, and storage have been injected into the APK build.'}
              </p>
            </div>
          </div>

          {/* Camera & Microphone Status Test Box */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-orange-400" />
                <span>{lang === 'bn' ? 'ক্যামেরা ও মাইক্রোফোন টেস্ট' : 'Camera & Mic Permission Test'}</span>
              </span>
              <button
                onClick={requestCameraAndMic}
                disabled={testingMedia}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {testingMedia ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'bn' ? 'অনুমতি টেস্ট করুন' : 'Test Permission'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-300">
                  <Camera className="w-3.5 h-3.5 text-orange-400" />
                  <span>{lang === 'bn' ? 'ক্যামেরা:' : 'Camera:'}</span>
                </span>
                <span
                  className={`font-bold ${
                    cameraStatus === 'granted'
                      ? 'text-emerald-400'
                      : cameraStatus === 'denied'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                >
                  {cameraStatus === 'granted'
                    ? lang === 'bn' ? 'অন (Granted)' : 'Granted'
                    : cameraStatus === 'denied'
                    ? lang === 'bn' ? 'অফ (Denied)' : 'Denied'
                    : lang === 'bn' ? 'প্রয়োজন (Ask)' : 'Ask'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mic className="w-3.5 h-3.5 text-orange-400" />
                  <span>{lang === 'bn' ? 'মাইক্রোফোন:' : 'Mic:'}</span>
                </span>
                <span
                  className={`font-bold ${
                    micStatus === 'granted'
                      ? 'text-emerald-400'
                      : micStatus === 'denied'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                >
                  {micStatus === 'granted'
                    ? lang === 'bn' ? 'অন (Granted)' : 'Granted'
                    : micStatus === 'denied'
                    ? lang === 'bn' ? 'অফ (Denied)' : 'Denied'
                    : lang === 'bn' ? 'প্রয়োজন (Ask)' : 'Ask'}
                </span>
              </div>
            </div>
          </div>

          {/* Display Pop-Up Window / Draw Over Other Apps Guide */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
            <h4 className="font-bold text-orange-300 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>{lang === 'bn' ? 'পপ-আপ উইন্ডো (Display Over Other Apps) পারমিশন:' : 'Display Over Other Apps Permission:'}</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'অ্যাপ মিনিমাইজ করা অবস্থায় চ্যাট হেড স্ক্রিনে ভাসিয়ে রাখতে অথবা পপ-আপ উইন্ডো ব্যবহার করতে ফোনের সেটিংস থেকে এই অপশন অন করতে হয়:'
                : 'To float chat heads or display pop-up windows over other apps on your phone:'}
            </p>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 space-y-1.5 text-[11px] text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>{lang === 'bn' ? 'ফোনের Settings > Apps > Secure Messenger অ্যাপ ওপেন করুন।' : 'Open Phone Settings > Apps > Secure Messenger.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">2</span>
                <span>{lang === 'bn' ? 'Display over other apps (বা Appear on top) সিলেক্ট করুন।' : 'Tap "Display over other apps" or "Appear on top".'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">3</span>
                <span>{lang === 'bn' ? 'টগলটি ON (Allow) করে দিন।' : 'Toggle switch to ON.'}</span>
              </div>
            </div>
          </div>

          {/* Notifications Request Box */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-orange-400" />
                <span>{lang === 'bn' ? 'ব্যাকগ্রাউন্ড নোটিফিকেশন' : 'Push Notifications'}</span>
              </h4>
              <p className="text-[10px] text-slate-400">
                {lang === 'bn' ? 'নতুন মেসেজ এলে রিং ও পপ-আপ মেসেজ দেবে।' : 'Receive instant ring & popups on new messages.'}
              </p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                notifStatus === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {notifStatus === 'granted'
                ? lang === 'bn' ? 'অন আছে' : 'Active'
                : lang === 'bn' ? 'অন করুন' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
