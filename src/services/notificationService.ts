// Notification, Sound, and Vibration Utility Service

let audioCtx: AudioContext | null = null;

// Check if silent mode is enabled
export const isAppSilentMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('app_silent_mode') === 'true';
};

export const setAppSilentMode = (silent: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_silent_mode', silent ? 'true' : 'false');
  window.dispatchEvent(new Event('e2ee_messenger_updated'));
};

// Synthesize pleasant double-chime notification sound using Web Audio API
export const playNotificationChime = () => {
  try {
    if (typeof window === 'undefined') return;
    // Check if user set silent mode / mute sound
    if (isAppSilentMode()) return;

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
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch {
        return false;
      }
    }
  }
  return false;
};

// Dispatch System Notification (Android / Desktop / ServiceWorker compatible)
export const sendSystemNotification = async (
  title: string,
  body: string,
  iconUrl?: string,
  onClick?: () => void
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return;
  }

  const options: any = {
    body,
    icon: iconUrl || '/icon.png',
    badge: '/icon.png',
    tag: 'sms_notification_' + Date.now(),
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  try {
    // Try Service Worker registration first (recommended for mobile Android)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }

    // Standard Notification Fallback
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };
  } catch (err) {
    console.debug('System notification error:', err);
  }
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
