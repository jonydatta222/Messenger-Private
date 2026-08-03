import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Upload } from 'lucide-react';

interface CameraModalProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const CameraModal: React.FC<CameraModalProps> = ({
  onCapture,
  onClose,
  lang,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError(
        lang === 'bn'
          ? 'ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ওয়েবক্যাম বা ব্রাউজার পারমিশন চেক করুন।'
          : 'Failed to access camera. Please check webcam or browser permissions.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            {lang === 'bn' ? 'ছবি তুলুন / সিলেক্ট করুন' : 'Take or Select Photo'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <p className="text-amber-400 mb-2">{error}</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors mt-2">
                <Upload className="w-4 h-4" />
                <span>{lang === 'bn' ? 'গ্যালারি থেকে সিলেক্ট করুন' : 'Select from Gallery'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <label className="cursor-pointer text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>{lang === 'bn' ? 'গ্যালারি' : 'Gallery'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {capturedImage ? (
            <div className="flex items-center gap-2">
              <button
                onClick={retakePhoto}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'পুনরায় তুলুন' : 'Retake'}</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={takePhoto}
              disabled={!!error}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
