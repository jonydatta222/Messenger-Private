import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Video, 
  ShieldCheck, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  CheckCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Camera, 
  Info, 
  Smile, 
  Play, 
  Pause, 
  Volume2, 
  X,
  FileText,
  Trash2,
  AlertTriangle,
  Edit2,
  UserX,
  MessageCircle,
  Check,
  ArrowLeft,
  Plus,
  ThumbsUp,
  User,
  Users,
  Ban,
  CornerUpLeft
} from 'lucide-react';
import { UserProfile, Message, Group } from '../types';
import { 
  sendTextMessage, 
  sendImageMessage, 
  sendVoiceMessage, 
  subscribeToMessages, 
  markMessagesAsRead,
  deleteMessage,
  deleteForMe,
  deleteForEveryone,
  editTextMessage,
  deleteConversation,
  deleteUser,
  subscribeToGroupMessages,
  sendGroupTextMessage,
  sendGroupImageMessage,
  sendGroupVoiceMessage,
  deleteGroup
} from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';
import { VoiceRecorder } from './VoiceRecorder';
import { CameraModal } from './CameraModal';

interface SwipeableMessageRowProps {
  item: Message;
  isMe: boolean;
  sender?: UserProfile;
  partner?: UserProfile | null;
  group?: Group | null;
  inspectCiphertext: boolean;
  lang: 'bn' | 'en';
  currentUser: UserProfile;
  formatTime: (ts: number) => string;
  startLongPress: (item: Message) => void;
  cancelLongPress: () => void;
  onInitiateReply: (item: Message) => void;
  setSelectedImagePreview: (url: string) => void;
  setSelectedMessageForAction: (item: Message) => void;
  setIsEditingMessage: (editing: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
  highlightedMessageId: string | null;
  onScrollToMessage: (id: string) => void;
}

const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  item,
  isMe,
  sender,
  partner,
  group,
  inspectCiphertext,
  lang,
  currentUser,
  formatTime,
  startLongPress,
  cancelLongPress,
  onInitiateReply,
  setSelectedImagePreview,
  setSelectedMessageForAction,
  setIsEditingMessage,
  setShowDeleteModal,
  highlightedMessageId,
  onScrollToMessage,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Touch Handlers for swipe right gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    startLongPress(item);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    // Swiping right with horizontal movement
    if (deltaX > 2 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
      cancelLongPress();
      setIsSwiping(true);
      const offset = Math.min(deltaX * 0.85, 65);
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    if (isDraggingRef.current) {
      if (swipeOffset >= 22) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(30); } catch {}
        }
        onInitiateReply(item);
      }
      isDraggingRef.current = false;
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  // Mouse drag handlers for desktop mouse testing
  const mouseDownXRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownXRef.current = e.clientX;
    isMouseDownRef.current = true;
    startLongPress(item);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const deltaX = e.clientX - mouseDownXRef.current;
    if (deltaX > 2) {
      cancelLongPress();
      setIsSwiping(true);
      const offset = Math.min(deltaX * 0.85, 65);
      setSwipeOffset(offset);
    }
  };

  const handleMouseUp = () => {
    cancelLongPress();
    if (isMouseDownRef.current) {
      if (swipeOffset >= 22) {
        onInitiateReply(item);
      }
      isMouseDownRef.current = false;
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  if (item.isDeletedForEveryone) {
    return (
      <div
        id={`message-${item.id}`}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 select-none`}
      >
        <div
          onTouchStart={() => startLongPress(item)}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onMouseDown={() => startLongPress(item)}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedMessageForAction(item);
            setIsEditingMessage(false);
            setShowDeleteModal(true);
          }}
          className={`max-w-[78%] sm:max-w-[70%] rounded-[18px] px-3.5 py-2 shadow-2xs relative border flex items-center gap-2 italic text-xs cursor-pointer select-none ${
            isMe
              ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200/90 dark:border-orange-900/50 text-slate-700 dark:text-slate-300 rounded-br-[4px]'
              : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 text-slate-600 dark:text-slate-300 rounded-bl-[4px]'
          }`}
        >
          <Ban className={`w-3.5 h-3.5 shrink-0 ${isMe ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="font-medium">
            {isMe
              ? (lang === 'bn' ? 'আপনি এই মেসেজটি সবার জন্য রিমুভ করেছেন' : 'You removed this message')
              : (lang === 'bn' ? 'এই মেসেজটি রিমুভ করা হয়েছে' : 'This message was removed')}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 not-italic ml-1 shrink-0 font-sans">
            {formatTime(item.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  let displayText = '';
  if (item.text) {
    if (inspectCiphertext || !partner) {
      displayText = item.text;
    } else {
      const decrypted = decryptMessage(
        item.text,
        partner.publicKey,
        currentUser.secretKey
      );
      displayText = decrypted || (lang === 'bn' ? '⚠️ ডিক্রিপশন ত্রুটি' : '⚠️ Decryption Error');
    }
  }

  const isHighlighted = highlightedMessageId === item.id;

  return (
    <div
      id={`message-${item.id}`}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative my-1 transition-all duration-300 rounded-2xl p-0.5 ${
        isHighlighted ? 'bg-blue-500/30 ring-2 ring-blue-400' : ''
      }`}
    >
      {!isMe && group && (
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <img
            src={sender?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={sender?.displayName || 'Member'}
            className="w-4 h-4 rounded-full object-cover"
          />
          <span className="text-[10px] font-semibold text-slate-400">
            {sender?.displayName || 'Member'}
          </span>
        </div>
      )}

      {/* Swipe wrapper container */}
      <div className="relative w-full flex items-center select-none overflow-visible">
        {/* Swipe Reveal Reply Icon (behind message) */}
        <div
          className={`absolute left-0 flex items-center justify-center transition-all duration-100 z-0 ${
            swipeOffset > 8 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          style={{
            transform: `scale(${Math.min(0.6 + swipeOffset / 50, 1.15)})`,
          }}
        >
          <div
            className={`p-2 rounded-full transition-colors ${
              swipeOffset >= 22
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                : 'bg-slate-200 text-orange-500'
            }`}
          >
            <CornerUpLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Swipeable Message Bubble */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedMessageForAction(item);
            setIsEditingMessage(false);
            setShowDeleteModal(true);
          }}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          }}
          className={`max-w-[80%] sm:max-w-[72%] rounded-[22px] px-3.5 py-2.5 shadow-xs relative cursor-pointer select-none active:scale-[0.99] z-10 ${
            isMe
              ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white rounded-br-[6px] shadow-md shadow-orange-500/20 ml-auto'
              : 'bg-[#e5e7eb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-[6px] border border-slate-300/60 dark:border-slate-700 shadow-2xs mr-auto'
          }`}
        >
          {/* Quoted Reply inside message bubble */}
          {item.replyTo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (item.replyTo?.id) {
                  onScrollToMessage(item.replyTo.id);
                }
              }}
              className={`mb-2 p-2 rounded-xl text-xs border-l-4 cursor-pointer transition-opacity hover:opacity-90 ${
                isMe
                  ? 'bg-black/20 text-amber-100 border-amber-300'
                  : 'bg-slate-300/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 border-orange-500'
              }`}
            >
              <div className={`flex items-center gap-1 font-bold text-[11px] ${isMe ? 'text-amber-200' : 'text-orange-600 dark:text-orange-400'}`}>
                <CornerUpLeft className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.replyTo.senderName || (lang === 'bn' ? 'রিপ্লাই' : 'Reply')}</span>
              </div>
              <p className="text-[10px] line-clamp-2 mt-0.5 opacity-90 italic">
                {item.replyTo.text || (lang === 'bn' ? 'মেসেজ' : 'Message')}
              </p>
            </div>
          )}

          {/* Image Payload */}
          {item.imageUrl && (
            <div className="mb-1 rounded-[16px] overflow-hidden cursor-pointer">
              <img
                src={item.imageUrl}
                alt="Sent media"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImagePreview(item.imageUrl!);
                }}
                className="max-h-72 w-full object-cover rounded-[16px] hover:opacity-90 transition-opacity"
              />
            </div>
          )}

          {/* Audio Voice Note Payload */}
          {item.audioUrl && (
            <div className={`flex items-center gap-2 p-2 rounded-xl my-1 border ${
              isMe ? 'bg-black/20 border-white/20' : 'bg-slate-300/70 dark:bg-slate-700/70 border-slate-400/40 dark:border-slate-600/40'
            }`}>
              <Volume2 className={`w-4 h-4 shrink-0 ${isMe ? 'text-amber-200' : 'text-orange-600 dark:text-orange-400'}`} />
              <audio controls src={item.audioUrl} className="h-8 w-48 sm:w-56" />
            </div>
          )}

          {/* Text Payload */}
          {item.text && (
            <p
              className={`text-[13px] leading-relaxed break-words font-sans ${
                inspectCiphertext ? 'font-mono text-[10px] text-amber-200 bg-zinc-900 p-2 rounded-xl border border-amber-500/30' : ''
              }`}
            >
              {displayText}
              {item.isEdited && !inspectCiphertext && (
                <span className={`text-[10px] italic ml-1.5 font-normal ${isMe ? 'text-orange-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  ({lang === 'bn' ? 'সম্পাদিত' : 'edited'})
                </span>
              )}
            </p>
          )}

          {/* Timestamp */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
              isMe ? 'text-orange-100/90' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span>{formatTime(item.timestamp)}</span>
            {isMe && (
              <CheckCheck
                className={`w-3 h-3 ${item.read ? 'text-white' : 'text-orange-200/70'}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Read Avatar Indicator for sent message */}
      {isMe && item.read && partner && (
        <div className="flex justify-end mt-0.5">
          <img
            src={partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt="Read"
            className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-black"
          />
        </div>
      )}
    </div>
  );
};

interface ChatScreenProps {
  currentUser: UserProfile;
  partner?: UserProfile | null;
  group?: Group | null;
  allUsers?: UserProfile[];
  onStartCall: (type: 'audio' | 'video') => void;
  onBack?: () => void;
  onOpenFloatingHead?: () => void;
  lang: 'bn' | 'en';
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  partner,
  group,
  allUsers = [],
  onStartCall,
  onBack,
  onOpenFloatingHead,
  lang,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [inspectCiphertext, setInspectCiphertext] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reply & Highlight state
  const [replyingToMessage, setReplyingToMessage] = useState<Message['replyTo'] | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Delete, Edit & Long Press states
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [showPartnerProfileModal, setShowPartnerProfileModal] = useState(false);
  const [showChatInfoModal, setShowChatInfoModal] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editTextValue, setEditTextValue] = useState('');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInitiateReply = (item: Message) => {
    let senderName = '';
    if (item.senderId === currentUser.uid) {
      senderName = lang === 'bn' ? 'আপনি' : 'You';
    } else if (partner && item.senderId === partner.uid) {
      senderName = partner.displayName;
    } else {
      const s = allUsers.find((u) => u.uid === item.senderId);
      senderName = s ? s.displayName : (lang === 'bn' ? 'সদস্য' : 'Member');
    }

    let textPreview = '';
    if (item.text) {
      const decrypted = partner
        ? decryptMessage(item.text, partner.publicKey, currentUser.secretKey)
        : item.text;
      textPreview = decrypted || item.text;
    } else if (item.imageUrl) {
      textPreview = lang === 'bn' ? '📷 ছবি' : '📷 Photo';
    } else if (item.audioUrl) {
      textPreview = lang === 'bn' ? '🎙️ ভয়েস মেসেজ' : '🎙️ Voice message';
    }

    setReplyingToMessage({
      id: item.id,
      senderName,
      text: textPreview,
      imageUrl: item.imageUrl,
      audioUrl: item.audioUrl,
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleScrollToMessage = (targetId: string) => {
    const el = document.getElementById(`message-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  const startLongPress = (item: Message) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMessageForAction(item);
      setIsEditingMessage(false);
      setShowDeleteModal(true);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteForMe = () => {
    if (selectedMessageForAction) {
      deleteForMe(selectedMessageForAction.id, currentUser.uid);
      setSelectedMessageForAction(null);
      setShowDeleteModal(false);
      setIsEditingMessage(false);
    }
  };

  const handleDeleteForEveryone = () => {
    if (selectedMessageForAction) {
      deleteForEveryone(selectedMessageForAction.id);
      setSelectedMessageForAction(null);
      setShowDeleteModal(false);
      setIsEditingMessage(false);
    }
  };

  const handleStartEdit = () => {
    if (!selectedMessageForAction) return;
    if (selectedMessageForAction.text) {
      if (partner) {
        const decrypted = decryptMessage(
          selectedMessageForAction.text,
          selectedMessageForAction.senderId === currentUser.uid ? partner.publicKey : partner.publicKey,
          currentUser.secretKey
        );
        setEditTextValue(decrypted || selectedMessageForAction.text);
      } else {
        setEditTextValue(selectedMessageForAction.text);
      }
    } else {
      setEditTextValue('');
    }
    setIsEditingMessage(true);
  };

  const handleSaveEdit = () => {
    if (selectedMessageForAction && editTextValue.trim()) {
      if (partner) {
        editTextMessage(
          selectedMessageForAction.id,
          editTextValue.trim(),
          partner.publicKey,
          currentUser.secretKey
        );
      }
      setIsEditingMessage(false);
      setSelectedMessageForAction(null);
      setShowDeleteModal(false);
    }
  };

  const handleClearAllMessages = () => {
    if (group) {
      deleteGroup(group.id);
      setShowClearChatModal(false);
      if (onBack) onBack();
    } else if (partner) {
      deleteConversation(currentUser.uid, partner.uid);
      deleteUser(partner.uid);
      setShowClearChatModal(false);
      if (onBack) onBack();
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to realtime messages for this chat partner or group
  useEffect(() => {
    if (group) {
      const unsubscribe = subscribeToGroupMessages(group.id, currentUser.uid, (fetchedMessages) => {
        setMessages(fetchedMessages);
      });
      return () => unsubscribe();
    } else if (partner) {
      const unsubscribe = subscribeToMessages(currentUser.uid, partner.uid, (fetchedMessages) => {
        setMessages(fetchedMessages);
        markMessagesAsRead(currentUser.uid, partner.uid);
      });
      return () => unsubscribe();
    }
  }, [currentUser.uid, partner?.uid, group?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    const replyData = replyingToMessage || undefined;
    setInputText('');
    setShowEmojiPicker(false);
    setReplyingToMessage(null);

    if (group) {
      await sendGroupTextMessage(currentUser.uid, group.id, textToSend, replyData);
    } else if (partner) {
      await sendTextMessage(
        currentUser.uid,
        partner.uid,
        textToSend,
        partner.publicKey,
        currentUser.secretKey,
        replyData
      );
    }
  };

  const handleSendVoice = async (audioUrl: string, duration: number) => {
    setShowVoiceRecorder(false);
    const replyData = replyingToMessage || undefined;
    setReplyingToMessage(null);

    if (group) {
      await sendGroupVoiceMessage(currentUser.uid, group.id, audioUrl, duration, replyData);
    } else if (partner) {
      await sendVoiceMessage(currentUser.uid, partner.uid, audioUrl, duration, replyData);
    }
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
    setShowCameraModal(false);
    const replyData = replyingToMessage || undefined;
    setReplyingToMessage(null);

    if (group) {
      await sendGroupImageMessage(currentUser.uid, group.id, imageDataUrl, replyData);
    } else if (partner) {
      await sendImageMessage(currentUser.uid, partner.uid, imageDataUrl, replyData);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const replyData = replyingToMessage || undefined;
      setReplyingToMessage(null);

      reader.onloadend = () => {
        const result = reader.result as string;
        if (group) {
          sendGroupImageMessage(currentUser.uid, group.id, result, replyData);
        } else if (partner) {
          sendImageMessage(currentUser.uid, partner.uid, result, replyData);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleSendThumbsUp = async () => {
    const replyData = replyingToMessage || undefined;
    setReplyingToMessage(null);

    if (group) {
      await sendGroupTextMessage(currentUser.uid, group.id, '👍', replyData);
    } else if (partner) {
      await sendTextMessage(
        currentUser.uid,
        partner.uid,
        '👍',
        partner.publicKey,
        currentUser.secretKey,
        replyData
      );
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden select-none transition-colors">
      {/* Active Partner Top App Bar */}
      <div className="px-2 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between shadow-2xs z-20">
        <div className="flex items-center gap-1">
          {/* Back Arrow for Fullscreen Navigation */}
          <button
            onClick={onBack}
            className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* User Profile / Group Avatar */}
          {partner ? (
            <div
              className="relative cursor-pointer flex items-center gap-2.5 ml-0.5"
              onClick={() => setShowPartnerProfileModal(true)}
            >
              <div className="relative">
                <img
                  src={partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={partner.displayName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-200 dark:ring-slate-700"
                />
                {partner.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>

              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                  {partner.displayName}
                </h2>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block -mt-0.5">
                  {partner.status === 'online'
                    ? (lang === 'bn' ? 'সক্রিয় আছেন' : 'Active now')
                    : (lang === 'bn' ? 'অফলাইন' : 'Active 3h ago')}
                </span>
              </div>
            </div>
          ) : group ? (
            <div
              className="relative cursor-pointer flex items-center gap-2.5 ml-0.5"
              onClick={() => setShowChatInfoModal(true)}
            >
              <div className="relative">
                <img
                  src={group.photoURL || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
                  alt={group.name}
                  className="w-9 h-9 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
                />
                <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[8px] font-bold px-1 rounded-full border border-white dark:border-slate-900">
                  {group.members.length}
                </span>
              </div>

              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-tight flex items-center gap-1.5">
                  <span>{group.name}</span>
                  <Users className="w-3.5 h-3.5 text-orange-500" />
                </h2>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium block -mt-0.5">
                  {group.members.length} {lang === 'bn' ? 'জন সদস্য' : 'members'}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-1 text-orange-500">
          {partner && (
            <>
              <button
                onClick={() => onStartCall('audio')}
                className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'অডিও কল' : 'Audio Call'}
              >
                <Phone className="w-5 h-5 text-orange-500 fill-orange-500/10" />
              </button>

              <button
                onClick={() => onStartCall('video')}
                className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ভিডিও কল' : 'Video Call'}
              >
                <Video className="w-5 h-5 text-orange-500 fill-orange-500/10" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowChatInfoModal(true)}
            className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'তথ্য' : 'Info'}
          >
            <Info className="w-5 h-5 text-orange-500" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area with Halloween Cobweb Background Pattern */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative transition-colors">
        {/* Cobweb SVG Background Watermark */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.12] dark:opacity-[0.04] pointer-events-none text-slate-400 dark:text-slate-600" viewBox="0 0 500 800" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M250 0 L250 800 M0 400 L500 400 M0 0 L500 800 M500 0 L0 800 M125 0 Q250 125 375 0 M125 800 Q250 675 375 800 M0 200 Q250 300 500 200 M0 600 Q250 500 500 600 M100 100 Q250 200 400 100 M100 700 Q250 600 400 700" />
        </svg>

        {/* Top Profile Hero Section */}
        {partner ? (
          <div className="flex flex-col items-center justify-center py-6 text-center my-2 select-none border-b border-slate-200/80 dark:border-slate-800 pb-6 relative z-10">
            <img
              src={partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={partner.displayName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-orange-100 dark:ring-slate-800 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowPartnerProfileModal(true)}
            />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3.5 tracking-tight">
              {partner.displayName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tracking-tight">
              @{partner.displayName.toLowerCase().replace(/\s+/g, '')}.{partner.phone ? partner.phone.slice(-6) : '665897'}
            </p>
            <button
              type="button"
              onClick={() => setShowPartnerProfileModal(true)}
              className="mt-4 px-5 py-2 bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full border border-orange-200 dark:border-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              {lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View profile'}
            </button>
          </div>
        ) : group ? (
          <div className="flex flex-col items-center justify-center py-6 text-center my-2 select-none border-b border-slate-200/80 dark:border-slate-800 pb-6 relative z-10">
            <img
              src={group.photoURL || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
              alt={group.name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-orange-100 dark:ring-slate-800 shadow-md"
            />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3.5 tracking-tight flex items-center gap-2">
              <span>{group.name}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              {group.description || (lang === 'bn' ? 'গ্রুপ চ্যাটরুম' : 'Group Chatroom')}
            </p>
            <div className="mt-3 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 px-3 py-1 rounded-full font-medium">
              {group.members.length} {lang === 'bn' ? 'জন সদস্য সংযুক্ত' : 'members in group'}
            </div>
          </div>
        ) : null}

        {/* System Theme Announcement */}
        <div className="text-center my-2 relative z-10">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700 shadow-2xs">
            {lang === 'bn' ? 'আপনি চ্যাটের থিম Halloween এ পরিবর্তন করেছেন।' : 'You changed the chat theme to Halloween.'}
          </span>
        </div>

        {/* Message Stream */}
        <div className="relative z-10 space-y-3">
          {messages.map((item, idx) => {
            const isMe = item.senderId === currentUser.uid;
            const sender = allUsers.find((u) => u.uid === item.senderId);

            // Optional Date Divider Header
            const showDateHeader = idx === 0 || (item.timestamp - messages[idx - 1].timestamp > 1000 * 60 * 60 * 12);
            const dateStr = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <React.Fragment key={item.id}>
                {showDateHeader && (
                  <div className="text-center my-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      {dateStr}, {timeStr}
                    </span>
                  </div>
                )}
                <SwipeableMessageRow
                  item={item}
                  isMe={isMe}
                  sender={sender}
                  partner={partner}
                  group={group}
                  inspectCiphertext={inspectCiphertext}
                  lang={lang}
                  currentUser={currentUser}
                  formatTime={formatTime}
                  startLongPress={startLongPress}
                  cancelLongPress={cancelLongPress}
                  onInitiateReply={handleInitiateReply}
                  setSelectedImagePreview={setSelectedImagePreview}
                  setSelectedMessageForAction={setSelectedMessageForAction}
                  setIsEditingMessage={setIsEditingMessage}
                  setShowDeleteModal={setShowDeleteModal}
                  highlightedMessageId={highlightedMessageId}
                  onScrollToMessage={handleScrollToMessage}
                />
              </React.Fragment>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner Bar */}
      {replyingToMessage && (
        <div className="bg-white dark:bg-slate-900 border-t border-orange-200 dark:border-orange-900/50 px-3 py-2 flex items-center justify-between text-xs backdrop-blur-md z-20 animate-fadeIn">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-lg shrink-0">
              <CornerUpLeft className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-orange-600 dark:text-orange-400 text-[11px] block truncate">
                {replyingToMessage.senderName} - {lang === 'bn' ? 'রিপ্লাই দেওয়া হচ্ছে' : 'Replying to'}
              </span>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate font-normal">
                {replyingToMessage.text || (lang === 'bn' ? 'মিডিয়া মেসেজ' : 'Media message')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 flex gap-2 overflow-x-auto text-lg no-scrollbar shadow-inner z-20">
          {['👍', '❤️', '🎃', '🔥', '🎃', '🎃', '🎉', '🎃', '💯', '👻', '🎃'].map((emoji, eIdx) => (
            <button
              key={eIdx}
              onClick={() => addEmoji(emoji)}
              className="hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bottom Action Bar */}
      <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 shadow-md z-20">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setShowVoiceRecorder(false)}
            lang={lang}
          />
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-1.5">
            {/* Attachment buttons */}
            <div className="flex items-center gap-0.5 text-orange-500">
              <button
                type="button"
                onClick={() => setInspectCiphertext(!inspectCiphertext)}
                className="p-1.5 text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors cursor-pointer shadow-xs"
                title={inspectCiphertext ? 'Show Decrypted' : 'Inspect Ciphertext'}
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCameraModal(true)}
                className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ছবি তুলুন' : 'Take Photo'}
              >
                <Camera className="w-5 h-5 text-orange-500" />
              </button>

              <label className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                <ImageIcon className="w-5 h-5 text-orange-500" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ভয়েস রেকর্ড' : 'Voice Record'}
              >
                <Mic className="w-5 h-5 text-orange-500" />
              </button>
            </div>

            {/* Input field capsule */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 focus-within:border-orange-500 rounded-full px-4 py-1.5 flex items-center justify-between gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lang === 'bn' ? 'মেসেজ...' : 'Message'}
                className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-orange-500 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Right Action: Send OR Thumbs Up */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="p-1.5 text-orange-500 hover:scale-110 transition-transform cursor-pointer"
                title={lang === 'bn' ? 'পাঠান' : 'Send'}
              >
                <Send className="w-5 h-5 text-orange-500 fill-orange-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendThumbsUp}
                className="p-1.5 text-orange-500 hover:scale-110 transition-transform cursor-pointer"
                title={lang === 'bn' ? 'লাইক দিন' : 'Send Thumbs Up'}
              >
                <ThumbsUp className="w-6 h-6 text-orange-500 fill-orange-500" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Modals */}
      {showCameraModal && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraModal(false)}
          lang={lang}
        />
      )}

      {/* Fullscreen Image Preview Lightbox */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh]">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImagePreview}
              alt="Full view"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Message Actions / Edit Modal */}
      {showDeleteModal && selectedMessageForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn text-slate-900 dark:text-slate-100">
            {isEditingMessage ? (
              /* Edit Message Form */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                  <Edit2 className="w-5 h-5" />
                  <span>{lang === 'bn' ? 'মেসেজ এডিট করুন' : 'Edit Message'}</span>
                </div>
                <textarea
                  value={editTextValue}
                  onChange={(e) => setEditTextValue(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন মেসেজ লিখুন...' : 'Type updated text...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 min-h-[90px]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsEditingMessage(false);
                      setShowDeleteModal(false);
                      setSelectedMessageForAction(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTextValue.trim()}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    {lang === 'bn' ? 'সেভ করুন' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* Options Sheet: Edit, Delete for Me, Delete for Everyone */
              <div className="space-y-3">
                <div className="text-center pb-1 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lang === 'bn' ? 'মেসেজ অপশনসমূহ' : 'Message Options'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'bn' ? 'আপনার প্রয়োজনীয় অপশনটি নির্বাচন করুন' : 'Select an option below'}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Reply Option */}
                  {!selectedMessageForAction.isDeletedForEveryone && (
                    <button
                      onClick={() => {
                        handleInitiateReply(selectedMessageForAction);
                        setShowDeleteModal(false);
                        setSelectedMessageForAction(null);
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 group cursor-pointer"
                    >
                      <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <CornerUpLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{lang === 'bn' ? 'উত্তর দিন (Reply)' : 'Reply to Message'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'এই মেসেজের উত্তর লিখে সরাসরি বার্তা পাঠান' : 'Quote this message in your reply'}</div>
                      </div>
                    </button>
                  )}

                  {/* Edit Option (if message has text and not already removed) */}
                  {selectedMessageForAction.text && !selectedMessageForAction.isDeletedForEveryone && (
                    <button
                      onClick={handleStartEdit}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 group cursor-pointer"
                    >
                      <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{lang === 'bn' ? 'এডিট করুন (Edit)' : 'Edit Message'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'মেসেজের ভুল লেখা সংশোধন করুন' : 'Modify mistyped message text'}</div>
                      </div>
                    </button>
                  )}

                  {/* Delete for me */}
                  <button
                    onClick={handleDeleteForMe}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 group cursor-pointer"
                  >
                    <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{lang === 'bn' ? 'আমার জন্য ডিলেট (Delete for me)' : 'Delete for Me'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'শুধু আপনার স্ক্রিন থেকে মুছে ফেলা হবে' : 'Remove only from your view'}</div>
                    </div>
                  </button>

                  {/* Delete for everyone (if not already removed for everyone) */}
                  {!selectedMessageForAction.isDeletedForEveryone && (
                    <button
                      onClick={handleDeleteForEveryone}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 group cursor-pointer"
                    >
                      <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{lang === 'bn' ? 'সবার জন্য রিমুভ (Remove for Everyone)' : 'Remove for Everyone'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'উভয় পাশের চ্যাটবক্স ও সার্ভার থেকে সম্পূর্ণ মেসেজ রিমুভ হয়ে যাবে' : 'Completely remove message from both chatboxes and server storage'}</div>
                      </div>
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedMessageForAction(null);
                      setIsEditingMessage(false);
                    }}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Chat Modal */}
      {showClearChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn text-center text-slate-900 dark:text-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'bn' ? 'সমস্ত মেসেজ মুছে ফেলতে চান?' : 'Clear All Messages?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'bn'
                  ? `${partner ? partner.displayName : group ? group.name : ''}-এর সাথে বিনিময় করা সকল মেসেজ মুছে ফেলা হবে।`
                  : `All conversation history with ${partner ? partner.displayName : group ? group.name : ''} will be deleted.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearChatModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleClearAllMessages}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                {lang === 'bn' ? 'সব ডিলেট করুন' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Profile Modal */}
      {partner && showPartnerProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-fadeIn relative text-center text-slate-900 dark:text-slate-100">
            <button
              onClick={() => setShowPartnerProfileModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative inline-block mx-auto mt-2">
              <img
                src={partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={partner.displayName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-orange-200 dark:ring-slate-700 mx-auto shadow-md"
              />
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  partner.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center justify-center gap-1.5">
                {partner.displayName}
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {partner.email}
              </p>
              {partner.phone && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {partner.phone}
                </p>
              )}
            </div>

            {/* E2EE Info Box */}
            <div className="bg-orange-50/70 dark:bg-slate-800/70 border border-orange-200/80 dark:border-slate-700 rounded-2xl p-3 text-left space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'bn' ? 'এন্ড-টু-এন্ড এনক্রিপ্টেড' : 'End-to-End Encrypted'}</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono break-all leading-tight">
                {lang === 'bn' ? 'পাবলিক কী:' : 'Public Key:'} {partner.publicKey ? partner.publicKey.slice(0, 28) : ''}...
              </p>
            </div>

            {/* Call Shortcuts */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setShowPartnerProfileModal(false);
                  onStartCall('audio');
                }}
                className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20"
              >
                <Phone className="w-4 h-4" />
                <span>{lang === 'bn' ? 'অডিও কল' : 'Audio Call'}</span>
              </button>
              <button
                onClick={() => {
                  setShowPartnerProfileModal(false);
                  onStartCall('video');
                }}
                className="py-2.5 bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Video className="w-4 h-4 text-orange-500" />
                <span>{lang === 'bn' ? 'ভিডিও কল' : 'Video Call'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowPartnerProfileModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Chat Info / Options Modal */}
      {showChatInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn relative text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    partner
                      ? partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      : group?.photoURL || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={partner ? partner.displayName : group?.name || 'Chat'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-200 dark:ring-slate-700"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {partner ? partner.displayName : group?.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {partner
                      ? partner.status === 'online'
                        ? (lang === 'bn' ? 'সক্রিয় আছেন' : 'Active now')
                        : (lang === 'bn' ? 'অফলাইন' : 'Offline')
                      : `${group?.members?.length || 0} ${lang === 'bn' ? 'জন সদস্য' : 'members'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatInfoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Option 1: Open in Floating Chat Head */}
              <button
                onClick={() => {
                  setShowChatInfoModal(false);
                  if (onOpenFloatingHead) {
                    onOpenFloatingHead();
                  }
                }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-900 dark:text-slate-100 group cursor-pointer"
              >
                <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{lang === 'bn' ? 'চ্যাট হেডে ওপেন করুন' : 'Open in Chat Head'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'ফ্লোটিং বাবল হিসেবে বাবল মোড চালু করুন' : 'Enable floating chat bubble overlay'}</div>
                </div>
              </button>

              {/* Option 2: View Profile (only if partner) */}
              {partner && (
                <button
                  onClick={() => {
                    setShowChatInfoModal(false);
                    setShowPartnerProfileModal(true);
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-900 dark:text-slate-100 group cursor-pointer"
                >
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'ব্যবহারকারীর তথ্য ও পরিচিতি' : 'See contact & encryption details'}</div>
                  </div>
                </button>
              )}

              {/* Option 3: Audio Call (only if partner) */}
              {partner && (
                <button
                  onClick={() => {
                    setShowChatInfoModal(false);
                    onStartCall('audio');
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-900 dark:text-slate-100 group cursor-pointer"
                >
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{lang === 'bn' ? 'অডিও কল করুন' : 'Audio Call'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'সরাসরি অডিও কল শুরু করুন' : 'Start E2EE audio call'}</div>
                  </div>
                </button>
              )}

              {/* Option 4: Video Call (only if partner) */}
              {partner && (
                <button
                  onClick={() => {
                    setShowChatInfoModal(false);
                    onStartCall('video');
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-900 dark:text-slate-100 group cursor-pointer"
                >
                  <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{lang === 'bn' ? 'ভিডিও কল করুন' : 'Video Call'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'সরাসরি ভিডিও কল শুরু করুন' : 'Start HD video call'}</div>
                  </div>
                </button>
              )}

              {/* Option 5: Inspect Ciphertext Toggle */}
              <button
                onClick={() => {
                  setInspectCiphertext(!inspectCiphertext);
                  setShowChatInfoModal(false);
                }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-orange-200 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-900 dark:text-slate-100 group cursor-pointer"
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  {inspectCiphertext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {inspectCiphertext
                      ? (lang === 'bn' ? 'ডিক্রিপ্টেড ভিউতে ফিরুন' : 'Show Decrypted Text')
                      : (lang === 'bn' ? 'এনক্রিপ্টেড সাইফারটেক্সট দেখুন' : 'Inspect Ciphertext')}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {lang === 'bn' ? 'র এনক্রিপ্টেড ডাটা ইনস্পেক্ট করুন' : 'View raw E2EE base64 encrypted payload'}
                  </div>
                </div>
              </button>

              {/* Option 6: Delete / Clear Conversation */}
              <button
                onClick={() => {
                  setShowChatInfoModal(false);
                  setShowClearChatModal(true);
                }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-red-200 rounded-2xl flex items-center gap-3 text-left transition-all text-red-600 dark:text-red-400 group cursor-pointer"
              >
                <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">{lang === 'bn' ? 'সমস্ত চ্যাট ডিলেট করুন' : 'Clear Conversation'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'এই চ্যাটের সমস্ত মেসেজ মুছে ফেলুন' : 'Permanently remove message history'}</div>
                </div>
              </button>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowChatInfoModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
