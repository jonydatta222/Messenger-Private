import React, { useState, useEffect } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface CallModalProps {
  partner: UserProfile;
  type: 'audio' | 'video';
  onEndCall: () => void;
  lang: 'bn' | 'en';
}

export const CallModal: React.FC<CallModalProps> = ({
  partner,
  type,
  onEndCall,
  lang,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // Simulate connection after 2 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatSecs = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-6 relative">
        {/* E2EE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>E2EE Encrypted Call</span>
        </div>

        {/* Partner Avatar & Pulse Ring */}
        <div className="mt-8 mb-4 relative flex items-center justify-center">
          {callStatus === 'calling' && (
            <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 animate-ping" />
          )}
          <img
            src={partner?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={partner?.displayName || 'User'}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-800 shadow-xl relative z-10"
          />
        </div>

        <h3 className="font-bold text-lg text-white text-center">{partner.displayName}</h3>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          {callStatus === 'calling' ? (
            <span className="text-blue-400 animate-pulse">
              {lang === 'bn' ? 'কল দেওয়া হচ্ছে...' : 'Calling...'}
            </span>
          ) : (
            <span className="text-emerald-400 font-mono font-medium">
              {formatSecs(callDuration)}
            </span>
          )}
        </p>

        {type === 'video' && (
          <div className="mt-4 w-full h-32 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
            {isVideoOff ? (
              <p className="text-xs text-slate-500">Video Muted</p>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                <Video className="w-8 h-8 text-indigo-400/40 animate-pulse" />
                <span className="text-xs text-indigo-200/60 font-medium ml-2">Encrypted Video Stream</span>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 mt-8 w-full">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-2xl transition-all ${
              isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {type === 'video' && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3.5 rounded-2xl transition-all ${
                isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
