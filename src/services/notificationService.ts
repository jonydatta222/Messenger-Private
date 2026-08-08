// Notification, Sound, and Vibration Utility Service
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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

// Persisted Notified Messages Tracker (prevents duplicate or repeated alerts for old SMS)
export const getNotifiedMsgIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('e2ee_notified_msg_ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

export const isMsgNotified = (msgId: string): boolean => {
  if (!msgId) return true;
  return getNotifiedMsgIds().has(msgId);
};

export const markMsgAsNotified = (msgId: string) => {
  if (typeof window === 'undefined' || !msgId) return;
  const set = getNotifiedMsgIds();
  set.add(msgId);
  const arr = Array.from(set);
  if (arr.length > 300) arr.splice(0, arr.length - 300);
  try {
    localStorage.setItem('e2ee_notified_msg_ids', JSON.stringify(arr));
  } catch {}
};

// Capacitor Local Notifications Service Class
export class NotificationService {
  
  // ১. পারমিশন চাওয়া ও চেক করা
  public static async requestNotificationPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status: PermissionStatus = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          const request = await LocalNotifications.requestPermissions();
          return request.display === 'granted';
        }
        return true;
      }
    } catch (e) {
      console.warn('Capacitor local notifications permission check error:', e);
    }

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
  }

  // ২. হাই-ইমপর্টেন্স নোটিফিকেশন চ্যানেল ও অ্যাকশন টাইপ তৈরি করা (Android 8.0+ এর জন্য আবশ্যক)
  public static async createNotificationChannel(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.createChannel({
          id: 'sms_alerts',
          name: 'SMS Alerts',
          description: 'New SMS notifications channel',
          importance: 5, // 5 = High/Max Importance (স্ক্রিনে পপ-আপ ও সাউন্ড হবে)
          sound: 'default',
          visibility: 1,
          vibration: true
        });

        // Register direct reply action type for notification shade
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'SMS_REPLY_ACTION',
              actions: [
                {
                  id: 'quick_reply',
                  title: 'রিপ্লাই দিন (Reply)',
                  input: true,
                  inputButtonTitle: 'পাঠান (Send)',
                }
              ]
            }
          ]
        });
      }
    } catch (e) {
      console.warn('Capacitor createChannel error:', e);
    }
  }

  // ৩. SMS আসার সাথে সাথে Local Notification পাঠানো (Direct Reply সহ, Grouping Support)
  public static async showSmsNotification(
    title: string,
    messageBody: string,
    senderId?: string,
    notificationTag: string = 'sms_grouped_alerts'
  ): Promise<void> {
    const hasPermission = await this.requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn("Notification permission was denied.");
      return;
    }

    // চ্যানেল তৈরি ও অ্যাকশন রেজিস্ট্রেশন নিশ্চিত করা
    await this.createNotificationChannel();

    // Stable numeric ID so Android local notification replaces existing active card instead of duplicating
    const notificationId = senderId 
      ? (Math.abs(senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 80000) + 10000 
      : 8888;

    const displayTitle = title.startsWith('নতুন') || title.startsWith('মেসেঞ্জার') ? title : `নতুন SMS: ${title}`;

    let capacitorScheduled = false;

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: displayTitle,
              body: messageBody,
              id: notificationId,
              channelId: 'sms_alerts', // তৈরি করা চ্যানেলের আইডি
              schedule: { at: new Date(Date.now() + 50) }, // সাথে সাথে ট্র্রিগার হবে
              sound: undefined,
              actionTypeId: 'SMS_REPLY_ACTION',
              extra: {
                type: 'SMS_ALERT',
                senderId: senderId || '',
                senderName: title,
              }
            }
          ]
        });
        capacitorScheduled = true;
      } catch (err) {
        console.warn("LocalNotifications schedule error, falling back to Web Notification:", err);
      }
    }

    // Fallback to Web / System Notification if on browser or if Capacitor schedule failed
    if (!capacitorScheduled) {
      await sendSystemNotification(displayTitle, messageBody, undefined, undefined, notificationTag);
    }
  }
}

// Global Capacitor Action Listener for native Notification Shade reply
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const extra = notificationAction.notification.extra;
      const userReplyText = notificationAction.inputValue || '';

      if (extra && extra.senderId && userReplyText.trim()) {
        window.dispatchEvent(
          new CustomEvent('e2ee_messenger_direct_notification_reply', {
            detail: {
              senderId: extra.senderId,
              replyText: userReplyText.trim(),
            },
          })
        );
      }
    });
  } catch (err) {
    console.warn('Error attaching LocalNotifications action listener:', err);
  }
}

// Helper function: SMS পাওয়ার পর নোটিফিকেশন ট্রিগার করা
export async function onSmsReceived(senderNumber: string, smsText: string) {
  await NotificationService.showSmsNotification(senderNumber, smsText);
}

// Synthesize pleasant double-chime notification sound using Web Audio API
export const enableBackgroundKeepAlive = () => {
  if (typeof window === 'undefined') return;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {}

  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      if (audioCtx && audioCtx.state === 'running') {
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.setValueAtTime(0.000001, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.005);
        } catch {}
      }
    }, 12000);
  }
};

let keepAliveInterval: any = null;

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
  onClick?: () => void,
  tag: string = 'sms_grouped_alerts'
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
    tag, // Grouping tag so old active notification is updated instead of duplicated
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
