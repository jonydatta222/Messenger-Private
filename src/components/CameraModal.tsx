import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Upload, SwitchCamera, AlertCircle } from 'lucide-react';

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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async (mode: 'user' | 'environment') => {
    setIsInitializing(true);
    setError(null);
    stopCamera();

    try {
      let mediaStream: MediaStream | null = null;
      try {
        // High quality constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('High quality camera constraint failed, trying basic constraint:', firstErr);
        try {
          // Medium constraint
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (secondErr) {
          console.warn('Facing mode constraint failed, trying generic video constraint:', secondErr);
          // Generic fallback
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError(
        lang === 'bn'
          ? 'ক্যামেরা চালু করা সম্ভব হয়নি। নিচের বোতাম চেপে অনুমতি দিন অথবা গ্যালারি/ক্যামেরা থেকে ছবি আপলোড করুন।'
          : 'Camera access blocked. Tap the button below to grant permission or upload photo directly.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image if front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera(facingMode);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white bg-slate-900/90">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-orange-500" />
            <span>{lang === 'bn' ? 'ছবি তুলুন / সিলেক্ট করুন' : 'Take or Select Photo'}</span>
          </h3>
          <div className="flex items-center gap-2">
            {!capturedImage && !error && (
              <button
                onClick={toggleCameraFacing}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
                title={lang === 'bn' ? 'ক্যামেরা পরিবর্তন করুন' : 'Switch Camera'}
              >
                <SwitchCamera className="w-4 h-4 text-orange-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-4/3 sm:aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-slate-300 text-xs flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2 animate-bounce" />
              <p className="text-amber-300 mb-3 max-w-xs">{error}</p>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                {/* Native Mobile Camera Trigger */}
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors">
                  <Camera className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ফোনের ক্যামেরা দিয়ে তুলুন' : 'Open Camera App'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Gallery Picker */}
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors">
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span>{lang === 'bn' ? 'গ্যালারি থেকে সিলেক্ট করুন' : 'Select from Gallery'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 text-xs text-orange-400 font-medium gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{lang === 'bn' ? 'ক্যামেরা চালু হচ্ছে...' : 'Starting camera...'}</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <label className="cursor-pointer text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
            <Upload className="w-4 h-4 text-orange-400" />
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
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'পুনরায় তুলুন' : 'Retake'}</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ক্যামেরা ঘুরান' : 'Switch Camera'}
              >
                <SwitchCamera className="w-5 h-5 text-orange-400" />
              </button>
              <button
                onClick={takePhoto}
                disabled={!!error || isInitializing}
                className="w-13 h-13 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

