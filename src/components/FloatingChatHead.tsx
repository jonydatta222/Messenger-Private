import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Ban, MessageSquare, ChevronDown, Users, Trash2, CornerUpLeft, HelpCircle, ExternalLink, Layers, Settings, Bell, CheckCircle2 } from 'lucide-react';
import { UserProfile, Message } from '../types';
import { getUnreadCount, sendTextMessage, subscribeToMessages, markMessagesAsRead, getConversationsForUser, isUserOnline } from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';
import { playNotificationChime, triggerVibration } from '../services/notificationService';


interface SwipeableChatHeadMessageProps {
  msg: Message;
  isMe: boolean;
  activePartner: UserProfile;
  currentUser: UserProfile;
  lang: 'bn' | 'en';
  onInitiateReply: (msg: Message) => void;
}

const SwipeableChatHeadMessage: React.FC<SwipeableChatHeadMessageProps> = ({
  msg,
  isMe,
  activePartner,
  currentUser,
  lang,
  onInitiateReply,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (deltaX > 2 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
      setIsSwiping(true);
      const offset = Math.min(deltaX * 0.85, 55);
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      if (swipeOffset >= 22) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(30); } catch {}
        }
        onInitiateReply(msg);
      }
      isDraggingRef.current = false;
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const mouseDownXRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownXRef.current = e.clientX;
    isMouseDownRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const deltaX = e.clientX - mouseDownXRef.current;
    if (deltaX > 2) {
      setIsSwiping(true);
      const offset = Math.min(deltaX * 0.85, 55);
      setSwipeOffset(offset);
    }
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      if (swipeOffset >= 22) {
        onInitiateReply(msg);
      }
      isMouseDownRef.current = false;
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  if (msg.isDeletedForEveryone) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[80%] rounded-2xl px-3 py-1.5 text-xs bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/90 dark:border-orange-900/50 text-slate-700 dark:text-slate-300 italic flex items-center gap-1.5 shadow-2xs">
          <Ban className={`w-3.5 h-3.5 shrink-0 ${isMe ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="font-medium">
            {isMe
              ? lang === 'bn'
                ? 'মেসেজটি রিমুভ করেছেন'
                : 'You removed this message'
              : lang === 'bn'
              ? 'মেসেজটি রিমুভ করা হয়েছে'
              : 'This message was removed'}
          </span>
        </div>
      </div>
    );
  }

  let decryptedText = '';
  if (msg.text) {
    decryptedText = decryptMessage(msg.text, activePartner.publicKey, currentUser.secretKey);
  }

  return (
    <div className={`relative flex items-center select-none overflow-visible my-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* Swipe reveal reply icon */}
      <div
        className={`absolute left-0 flex items-center justify-center transition-all duration-100 z-0 ${
          swipeOffset > 6 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
        style={{
          transform: `scale(${Math.min(0.6 + swipeOffset / 40, 1.1)})`,
        }}
      >
        <div
          className={`p-1.5 rounded-full transition-colors ${
            swipeOffset >= 22
              ? 'bg-orange-500 text-white shadow-md'
              : 'bg-slate-200 dark:bg-slate-800 text-orange-500'
          }`}
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Bubble */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        }}
        className={`max-w-[82%] rounded-2xl p-2.5 text-xs leading-relaxed shadow-xs cursor-pointer select-none relative z-10 ${
          isMe
            ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white rounded-br-xs shadow-md shadow-orange-500/20'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-300 dark:border-slate-700'
        }`}
      >
        {msg.replyTo && (
          <div className={`mb-1.5 p-1.5 rounded-lg text-[10px] border-l-2 ${
            isMe ? 'bg-black/20 text-amber-100 border-amber-300' : 'bg-slate-300/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 border-orange-500'
          }`}>
            <div className={`font-bold flex items-center gap-1 ${isMe ? 'text-amber-200' : 'text-orange-600 dark:text-orange-400'}`}>
              <CornerUpLeft className="w-2.5 h-2.5" />
              <span>{msg.replyTo.senderName}</span>
            </div>
            <p className="line-clamp-1 italic">{msg.replyTo.text || 'Message'}</p>
          </div>
        )}

        {msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt="shared"
            className="rounded-xl max-h-36 object-cover mb-1"
          />
        )}
        {msg.audioUrl && (
          <audio src={msg.audioUrl} controls className="max-w-[200px] h-8 my-1" />
        )}
        {decryptedText && <p className="break-words">{decryptedText}</p>}
        <span
          className={`text-[9px] block text-right mt-0.5 ${
            isMe ? 'text-orange-100' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};

interface FloatingChatHeadProps {
  currentUser: UserProfile;
  partners: UserProfile[];
  selectedPartner: UserProfile | null;
  onSelectPartner: (partnerId: string) => void;
  onCloseFloatingHead: () => void;
  lang: 'bn' | 'en';
  isOutsideApp?: boolean;
}

export const FloatingChatHead: React.FC<FloatingChatHeadProps> = ({
  currentUser,
  partners,
  selectedPartner,
  onSelectPartner,
  onCloseFloatingHead,
  lang,
  isOutsideApp,
}) => {
  // Start CLOSED as bubble by default (don't auto-open chat window)
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [internalPartnerId, setInternalPartnerId] = useState<string | null>(selectedPartner?.uid || null);
  const [showSelectorDropdown, setShowSelectorDropdown] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message['replyTo'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headScrollContainerRef = useRef<HTMLDivElement>(null);
  const headUserScrolledUpRef = useRef<boolean>(false);
  const prevHeadPartnerIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleHeadScroll = () => {
    if (!headScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = headScrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    headUserScrolledUpRef.current = distanceFromBottom > 80;
  };

  // Dragging and positioning state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [isOverRemoveZoneState, setIsOverRemoveZoneState] = useState(false);

  const isDraggingRef = useRef(false);
  const isOverRemoveZoneRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; headX: number; headY: number }>({
    mouseX: 0,
    mouseY: 0,
    headX: 0,
    headY: 0,
  });

  const bubbleRef = useRef<HTMLDivElement>(null);
  const [showOverlayGuide, setShowOverlayGuide] = useState(false);

  const handlePopoutWindow = () => {
    const width = 380;
    const height = 540;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // Check if Picture in Picture API is available for document/video
    if ('documentPictureInPicture' in window) {
      try {
        (window as any).documentPictureInPicture.requestWindow({
          width: 360,
          height: 520,
        }).then((pipWin: Window) => {
          const style = pipWin.document.createElement('style');
          style.textContent = `
            body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #fff; }
            .pip-container { padding: 16px; text-align: center; }
            .pip-title { color: #f97316; font-weight: bold; margin-bottom: 8px; }
          `;
          pipWin.document.head.appendChild(style);
          pipWin.document.body.innerHTML = `
            <div class="pip-container">
              <div class="pip-title">Floating Chat Head Active</div>
              <p style="font-size:12px; color:#94a3b8;">Pop-out Chat is floating on top of all Android apps.</p>
            </div>
          `;
          return;
        }).catch(() => {
          openPopoutFallback(width, height, left, top);
        });
        return;
      } catch {
        // Fallback
      }
    }
    openPopoutFallback(width, height, left, top);
  };

  const openPopoutFallback = (width: number, height: number, left: number, top: number) => {
    window.open(
      window.location.href,
      'SecureMessengerChatHead',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,status=no`
    );
  };


  // Sync selected partner prop
  useEffect(() => {
    if (selectedPartner) {
      setInternalPartnerId(selectedPartner.uid);
    }
  }, [selectedPartner?.uid]);

  // Handle active partner selection
  const conversations = getConversationsForUser(currentUser.uid);
  let activePartnerCandidate =
    selectedPartner ||
    partners.find((p) => p.uid === internalPartnerId);

  if (!activePartnerCandidate && conversations.length > 0) {
    activePartnerCandidate = partners.find((p) => p.uid === conversations[0].uid) || null;
  }

  const activePartner = activePartnerCandidate || null;

  // Real-time message subscription
  useEffect(() => {
    if (!activePartner || !currentUser) return;

    markMessagesAsRead(currentUser.uid, activePartner.uid);
    const unsubscribe = subscribeToMessages(currentUser.uid, activePartner.uid, (updatedMsgs) => {
      setMessages(updatedMsgs);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, activePartner?.uid]);

  // Auto scroll to bottom (only if user hasn't scrolled up or user sent a message)
  useEffect(() => {
    if (activePartner?.uid !== prevHeadPartnerIdRef.current) {
      prevHeadPartnerIdRef.current = activePartner?.uid || null;
      headUserScrolledUpRef.current = false;
    }
  }, [activePartner?.uid]);

  useEffect(() => {
    if (isOpen && activePartner && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isMine = lastMsg && lastMsg.senderId === currentUser.uid;
      if (isMine || !headUserScrolledUpRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isOpen, activePartner, currentUser.uid]);

  // Pointer drag handlers (handles both mouse & touch smoothly without crash)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = bubbleRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (position ? position.x : window.innerWidth - 76);
    const currentY = rect ? rect.top : (position ? position.y : window.innerHeight - 76);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      headX: currentX,
      headY: currentY,
    };

    hasMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDraggingState(true);

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const maxX = Math.max(10, window.innerWidth - 65);
    const maxY = Math.max(10, window.innerHeight - 65);

    const newX = Math.min(Math.max(10, dragStartRef.current.headX + deltaX), maxX);
    const newY = Math.min(Math.max(10, dragStartRef.current.headY + deltaY), maxY);

    setPosition({ x: newX, y: newY });

    // Remove zone check (bottom center of viewport)
    const removeZoneX = window.innerWidth / 2;
    const removeZoneY = window.innerHeight - 70;
    const dist = Math.hypot(newX + 26 - removeZoneX, newY + 26 - removeZoneY);

    const over = dist < 90;
    if (isOverRemoveZoneRef.current !== over) {
      isOverRemoveZoneRef.current = over;
      setIsOverRemoveZoneState(over);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // release fallback
    }

    isDraggingRef.current = false;
    setIsDraggingState(false);

    if (isOverRemoveZoneRef.current) {
      isOverRemoveZoneRef.current = false;
      setIsOverRemoveZoneState(false);
      onCloseFloatingHead();
    } else if (!hasMovedRef.current) {
      // Clean tap/click toggle
      setIsOpen((prev) => !prev);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // release fallback
    }
    isDraggingRef.current = false;
    setIsDraggingState(false);
    isOverRemoveZoneRef.current = false;
    setIsOverRemoveZoneState(false);
  };

  // Global safety reset listener for unhandled touch/pointer ends
  useEffect(() => {
    const handleGlobalEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingState(false);
        if (isOverRemoveZoneRef.current) {
          isOverRemoveZoneRef.current = false;
          setIsOverRemoveZoneState(false);
          onCloseFloatingHead();
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);
    window.addEventListener('blur', handleGlobalEnd);

    return () => {
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
      window.removeEventListener('blur', handleGlobalEnd);
    };
  }, [onCloseFloatingHead]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      const maxX = Math.max(10, window.innerWidth - 65);
      const maxY = Math.max(10, window.innerHeight - 65);
      setPosition((prev) =>
        prev
          ? {
              x: Math.min(Math.max(10, prev.x), maxX),
              y: Math.min(Math.max(10, prev.y), maxY),
            }
          : null
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handleInitiateReply = (msg: Message) => {
    if (!activePartner) return;
    const senderName =
      msg.senderId === currentUser.uid
        ? (lang === 'bn' ? 'আপনি' : 'You')
        : activePartner.displayName;

    let textPreview = '';
    if (msg.text) {
      const decrypted = decryptMessage(msg.text, activePartner.publicKey, currentUser.secretKey);
      textPreview = decrypted || msg.text;
    } else if (msg.imageUrl) {
      textPreview = lang === 'bn' ? '📷 ছবি' : '📷 Photo';
    } else if (msg.audioUrl) {
      textPreview = lang === 'bn' ? '🎙️ ভয়েস মেসেজ' : '🎙️ Voice message';
    }

    setReplyingToMessage({
      id: msg.id,
      senderName,
      text: textPreview,
      imageUrl: msg.imageUrl,
      audioUrl: msg.audioUrl,
    });

    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartner) return;

    const textToSend = inputText.trim();
    const replyData = replyingToMessage || undefined;
    setInputText('');
    setReplyingToMessage(null);

    await sendTextMessage(
      currentUser.uid,
      activePartner.uid,
      textToSend,
      activePartner.publicKey,
      currentUser.secretKey,
      replyData
    );
  };

  const unreadCount = activePartner ? getUnreadCount(currentUser.uid, activePartner.uid) : 0;

  const handleSwitchPartner = (pid: string) => {
    setInternalPartnerId(pid);
    onSelectPartner(pid);
    setShowSelectorDropdown(false);
  };

  // Compute smart position for Chat Window so it never goes off-screen
  const getChatWindowStyle = (): React.CSSProperties => {
    const currentX = position ? position.x : window.innerWidth - 76;
    const currentY = position ? position.y : window.innerHeight - 76;

    const style: React.CSSProperties = { position: 'fixed', zIndex: 9999 };

    // Vertical alignment: place above bubble if on lower screen half, below bubble if upper half
    if (currentY > 400) {
      style.bottom = `${window.innerHeight - currentY + 10}px`;
    } else {
      style.top = `${currentY + 60}px`;
    }

    // Horizontal alignment: place relative to left or right edge
    if (currentX > window.innerWidth / 2) {
      style.right = `${Math.max(12, window.innerWidth - currentX - 52)}px`;
    } else {
      style.left = `${Math.max(12, currentX)}px`;
    }

    return style;
  };

  // Bubble style
  const getBubbleStyle = (): React.CSSProperties => {
    if (position) {
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      };
    }
    return {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
    };
  };

  return (
    <>
      {/* Remove Target Zone when dragging */}
      {isDraggingState && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center gap-2 px-6 py-3.5 rounded-full transition-all duration-200 pointer-events-none shadow-2xl ${
            isOverRemoveZoneState
              ? 'bg-red-600 scale-125 ring-4 ring-red-400/50 text-white shadow-red-600/50'
              : 'bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 backdrop-blur-md shadow-xl'
          }`}
        >
          <Trash2 className={`w-5 h-5 ${isOverRemoveZoneState ? 'text-white animate-bounce' : 'text-red-500'}`} />
          <span className="text-xs font-bold tracking-wide">
            {lang === 'bn' ? 'সরাতে এখানে ড্রপ করুন' : 'Drop here to remove'}
          </span>
        </div>
      )}

      {/* Expanded Quick Chat Window */}
      {isOpen && (
        <div
          style={getChatWindowStyle()}
          className="w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[480px] animate-fadeIn text-slate-900 dark:text-slate-100 transition-colors"
        >
          {/* Header */}
          <div className="p-3.5 bg-orange-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-slate-900 dark:text-slate-100 relative z-20">
            {activePartner ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setShowSelectorDropdown(!showSelectorDropdown)}
                  className="flex items-center gap-2 hover:bg-orange-100/60 dark:hover:bg-slate-700/60 p-1 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={activePartner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={activePartner.displayName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-400"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        isUserOnline(activePartner) ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <span>{activePartner.displayName}</span>
                      <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 flex items-center gap-1 font-medium">
                      <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {isUserOnline(activePartner)
                          ? lang === 'bn'
                            ? 'অনলাইন'
                            : 'Active now'
                          : lang === 'bn'
                          ? 'অফলাইন'
                          : 'Offline'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'bn' ? 'চ্যাট নির্বাচন করুন' : 'Select a Chat'}
                </h3>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowOverlayGuide(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={lang === 'bn' ? 'অ্যান্ড্রয়েড ওভারলে গাইড' : 'Android Overlay Guide'}
              >
                <HelpCircle className="w-4 h-4 text-orange-400" />
              </button>
              <button
                onClick={handlePopoutWindow}
                className="p-1.5 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={lang === 'bn' ? 'পপ-আউট ভাসমান উইন্ডো (Picture-in-Picture)' : 'Pop-out Floating Window (PiP)'}
              >
                <ExternalLink className="w-4 h-4 text-orange-500" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={lang === 'bn' ? 'মিনিমাইজ করুন' : 'Minimize'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>


          {/* Contact Switcher Dropdown Sheet */}
          {showSelectorDropdown && (
            <div className="absolute top-14 left-0 right-0 bg-white/98 dark:bg-slate-900/98 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-xl animate-fadeIn">
              <div className="p-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>{lang === 'bn' ? 'কন্টাক্ট নির্বাচন করুন:' : 'Select Contact:'}</span>
              </div>
              {partners.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'কোনো কন্টাক্ট পাওয়া যায়নি' : 'No contacts found'}
                </div>
              ) : (
                partners.map((p) => (
                  <button
                    key={p.uid}
                    onClick={() => handleSwitchPartner(p.uid)}
                    className={`w-full p-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer ${
                      activePartner?.uid === p.uid ? 'bg-orange-100/70 dark:bg-orange-950/60 text-orange-950 dark:text-orange-200 font-bold' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <img src={p.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={p.displayName} className="w-7 h-7 rounded-full object-cover" />
                    <div className="flex-1 min-w-0 text-xs truncate">
                      <div className="truncate font-semibold">{p.displayName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Messages Container OR Select Partner List */}
          {!activePartner ? (
            <div className="flex-1 p-4 bg-slate-50/80 dark:bg-slate-950/80 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center font-medium">
                {lang === 'bn' ? 'চ্যাট করার জন্য একজন কন্টাক্ট নির্বাচন করুন:' : 'Select a contact to start messaging:'}
              </p>
              <div className="space-y-2">
                {partners.map((p) => (
                  <button
                    key={p.uid}
                    onClick={() => handleSwitchPartner(p.uid)}
                    className="w-full p-3 bg-white dark:bg-slate-900 hover:bg-orange-50/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <img src={p.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={p.displayName} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">{p.displayName}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Messages Container */}
              <div
                ref={headScrollContainerRef}
                onScroll={handleHeadScroll}
                className="flex-1 p-3 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/80 space-y-2.5 text-xs"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {lang === 'bn' ? 'এখনই মেসেজ পাঠিয়ে চ্যাট শুরু করুন' : 'Send a message to start chatting'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                      <SwipeableChatHeadMessage
                        key={msg.id}
                        msg={msg}
                        isMe={isMe}
                        activePartner={activePartner}
                        currentUser={currentUser}
                        lang={lang}
                        onInitiateReply={handleInitiateReply}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Replying Banner Bar */}
              {replyingToMessage && (
                <div className="bg-orange-50 dark:bg-slate-800 border-t border-orange-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-lg shrink-0">
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-bold text-orange-600 dark:text-orange-400 text-[10px] block truncate">
                        {replyingToMessage.senderName} - {lang === 'bn' ? 'রিপ্লাই দেওয়া হচ্ছে' : 'Replying to'}
                      </span>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 truncate font-normal">
                        {replyingToMessage.text || (lang === 'bn' ? 'মিডিয়া মেসেজ' : 'Media message')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingToMessage(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form onSubmit={handleSend} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={lang === 'bn' ? 'মেসেজ লিখুন...' : 'Type a message...'}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl shadow-md shadow-orange-500/20 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Bubble */}
      <div
        ref={bubbleRef}
        style={{ ...getBubbleStyle(), touchAction: 'none' }}
        className="touch-none select-none group"
      >
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="relative w-13 h-13 rounded-full bg-white dark:bg-slate-900 p-0.5 shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center ring-2 ring-orange-500 cursor-grab active:cursor-grabbing"
        >
          {/* Subtle glow/ping indicator when unread messages arrive */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute inset-0 rounded-full bg-orange-500/40 animate-ping pointer-events-none" />
          )}

          <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden relative pointer-events-none">
            {activePartner ? (
              <img
                src={activePartner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={activePartner.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <MessageSquare className="w-6 h-6 text-orange-500" />
            )}
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md pointer-events-none animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Close Floating Head toggle button on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCloseFloatingHead();
          }}
          className="absolute -top-1 -left-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
          title={lang === 'bn' ? 'চ্যাট হেড বন্ধ করুন' : 'Close Chat Head'}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Android Overlay Permission & Floating Chat Head Guide Modal */}
      {showOverlayGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-slate-100 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="font-bold text-sm text-orange-400 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <span>{lang === 'bn' ? 'অ্যান্ড্রয়েড ওভারলে ও চ্যাট হেড গাইড' : 'Android Overlay & Chat Head Guide'}</span>
              </h3>
              <button
                onClick={() => setShowOverlayGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 overflow-y-auto max-h-[70vh] pr-1">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3.5">
                <h4 className="font-bold text-orange-300 mb-1 flex items-center gap-1.5 text-xs">
                  <Settings className="w-4 h-4 text-orange-400" />
                  <span>{lang === 'bn' ? '১. ডিসপ্লে ওভার আদার অ্যাপস পারমিশন:' : '1. Display Over Other Apps Permission:'}</span>
                </h4>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {lang === 'bn'
                    ? 'অ্যান্ড্রয়েড APK মিনিমাইজ বা অন্য অ্যাপ্সে থাকার সময় চ্যাট হেড ভাসিয়ে রাখতে:'
                    : 'To keep chat heads visible when app is minimized or using other apps:'}
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-[11px] text-slate-200 font-medium">
                  <li>{lang === 'bn' ? 'ফোনের Settings > Apps > Secure Messenger-এ যান।' : 'Open Android Settings > Apps > Secure Messenger.'}</li>
                  <li>{lang === 'bn' ? '"Display over other apps" বা "Draw over other apps" অপশনটি ALLOW (অন) করুন।' : 'Enable "Display over other apps" or "Draw over other apps".'}</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                <h4 className="font-bold text-orange-300 mb-1 flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-4 h-4 text-orange-400" />
                  <span>{lang === 'bn' ? '২. পপ-আউট উইন্ডো (Picture-in-Picture):' : '2. Pop-out Floating Window (PiP):'}</span>
                </h4>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {lang === 'bn'
                    ? 'চ্যাট হেডের ওপরের ডানপাশের পপ-আউট (↗) আইকনে ক্লিক করলে এটি মোবাইল বা পিসির সব অ্যাপসের ওপরে আলাদা ভাসমান উইন্ডো হয়ে থাকবে।'
                    : 'Clicking the pop-out icon (↗) launches a picture-in-picture window floating above all apps.'}
                </p>
                <button
                  onClick={() => {
                    setShowOverlayGuide(false);
                    handlePopoutWindow();
                  }}
                  className="mt-2.5 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'এখনই পপ-আউট উইন্ডো অপেন করুন' : 'Launch Pop-out Window Now'}</span>
                </button>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                <h4 className="font-bold text-orange-300 mb-1 flex items-center gap-1.5 text-xs">
                  <Bell className="w-4 h-4 text-orange-400" />
                  <span>{lang === 'bn' ? '৩. ব্যাকগ্রাউন্ড নোটিফিকেশন রিপ্লাই:' : '3. Background Notification Reply:'}</span>
                </h4>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {lang === 'bn'
                    ? 'অ্যাপ ব্যাকগ্রাউন্ডে থাকলে যেকোনো নতুন মেসেজে তাৎক্ষণিক পপ-আপ নোটিফিকেশন আসবে যা থেকে মেসেজ পড়া ও রিপ্লাই দেয়া সম্ভব।'
                    : 'System notification popups will fire when new messages arrive, allowing instant replies from the notification bar.'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowOverlayGuide(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'বুঝেছি' : 'Got it'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
