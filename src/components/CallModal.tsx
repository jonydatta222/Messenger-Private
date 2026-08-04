import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, ShieldCheck, SwitchCamera, AlertCircle, Volume2 } from 'lucide-react';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Play synthetic telephone ringtone using Web Audio API
  const playRingtonePulse = () => {
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
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch {
      // ignore audio context restrictions
    }
  };

  useEffect(() => {
    // Start ringtone sound loop during 'calling' state
    playRingtonePulse();
    ringtoneIntervalRef.current = setInterval(() => {
      playRingtonePulse();
    }, 2400);

    // Simulate connection after 2.5 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
      }
    }, 2500);

    return () => {
      clearTimeout(connectTimer);
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
      }
    };
  }, []);

  // Duration timer
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Request real media stream (Microphone + Camera)
  const initMediaStream = async (camMode: 'user' | 'environment') => {
    setMediaError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { facingMode: camMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback constraint
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? true : false,
        });
      }

      streamRef.current = stream;

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Voice level analyzer setup
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        updateAudioMeter();
      } catch {
        // ignore audio meter error
      }
    } catch (err: any) {
      console.error('Call media error:', err);
      setMediaError(
        lang === 'bn'
          ? 'মাইক্রোফোন বা ক্যামেরা অ্যাক্সেস করা সম্ভব হয়নি। ডিভাইস পারমিশন চেক করুন।'
          : 'Failed to access microphone/camera. Please check permissions.'
      );
    }
  };

  useEffect(() => {
    initMediaStream(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [facingMode]);

  // Handle Mute Audio Toggle
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted; // Toggle reverse
      });
    }
    setIsMuted(!isMuted);
  };

  // Handle Video Off Toggle
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff; // Toggle reverse
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Handle Camera Facing Switch
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const handleEnd = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    onEndCall();
  };

  const formatSecs = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-6 relative">
        {/* E2EE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>E2EE {type === 'video' ? 'Video' : 'Audio'} Call</span>
        </div>

        {/* Media Error Warning Banner */}
        {mediaError && (
          <div className="mt-8 mb-2 p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2 text-center font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mediaError}</span>
          </div>
        )}

        {/* Video Viewport OR Partner Avatar */}
        {type === 'video' ? (
          <div className="mt-10 mb-4 w-full aspect-4/3 bg-black rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center shadow-lg">
            {isVideoOff ? (
              <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <VideoOff className="w-8 h-8 text-slate-600" />
                <span>{lang === 'bn' ? 'ক্যামেরা বন্ধ আছে' : 'Camera Muted'}</span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
            )}

            {/* Partner Floating Avatar Thumbnail */}
            <div className="absolute top-3 right-3 w-16 h-20 rounded-xl overflow-hidden border-2 border-orange-500 shadow-md bg-slate-900">
              <img
                src={partner?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={partner?.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          /* Audio Call Visualizer Avatar */
          <div className="mt-10 mb-4 relative flex items-center justify-center">
            {/* Real Audio Pulsing Equalizer Ring */}
            <div
              className="absolute rounded-full bg-orange-500/30 transition-all duration-100 pointer-events-none"
              style={{
                width: `${120 + audioLevel * 0.6}px`,
                height: `${120 + audioLevel * 0.6}px`,
                opacity: callStatus === 'connected' ? 0.3 + audioLevel / 150 : 0.2,
              }}
            />
            {callStatus === 'calling' && (
              <div className="absolute w-36 h-36 rounded-full bg-orange-500/20 animate-ping pointer-events-none" />
            )}
            <img
              src={partner?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={partner?.displayName || 'User'}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-orange-500/80 shadow-2xl relative z-10"
            />
          </div>
        )}

        <h3 className="font-bold text-lg text-white text-center tracking-tight">{partner.displayName}</h3>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
          {callStatus === 'calling' ? (
            <span className="text-orange-400 animate-pulse flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>{lang === 'bn' ? 'কল দেওয়া হচ্ছে...' : 'Calling...'}</span>
            </span>
          ) : (
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>{formatSecs(callDuration)}</span>
            </span>
          )}
        </p>

        {/* Live Audio Equalizer Waveform Bars (Active during Audio call) */}
        {type === 'audio' && callStatus === 'connected' && (
          <div className="flex items-center gap-1 mt-4 h-6">
            {[40, 70, 100, 60, 90, 50, 80].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-orange-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(6, (h * audioLevel) / 100)}px`,
                  opacity: isMuted ? 0.2 : 0.8,
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3.5 mt-6 w-full">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-orange-400" />}
          </button>

          {type === 'video' && (
            <>
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5 text-red-400" /> : <Video className="w-5 h-5 text-orange-400" />}
              </button>

              <button
                onClick={toggleCameraFacing}
                className="p-3.5 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
                title={lang === 'bn' ? 'ক্যামেরা পরিবর্তন করুন' : 'Switch Camera'}
              >
                <SwitchCamera className="w-5 h-5 text-orange-400" />
              </button>
            </>
          )}

          <button
            onClick={handleEnd}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

