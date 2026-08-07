export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('অনুগ্রহ করে একটি ছবি ফাইল সিলেক্ট করুন (Please select a valid image file)'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ হয়েছে (Failed to read file)'));
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
};

/**
 * Helper utility to process and compress profile images selected from device / phone gallery or camera.
 * Crops the image to a clean 320x320 square canvas and compresses it to a lightweight JPEG Data URL.
 */
export const processProfileImageFile = (file: File, maxDimension = 320): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('অনুগ্রহ করে একটি ছবি ফাইল সিলেক্ট করুন (Please select a valid image file)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ হয়েছে (Failed to read file)'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ছবি লোড করা সম্ভব হয়নি (Failed to load image)'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = maxDimension;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          // Center crop square math
          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;

          if (sw > sh) {
            sx = (sw - sh) / 2;
            sw = sh;
          } else if (sh > sw) {
            sy = (sh - sw) / 2;
            sh = sw;
          }

          // Enable smooth scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

          // Compress to JPEG with 0.85 quality (~30-50KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        } catch (err) {
          // Fallback to raw data url if canvas fails
          resolve(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
