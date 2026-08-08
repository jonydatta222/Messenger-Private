import React, { useState, useEffect } from 'react';
import { 
  Send, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  CornerUpLeft,
  ExternalLink
} from 'lucide-react';
import { UserProfile, Message } from '../types';
import { sendTextMessage, getMessages } from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';

interface NotificationQuickReplyProps {
  incomingMsg: Message | null;
  incomingMsgs?: Message[];
  sender: UserProfile | null;
  currentUser: UserProfile;
  lang: 'bn' | 'en';
  onDismiss: () => void;
  onOpenChat: (senderId: string) => void;
}

interface DecryptedMessageItem {
  id: string;
  decryptedText: string;
  timestamp: number;
}

export const NotificationQuickReply: React.FC<NotificationQuickReplyProps> = ({
  incomingMsg,
  incomingMsgs,
  sender,
  currentUser,
  lang,
  onDismiss,
  onOpenChat,
}) => {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [stackedMessages, setStackedMessages] = useState<DecryptedMessageItem[]>([]);

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
    if (sender) {
      playNotificationSound();

      // Gather all unread/incoming messages for this sender to display in stacked format
      let rawMsgs: Message[] = [];
      
      if (incomingMsgs && incomingMsgs.length > 0) {
        rawMsgs = [...incomingMsgs];
      } else {
        // Retrieve local messages for this sender
        const allLocals = getMessages();
        const unreads = allLocals.filter(
          (m) =>
            !m.deletedForUsers?.includes(currentUser.uid) &&
            m.senderId === sender.uid &&
            m.receiverId === currentUser.uid &&
            !m.read
        );

        if (unreads.length > 0) {
          rawMsgs = unreads;
        } else if (incomingMsg) {
          rawMsgs = [incomingMsg];
        }
      }

      // Sort by timestamp ascending (oldest first, newest at bottom)
      rawMsgs.sort((a, b) => a.timestamp - b.timestamp);

      // Decrypt each message line
      const decryptedList: DecryptedMessageItem[] = rawMsgs.map((msg) => {
        let textContent = '';
        if (msg.text) {
          const decrypted = decryptMessage(
            msg.text,
            sender.publicKey,
            currentUser.secretKey
          );
          textContent = decrypted || msg.text;
        } else if (msg.imageUrl) {
          textContent = lang === 'bn' ? '📷 একটি ছবি পাঠিয়েছেন' : '📷 Sent an image';
        } else if (msg.audioUrl) {
          textContent = lang === 'bn' ? '🎙️ একটি ভয়েস মেসেজ পাঠিয়েছেন' : '🎙️ Sent a voice message';
        } else {
          textContent = lang === 'bn' ? 'নতুন মেসেজ এসেছে' : 'New message received';
        }

        return {
          id: msg.id,
          decryptedText: textContent,
          timestamp: msg.timestamp,
        };
      });

      setStackedMessages(decryptedList);
      setSentSuccess(false);
      setReplyText('');
      setShowReplyInput(false);
      setIsExpanded(true);
    }
  }, [incomingMsg?.id, incomingMsgs?.length, sender?.uid]);

  if (!sender || stackedMessages.length === 0) return null;

  const handleSendQuickReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || replyText).trim();
    if (!textToSend || sending) return;

    setSending(true);
    try {
      const lastMsg = stackedMessages[stackedMessages.length - 1];
      const replyToData = lastMsg
        ? {
            id: lastMsg.id,
            senderName: sender.displayName,
            text: lastMsg.decryptedText,
          }
        : undefined;

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

  const handleLikeQuickReply = () => {
    handleSendQuickReply(undefined, '👍');
  };

  const lastMsgTime = stackedMessages.length > 0
    ? new Date(stackedMessages[stackedMessages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'now';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-md animate-slideDown font-sans">
      {/* Phone Lock Screen / System Style Dark Notification Card */}
      <div className="bg-[#222225] dark:bg-[#1b1b1d] border border-white/10 rounded-[26px] p-4 shadow-2xl text-white relative overflow-hidden backdrop-blur-2xl transition-all">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sender Avatar with Messenger+ Badge */}
            <div className="relative shrink-0 cursor-pointer" onClick={() => onOpenChat(sender.uid)}>
              <img
                src={sender.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={sender.displayName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] shadow-sm ring-2 ring-[#222225]">
                <ShieldCheck className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Title Line: Sender Name • Messenger+ • Time */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 
                  onClick={() => onOpenChat(sender.uid)}
                  className="font-semibold text-[13.5px] text-white truncate hover:underline cursor-pointer"
                >
                  {sender.displayName}
                </h4>
                <span className="text-slate-400 text-[11px] font-medium">• Messenger+ • {lastMsgTime}</span>
              </div>
            </div>
          </div>

          {/* Controls: Expand/Collapse Chevron & Close */}
          <div className="flex items-center gap-1 shrink-0">
            {stackedMessages.length > 1 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                title={isExpanded ? 'একত্রিত করুন' : 'বিস্তারিত দেখুন'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stacked Messages List (Exact line-by-line format like screenshot) */}
        <div className="mt-2.5 mb-3 px-0.5">
          {isExpanded ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-none pr-1">
              {stackedMessages.map((msgItem, index) => (
                <div 
                  key={msgItem.id || index} 
                  className="text-[13.5px] text-slate-100 font-normal leading-snug break-words tracking-wide"
                >
                  {msgItem.decryptedText}
                </div>
              ))}
            </div>
          ) : (
            /* Collapsed Preview showing only last message */
            <div className="text-[13.5px] text-slate-100 font-normal leading-snug truncate">
              {stackedMessages[stackedMessages.length - 1].decryptedText}
              <span className="text-[10px] text-orange-400 font-medium ml-2">
                (+{stackedMessages.length - 1} {lang === 'bn' ? 'টি মেসেজ' : 'more'})
              </span>
            </div>
          )}
        </div>

        {/* Sent Success State Banner */}
        {sentSuccess ? (
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center justify-center gap-2 animate-fadeIn font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {lang === 'bn' ? 'রিপ্লাই সফলভাবে পাঠানো হয়েছে!' : 'Reply sent successfully!'}
            </span>
          </div>
        ) : (
          <div>
            {/* Quick Action Buttons (LIKE / REPLY style from screenshot) */}
            {!showReplyInput ? (
              <div className="flex items-center gap-6 pt-1">
                <button
                  type="button"
                  onClick={handleLikeQuickReply}
                  disabled={sending}
                  className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'পছন্দ (LIKE)' : 'LIKE'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReplyInput(true)}
                  className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'উত্তর দিন (REPLY)' : 'REPLY'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenChat(sender.uid)}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer ml-auto flex items-center gap-1"
                >
                  <span>{lang === 'bn' ? 'অ্যাপে খুলুন' : 'Open'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ) : (
              /* Expanded Direct Reply Input Box */
              <div className="space-y-2 pt-1 animate-fadeIn">
                {/* Chip Suggestions */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
                      className="px-2.5 py-1 bg-white/10 hover:bg-orange-500/30 border border-white/10 hover:border-orange-500/50 text-[11px] font-medium text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer shrink-0"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form onSubmit={(e) => handleSendQuickReply(e)} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={lang === 'bn' ? 'উত্তর লিখুন...' : 'Type a reply...'}
                      className="w-full bg-black/40 border border-white/15 rounded-2xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 font-sans"
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
                        <span>{lang === 'bn' ? 'পাঠান' : 'Send'}</span>
                        <Send className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
