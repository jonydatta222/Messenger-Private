import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, RefreshCcw, Crop } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedImageDataUrl: string) => void;
  onCancel: () => void;
  lang?: 'bn' | 'en';
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  lang = 'bn',
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const generateCroppedImage = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const outputSize = 360; // Clean high quality profile dimension
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const viewport = viewportRef.current;
    const viewportSize = viewport ? viewport.clientWidth : 260;

    // Fill canvas background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();

    // Translate to center of output canvas
    ctx.translate(outputSize / 2, outputSize / 2);

    // Rotate canvas
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale multiplier relative to viewport
    const scaleFactor = outputSize / viewportSize;
    const finalZoom = zoom * scaleFactor;

    // Translate position adjusted for rotation
    let rad = (-rotation * Math.PI) / 180;
    let rx = position.x * Math.cos(rad) - position.y * Math.sin(rad);
    let ry = position.x * Math.sin(rad) + position.y * Math.cos(rad);

    ctx.translate(rx * scaleFactor, ry * scaleFactor);

    // Draw image centered
    const baseScale = Math.max(viewportSize / img.naturalWidth, viewportSize / img.naturalHeight);
    const drawWidth = img.naturalWidth * baseScale * zoom * scaleFactor;
    const drawHeight = img.naturalHeight * baseScale * zoom * scaleFactor;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    // Export to JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onCropComplete(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[95vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm">
              {lang === 'bn' ? 'ছবি ক্রপ ও পজিশন করুন' : 'Crop Profile Picture'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport & Cropper Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/80 relative overflow-hidden select-none min-h-[300px]">
          {/* Guide hint */}
          <div className="mb-3 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/60">
            <Move className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {lang === 'bn'
                ? 'ছবিটি টেনে ড্র্যাগ করুন ও জুম করে পজিশন ঠিক করুন'
                : 'Drag photo to position & use slider to zoom'}
            </span>
          </div>

          {/* Interactive Crop Frame Circle Viewport */}
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="relative w-64 h-64 rounded-full border-4 border-orange-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center bg-slate-800/40"
          >
            {/* Hidden Source Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Source"
              onLoad={() => setImageLoaded(true)}
              className="absolute pointer-events-none max-w-none transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            />

            {!imageLoaded && (
              <div className="text-xs text-slate-400 font-medium">
                {lang === 'bn' ? 'ছবি লোড হচ্ছে...' : 'Loading image...'}
              </div>
            )}
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="p-5 space-y-4 bg-slate-900 border-t border-slate-800">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <ZoomOut className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'জুম' : 'Zoom'}
              </span>
              <span className="font-mono text-orange-400 font-bold">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.15).toFixed(2)))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-orange-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons Toolbar: Rotate, Reset */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleRotate}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-orange-400" />
              <span>{lang === 'bn' ? 'ঘোরান (90°)' : 'Rotate 90°'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Reset Zoom & Rotation"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
          </div>

          {/* Final Submit / Cancel */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={generateCroppedImage}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ক্রপ ও সেট করুন' : 'Crop & Set Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
