import React, { useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { UserProfile } from '../types';

interface IncomingCallModalProps {
  caller: UserProfile;
  type: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
  lang: 'bn' | 'en';
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  type,
  onAccept,
  onReject,
  lang,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playIncomingRingtone = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(520, ctx.currentTime);
      osc2.frequency.setValueAtTime(660, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.4);
      osc2.stop(ctx.currentTime + 1.4);
    } catch {
      // Audio autoplay restrictions
    }
  };

  useEffect(() => {
    playIncomingRingtone();
    ringtoneIntervalRef.current = setInterval(() => {
      playIncomingRingtone();
    }, 2200);

    return () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden animate-scaleUp">
        {/* Pulsing Aura Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" />

        <div className="relative space-y-3">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <img
              src={caller.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${caller.uid}`}
              alt={caller.displayName}
              className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 relative z-10 shadow-xl"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {caller.displayName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{caller.phone}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-pulse">
            {type === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                <span>{lang === 'bn' ? 'ইনকামিং ভিডিও কল...' : 'Incoming Video Call...'}</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>{lang === 'bn' ? 'ইনকামিং অডিও কল...' : 'Incoming Audio Call...'}</span>
              </>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Decline / Reject Button */}
          <button
            type="button"
            onClick={onReject}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-105 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-red-400 transition-colors">
              {lang === 'bn' ? 'কেটে দিন' : 'Decline'}
            </span>
          </button>

          {/* Accept / Receive Button */}
          <button
            type="button"
            onClick={onAccept}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 group-hover:scale-110 transition-all animate-bounce">
              {type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">
              {lang === 'bn' ? 'রিসিভ করুন' : 'Accept'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
