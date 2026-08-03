import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2, Volume2, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioUrl: string, duration: number) => void;
  onCancel: () => void;
  lang: 'bn' | 'en';
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel,
  lang,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Start recording when component mounts
  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    stopTimer();
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const [micError, setMicError] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setMicError(
        lang === 'bn'
          ? 'মাইক্রোফোন পারমিশন পাওয়া যায়নি। আপনার ব্রাউজারে অনুমতি দিন।'
          : 'Microphone permission denied or not available in current environment.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const handleSend = () => {
    if (audioUrl) {
      onSendVoice(audioUrl, recordingTime || 1);
    }
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current || !audioUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatSecs = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (micError) {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-950/80 border border-red-800/80 rounded-2xl p-2.5 px-3 text-xs text-red-200 animate-fadeIn w-full">
        <span className="truncate">{micError}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={startRecording}
            className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            {lang === 'bn' ? 'পুনরায় চেষ্টা' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl p-2 px-3 shadow-lg animate-fadeIn w-full">
      {/* Hidden preview audio element */}
      {audioUrl && (
        <audio
          ref={audioPreviewRef}
          src={audioUrl}
          onEnded={() => setIsPlayingPreview(false)}
        />
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors"
        title={lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording status & Timer */}
      <div className="flex-1 flex items-center gap-2">
        {isRecording ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-xs font-semibold text-red-400">
              {lang === 'bn' ? 'রেকর্ডিং হচ্ছে...' : 'Recording...'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-200 ml-auto bg-slate-900 px-2 py-0.5 rounded-md">
              {formatSecs(recordingTime)}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={togglePreviewPlay}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-medium text-slate-300">
              {lang === 'bn' ? 'ভয়েস নোট প্রস্তুত' : 'Voice note ready'} ({formatSecs(recordingTime)})
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isRecording ? (
        <button
          onClick={stopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>{lang === 'bn' ? 'থামান' : 'Stop'}</span>
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!audioUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'পাঠান' : 'Send'}</span>
        </button>
      )}
    </div>
  );
};
