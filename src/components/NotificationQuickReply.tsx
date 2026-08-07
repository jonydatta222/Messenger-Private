import React, { useState, useEffect } from 'react';
import { 
  Send, 
  X, 
  CornerUpLeft, 
  CheckCircle2, 
  Bell, 
  ExternalLink
} from 'lucide-react';
import { UserProfile, Message } from '../types';
import { sendTextMessage } from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';

interface NotificationQuickReplyProps {
  incomingMsg: Message | null;
  sender: UserProfile | null;
  currentUser: UserProfile;
  lang: 'bn' | 'en';
  onDismiss: () => void;
  onOpenChat: (senderId: string) => void;
}

export const NotificationQuickReply: React.FC<NotificationQuickReplyProps> = ({
  incomingMsg,
  sender,
  currentUser,
  lang,
  onDismiss,
  onOpenChat,
}) => {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string>('');

  // Audio ringtone sound synthesis
  const playNotificationSound = () => {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio fallback
    }
  };

  useEffect(() => {
    if (incomingMsg && sender) {
      playNotificationSound();

      if (incomingMsg.text) {
        const decrypted = decryptMessage(
          incomingMsg.text,
          sender.publicKey,
          currentUser.secretKey
        );
        setDecryptedContent(decrypted || incomingMsg.text);
      } else if (incomingMsg.imageUrl) {
        setDecryptedContent(lang === 'bn' ? '📷 একটি ছবি পাঠিয়েছেন' : '📷 Sent an image');
      } else if (incomingMsg.audioUrl) {
        setDecryptedContent(lang === 'bn' ? '🎙️ একটি ভয়েস মেসেজ পাঠিয়েছেন' : '🎙️ Sent a voice message');
      } else {
        setDecryptedContent(lang === 'bn' ? 'নতুন মেসেজ এসেছে' : 'New message received');
      }

      setSentSuccess(false);
      setReplyText('');
    }
  }, [incomingMsg?.id, sender?.uid]);

  if (!incomingMsg || !sender) return null;

  const handleSendQuickReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || replyText).trim();
    if (!textToSend || sending) return;

    setSending(true);
    try {
      const replyToData = {
        id: incomingMsg.id,
        senderName: sender.displayName,
        text: decryptedContent,
      };

      await sendTextMessage(
        currentUser.uid,
        sender.uid,
        textToSend,
        sender.publicKey,
        currentUser.secretKey,
        replyToData
      );

      setSentSuccess(true);
      setReplyText('');

      // Auto dismiss after 1.8 seconds on successful quick reply
      setTimeout(() => {
        onDismiss();
      }, 1800);
    } catch (err) {
      console.error('Quick reply error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md animate-slideDown font-sans">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-orange-500/30 dark:border-orange-500/40 rounded-3xl p-4 shadow-2xl dark:shadow-orange-500/10 backdrop-blur-xl text-slate-900 dark:text-slate-100 relative overflow-hidden transition-all">
        {/* Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
            <Bell className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'নতুন মেসেজ এসেছে' : 'New Message Received'}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenChat(sender.uid)}
              className="px-2 py-1 bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 text-[11px] font-semibold text-orange-600 dark:text-orange-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={lang === 'bn' ? 'পুরো চ্যাট খুলুন' : 'Open Full Chat'}
            >
              <span>{lang === 'bn' ? 'অ্যাপে দেখুন' : 'Open App'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sender Info & Decrypted Message Preview */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={sender.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={sender.displayName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-500/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {sender.displayName}
              </h4>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {new Date(incomingMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-1">
              {sender.phone}
            </p>
            {/* Decrypted SMS Box */}
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 break-words leading-relaxed">
              {decryptedContent}
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {!sentSuccess && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-1">
            {[
              lang === 'bn' ? 'ঠিক আছে 👍' : 'Okay 👍',
              lang === 'bn' ? 'ধন্যবাদ 🙏' : 'Thanks 🙏',
              lang === 'bn' ? 'এখন ব্যস্ত আছি ⌛' : 'Busy right now ⌛',
              lang === 'bn' ? 'পরে কথা বলছি 📞' : 'Talk later 📞',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuickReply(undefined, chip)}
                disabled={sending}
                className="px-2.5 py-1 bg-slate-100 hover:bg-orange-100 dark:bg-slate-800 dark:hover:bg-orange-950/50 border border-slate-200 dark:border-slate-700/80 hover:border-orange-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-full transition-colors cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Sent Success Toast Banner inside Notification */}
        {sentSuccess ? (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 animate-fadeIn font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              {lang === 'bn'
                ? 'রিপ্লাই সফলভাবে পাঠানো হয়েছে!'
                : 'Reply sent successfully!'}
            </span>
          </div>
        ) : (
          /* Inline Direct Reply Form */
          <form onSubmit={(e) => handleSendQuickReply(e)} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  lang === 'bn'
                    ? 'রিপ্লাই লিখুন...'
                    : 'Type a reply...'
                }
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-3.5 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
              />
              <CornerUpLeft className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!replyText.trim() || sending}
              className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-40 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
            >
              {sending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{lang === 'bn' ? 'পাঠান' : 'Reply'}</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
