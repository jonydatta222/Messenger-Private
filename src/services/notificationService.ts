// Notification, Sound, and Vibration Utility Service

let audioCtx: AudioContext | null = null;

// Synthesize pleasant double-chime notification sound using Web Audio API
export const playNotificationChime = () => {
  try {
    if (typeof window === 'undefined') return;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First note (E5 - 659.25 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second note (B5 - 987.77 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.debug('Notification chime play failed:', err);
  }
};

// Trigger device vibration
export const triggerVibration = (pattern: number[] = [200, 100, 200]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
};

// Request Notification Permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  }
  return false;
};

// Global Title Flash alert
let originalTitle = typeof document !== 'undefined' ? document.title : 'Secure Messenger';
let titleInterval: any = null;

export const flashDocumentTitle = (text: string) => {
  if (typeof document === 'undefined') return;
  if (!originalTitle || originalTitle.includes('💬')) {
    originalTitle = 'Secure Messenger';
  }

  if (titleInterval) clearInterval(titleInterval);
  let toggle = false;
  titleInterval = setInterval(() => {
    document.title = toggle ? text : originalTitle;
    toggle = !toggle;
  }, 1000);

  // Restore title after 10 seconds or when user focuses window
  const restoreTitle = () => {
    if (titleInterval) clearInterval(titleInterval);
    document.title = originalTitle;
    window.removeEventListener('focus', restoreTitle);
  };

  window.addEventListener('focus', restoreTitle);
  setTimeout(restoreTitle, 10000);
};
