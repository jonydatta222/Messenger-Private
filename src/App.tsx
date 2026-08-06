import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Header } from './components/Header';
import { ChatList } from './components/ChatList';
import { ChatScreen } from './components/ChatScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { FloatingChatHead } from './components/FloatingChatHead';
import { CallModal } from './components/CallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { EncryptionInfoModal } from './components/EncryptionInfoModal';
import { PermissionsGuideModal } from './components/PermissionsGuideModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { AuthScreen } from './components/AuthScreen';
import { NotificationQuickReply } from './components/NotificationQuickReply';
import { 
  getUsers, 
  getCurrentUserProfile, 
  createNewUser,
  logoutUser,
  getConversationsForUser,
  setAuthSession,
  getMessages,
  getGroupsForUser,
  fetchAllFromFirestore,
  sendCallSignal,
  updateCallSignalStatus,
  subscribeToCallSignals,
  sendCallLogMessage,
  normalizePhone,
  findUserByPhoneOrId
} from './services/chatService';
import { decryptMessage } from './services/encryptionService';
import { UserProfile, CallState, Group, CallSignal, Message } from './types';
import { ArrowLeft, MessageSquare, Plus, Lock, Phone, LogOut } from 'lucide-react';
import { 
  playNotificationChime, 
  triggerVibration, 
  flashDocumentTitle, 
  requestNotificationPermission,
  sendSystemNotification 
} from './services/notificationService';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  // Language State initialized from localStorage (defaulting to English 'en')
  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('e2ee_messenger_lang');
      if (saved === 'bn' || saved === 'en') return saved;
    }
    return 'en';
  });

  const handleToggleLang = () => {
    setLang((prev) => {
      const next = prev === 'bn' ? 'en' : 'bn';
      if (typeof window !== 'undefined') {
        localStorage.setItem('e2ee_messenger_lang', next);
      }
      return next;
    });
  };

  // Dark Mode State initialized from localStorage (defaulting to false / Light Mode)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('e2ee_messenger_theme');
      return saved ? saved === 'dark' : false;
    }
    return false;
  });

  // Apply 'dark' class to html root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('e2ee_messenger_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('e2ee_messenger_theme', 'light');
    }
  }, [darkMode]);

  // Modals & States
  const [isFloatingHeadActive, setIsFloatingHeadActive] = useState(true);
  const [isOutsideApp, setIsOutsideApp] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.hidden;
    }
    return false;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleToggleFloatingHead = () => {
    const nextState = !isFloatingHeadActive;
    setIsFloatingHeadActive(nextState);
    if (nextState) {
      showToast(
        lang === 'bn'
          ? 'চ্যাট হেড অন করা হয়েছে (শুধুমাত্র অ্যাপস থেকে বাইরে গেলে দেখাবে)'
          : 'Chat Head enabled (shows only when outside the app)'
      );
    } else {
      showToast(
        lang === 'bn'
          ? 'চ্যাট হেড বন্ধ করা হয়েছে'
          : 'Chat Head disabled'
      );
    }
  };

  const handleOpenFloatingHead = () => {
    setIsFloatingHeadActive(true);
    showToast(
      lang === 'bn'
        ? 'চ্যাট হেড অন করা রয়েছে। আপনি অ্যাপস থেকে বাইরে গেলে (মিনিমাইজ করলে) এটি ভেসে উঠবে।'
        : 'Chat Head enabled. It will appear when you minimize or leave the app.'
    );
  };
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEncryptionInfoModal, setShowEncryptionInfoModal] = useState(false);
  const [showPermissionsGuideModal, setShowPermissionsGuideModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [quickReplyMsg, setQuickReplyMsg] = useState<Message | null>(null);
  const [quickReplySender, setQuickReplySender] = useState<UserProfile | null>(null);

  // Ref to hold sub-modal closer from ChatScreen
  const chatSubModalCloseRef = useRef<(() => boolean) | null>(null);

  // Open state ref for Back button (popstate / capacitor backButton) step-by-step navigation
  const openStateRef = useRef({
    activeCall,
    incomingCall,
    quickReplyMsg,
    showAddContactModal,
    showCreateGroupModal,
    showProfileModal,
    showEncryptionInfoModal,
    showPermissionsGuideModal,
    showLogoutConfirmModal,
    selectedPartnerId,
    selectedGroupId,
    chatSubModalCloseRef,
  });

  useEffect(() => {
    openStateRef.current = {
      activeCall,
      incomingCall,
      quickReplyMsg,
      showAddContactModal,
      showCreateGroupModal,
      showProfileModal,
      showEncryptionInfoModal,
      showPermissionsGuideModal,
      showLogoutConfirmModal,
      selectedPartnerId,
      selectedGroupId,
      chatSubModalCloseRef,
    };
  }, [
    activeCall,
    incomingCall,
    quickReplyMsg,
    showAddContactModal,
    showCreateGroupModal,
    showProfileModal,
    showEncryptionInfoModal,
    showPermissionsGuideModal,
    showLogoutConfirmModal,
    selectedPartnerId,
    selectedGroupId,
  ]);

  // Push history state helper for sub-views / modals
  const pushNavState = (type: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ appNav: true, type, ts: Date.now() }, '');
    }
  };

  // Safe close helper for UI on-screen buttons
  const safeCloseModal = (closeFn: () => void) => {
    if (typeof window !== 'undefined' && window.history.state?.appNav) {
      window.history.back();
    } else {
      closeFn();
    }
  };

  // Timestamp of last back button press for double-tap exit prevention
  const lastBackPressTimeRef = useRef<number>(0);

  // Master Back Navigation Handler for both Hardware Android Back Button & Browser PopState
  const handleBackAction = (): boolean => {
    const cur = openStateRef.current;

    if (cur.activeCall) {
      if (cur.activeCall.callId && currentUser) {
        const partnerId = cur.activeCall.partnerId;
        updateCallSignalStatus(
          cur.activeCall.callId,
          'ended',
          currentUser.uid,
          partnerId,
          cur.activeCall.type || 'audio'
        );
      }
      setActiveCall(null);
      return true;
    }

    if (cur.incomingCall) {
      if (currentUser) {
        updateCallSignalStatus(
          cur.incomingCall.id,
          'rejected',
          cur.incomingCall.callerId,
          cur.incomingCall.receiverId,
          cur.incomingCall.type
        );
      }
      setIncomingCall(null);
      return true;
    }

    if (cur.quickReplyMsg) {
      setQuickReplyMsg(null);
      setQuickReplySender(null);
      return true;
    }

    if (cur.showLogoutConfirmModal) {
      setShowLogoutConfirmModal(false);
      return true;
    }

    if (cur.showAddContactModal) {
      setShowAddContactModal(false);
      setAddContactError(null);
      setNewContactPhone('');
      return true;
    }

    if (cur.showCreateGroupModal) {
      setShowCreateGroupModal(false);
      return true;
    }

    if (cur.showProfileModal) {
      setShowProfileModal(false);
      return true;
    }

    if (cur.showEncryptionInfoModal) {
      setShowEncryptionInfoModal(false);
      return true;
    }

    if (cur.showPermissionsGuideModal) {
      setShowPermissionsGuideModal(false);
      return true;
    }

    if (cur.chatSubModalCloseRef.current) {
      const closed = cur.chatSubModalCloseRef.current();
      if (closed) return true;
    }

    if (cur.selectedPartnerId || cur.selectedGroupId) {
      setSelectedPartnerId(null);
      setSelectedGroupId(null);
      return true;
    }

    // If on root main screen (ChatList or AuthScreen):
    // Require pressing Back twice within 2 seconds to exit the app
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 2000) {
      if (Capacitor.isNativePlatform()) {
        CapApp.exitApp();
      }
      return true;
    }

    lastBackPressTimeRef.current = now;
    setToastMessage(
      lang === 'bn'
        ? 'অ্যাপস থেকে বের হতে আবার ব্যাক চাপুন'
        : 'Press back again to exit app'
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
    return true;
  };

  // Register Capacitor Native Back Button listener and Browser PopState listener
  useEffect(() => {
    let listenerHandler: any = null;

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        handleBackAction();
      }).then((h) => {
        listenerHandler = h;
      });
    }

    const handlePopState = () => {
      handleBackAction();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      if (listenerHandler) {
        listenerHandler.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [lang]);

  // New Contact Form State
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addContactError, setAddContactError] = useState<string | null>(null);

  // Track last known message ID to detect new incoming SMS
  const lastKnownMsgIdRef = useRef<string | null>(null);

  // Request browser notification permission if supported
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  // Check for new incoming messages and trigger Phone System Notification & Chat Head
  const checkNewIncomingMessages = (currUser: UserProfile, loadedUsers: UserProfile[]) => {
    const allMsgs = getMessages();
    const myIncomingMsgs = allMsgs.filter((m) => m.receiverId === currUser.uid && m.senderId !== currUser.uid);

    if (myIncomingMsgs.length > 0) {
      const latest = myIncomingMsgs[myIncomingMsgs.length - 1];

      // Initializing on first run if null
      if (!lastKnownMsgIdRef.current) {
        lastKnownMsgIdRef.current = latest.id;
        return;
      }

      if (latest.id !== lastKnownMsgIdRef.current) {
        lastKnownMsgIdRef.current = latest.id;
        const sender = loadedUsers.find((u) => u.uid === latest.senderId) || null;
        const senderName = sender ? sender.displayName : 'Messenger';

        // Decrypt actual SMS content for notification
        let previewText = latest.text;
        if (latest.type === 'image') {
          previewText = lang === 'bn' ? '📷 [ছবি]' : '📷 [Photo]';
        } else if (latest.type === 'voice') {
          previewText = lang === 'bn' ? '🎤 [ভয়েস মেসেজ]' : '🎤 [Voice Message]';
        } else if (latest.type === 'call') {
          previewText = lang === 'bn' ? '📞 [কল]' : '📞 [Call]';
        } else if (sender?.publicKey && currUser?.secretKey) {
          previewText = decryptMessage(latest.text || '', sender.publicKey, currUser.secretKey);
        }

        // Play sound chime & vibrate
        playNotificationChime();
        triggerVibration([200, 100, 200]);

        // Check if app is minimized / outside app
        const isCurrentlyOutside = isOutsideApp || (typeof document !== 'undefined' && document.hidden);

        if (isCurrentlyOutside) {
          // MINIMIZED / OUTSIDE APP:
          setIsFloatingHeadActive(true);
          flashDocumentTitle(`💬 ${senderName}: ${previewText}`);

          setQuickReplyMsg(latest);
          setQuickReplySender(sender);

          // Send Phone OS System Notification showing exact SMS text
          sendSystemNotification(
            senderName,
            previewText,
            sender?.photoURL,
            () => {
              setQuickReplyMsg(latest);
              setQuickReplySender(sender);
              setIsFloatingHeadActive(true);
            }
          );
        } else {
          // INSIDE APP:
          // Do NOT pop up intrusive quick reply overlay or system banner when active inside app
        }
      }
    }
  };

  // Demo Trigger to test Direct Notification Reply
  const triggerTestNotificationReply = () => {
    if (!currentUser) return;
    const loadedUsers = getUsers();
    const partner = loadedUsers.find((u) => u.uid !== currentUser.uid) || loadedUsers[0];
    if (!partner) return;

    const dummyMsg: Message = {
      id: 'test_sms_' + Date.now(),
      senderId: partner.uid,
      receiverId: currentUser.uid,
      text: lang === 'bn' 
        ? 'হাই! কেমন আছেন? আপনাকে একটি মেসেজ পাঠিয়েছি।'
        : 'Hi! How are you doing? I sent you a message.',
      timestamp: Date.now(),
      read: false,
    };

    playNotificationChime();
    triggerVibration();
    setIsFloatingHeadActive(true);
    setQuickReplyMsg(dummyMsg);
    setQuickReplySender(partner);

    sendSystemNotification(
      partner.displayName,
      dummyMsg.text,
      partner.photoURL,
      () => {
        setQuickReplyMsg(dummyMsg);
        setQuickReplySender(partner);
      }
    );
  };

  // Load state on mount & listen to real-time events
  const loadData = () => {
    const loadedUsers = getUsers();
    const currUser = getCurrentUserProfile();
    setUsers(loadedUsers);
    setCurrentUser(currUser);

    if (currUser) {
      const myGrps = getGroupsForUser(currUser.uid);
      setGroups(myGrps);

      checkNewIncomingMessages(currUser, loadedUsers);

      if (selectedPartnerId && !loadedUsers.some((u) => u.uid === selectedPartnerId)) {
        setSelectedPartnerId(null);
      }
      if (selectedGroupId && !myGrps.some((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(null);
      }
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    const handleAppVisibilityChange = () => {
      const isHidden = typeof document !== 'undefined' ? document.hidden : false;
      setIsOutsideApp(isHidden);
      if (isHidden) {
        // Automatically activate Chat Head when minimized
        setIsFloatingHeadActive(true);
      } else {
        fetchAllFromFirestore();
      }
    };

    window.addEventListener('e2ee_messenger_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    document.addEventListener('visibilitychange', handleAppVisibilityChange);

    // Capacitor Native App Lifecycle listener for background execution
    let capAppListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        setIsOutsideApp(!isActive);
        if (!isActive) {
          // Automatically activate Chat Head when minimized on native
          setIsFloatingHeadActive(true);
        } else {
          fetchAllFromFirestore();
        }
      }).then((l) => {
        capAppListener = l;
      });
    }

    // Periodic Firestore Background Polling (keeps background syncing alive every 8s)
    const backgroundSyncInterval = setInterval(() => {
      fetchAllFromFirestore();
    }, 8000);

    return () => {
      window.removeEventListener('e2ee_messenger_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleAppVisibilityChange);
      if (capAppListener) {
        capAppListener.remove();
      }
      clearInterval(backgroundSyncInterval);
    };
  }, [lang]);

  // Subscribe to real-time call signals
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToCallSignals(currentUser.uid, (signal) => {
      // Receiver side
      if (signal.receiverId === currentUser.uid) {
        if (signal.status === 'ringing') {
          setIncomingCall(signal);
        } else if (signal.status === 'ended' || signal.status === 'rejected') {
          if (signal.status === 'ended') {
            // Caller hung up while ringing -> record missed call for receiver
            sendCallLogMessage(signal.callerId, currentUser.uid, signal.type, 'missed', undefined, signal.id);
          }
          setIncomingCall((prev) => (prev?.id === signal.id ? null : prev));
          setActiveCall((prev) => (prev?.callId === signal.id ? null : prev));
        }
      }

      // Caller side
      if (signal.callerId === currentUser.uid) {
        if (signal.status === 'accepted') {
          setActiveCall((prev) =>
            prev?.callId === signal.id ? { ...prev, status: 'connected', startTime: Date.now() } : prev
          );
        } else if (signal.status === 'rejected') {
          setActiveCall((prev) => (prev?.callId === signal.id ? null : prev));
          sendCallLogMessage(currentUser.uid, signal.receiverId, signal.type, 'declined', undefined, signal.id);
          setToastMessage(lang === 'bn' ? 'কলটি রিজেক্ট করা হয়েছে' : 'Call was declined');
          setTimeout(() => setToastMessage(null), 3500);
        } else if (signal.status === 'ended') {
          setActiveCall((prev) => (prev?.callId === signal.id ? null : prev));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, lang]);

  const handleAuthSuccess = (user: UserProfile) => {
    setSelectedPartnerId(null);
    setSelectedGroupId(null);
    const allMsgs = getMessages();
    const myIncomingMsgs = allMsgs.filter((m) => m.receiverId === user.uid && m.senderId !== user.uid);
    if (myIncomingMsgs.length > 0) {
      lastKnownMsgIdRef.current = myIncomingMsgs[myIncomingMsgs.length - 1].id;
    } else {
      lastKnownMsgIdRef.current = null;
    }
    setCurrentUser(user);
    loadData();
  };

  const handleRequestLogout = () => {
    setShowLogoutConfirmModal(true);
    pushNavState('logoutConfirm');
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirmModal(false);
    logoutUser();
    setCurrentUser(null);
    setSelectedPartnerId(null);
    setSelectedGroupId(null);
  };

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        lang={lang}
        onToggleLang={handleToggleLang}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
    );
  }

  const selectedPartner = users.find((u) => u.uid === selectedPartnerId) || null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddContactError(null);
    const cleanInput = newContactPhone.trim();

    if (!cleanInput) {
      setAddContactError(
        lang === 'bn'
          ? 'অনুগ্রহ করে ফোন নাম্বার বা আইডি প্রদান করুন।'
          : 'Please enter a phone number or ID.'
      );
      return;
    }

    if (cleanInput.length < 3) {
      setAddContactError(
        lang === 'bn'
          ? 'ফোন নাম্বার বা আইডি অন্তত ৩ অক্ষরের হতে হবে।'
          : 'Phone number or ID must be at least 3 characters.'
      );
      return;
    }

    const currentPhoneNorm = normalizePhone(currentUser?.phone || '');
    const currentUid = (currentUser?.uid || '').toLowerCase();
    const searchNorm = normalizePhone(cleanInput);

    if (
      (currentUid && currentUid === cleanInput.toLowerCase()) ||
      (currentPhoneNorm && searchNorm && currentPhoneNorm === searchNorm)
    ) {
      setAddContactError(
        lang === 'bn'
          ? 'আপনি আপনার নিজের আইডি বা ফোন নাম্বার যোগ করতে পারবেন না।'
          : 'You cannot add your own ID or phone number.'
      );
      return;
    }

    try {
      const existingUser = await findUserByPhoneOrId(cleanInput);

      if (existingUser && existingUser.uid !== currentUser.uid) {
        setUsers(getUsers());
        setSelectedPartnerId(existingUser.uid);
        setSelectedGroupId(null);
        setNewContactPhone('');
        setAddContactError(null);
        setShowAddContactModal(false);
      } else {
        setAddContactError(
          lang === 'bn'
            ? 'এই ফোন নাম্বার বা আইডি দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।'
            : 'No account found with this phone number or ID.'
        );
      }
    } catch {
      setAddContactError(
        lang === 'bn'
          ? 'সার্চ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to search user. Please try again.'
      );
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (selectedPartner && currentUser) {
      const signal = await sendCallSignal(currentUser.uid, selectedPartner.uid, type);
      setActiveCall({
        callId: signal.id,
        active: true,
        type,
        partnerId: selectedPartner.uid,
        status: 'calling',
      });
    }
  };

  const handleEndActiveCall = (duration?: number) => {
    if (activeCall?.callId && currentUser) {
      const partnerId = activeCall.partnerId || selectedPartner?.uid;
      updateCallSignalStatus(
        activeCall.callId,
        'ended',
        currentUser.uid,
        partnerId,
        activeCall.type || 'audio'
      );
      if (partnerId) {
        if (activeCall.status === 'connected') {
          const calcDuration = duration || (activeCall.startTime ? Math.floor((Date.now() - activeCall.startTime) / 1000) : 0);
          sendCallLogMessage(currentUser.uid, partnerId, activeCall.type || 'audio', 'completed', calcDuration, activeCall.callId);
        } else {
          sendCallLogMessage(currentUser.uid, partnerId, activeCall.type || 'audio', 'missed', undefined, activeCall.callId);
        }
      }
    }
    setActiveCall(null);
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    updateCallSignalStatus(
      incomingCall.id,
      'accepted',
      incomingCall.callerId,
      incomingCall.receiverId,
      incomingCall.type
    );
    setActiveCall({
      callId: incomingCall.id,
      active: true,
      type: incomingCall.type,
      partnerId: incomingCall.callerId,
      status: 'connected',
      startTime: Date.now(),
    });
    setIncomingCall(null);
  };

  const handleRejectIncomingCall = () => {
    if (!incomingCall || !currentUser) return;
    updateCallSignalStatus(
      incomingCall.id,
      'rejected',
      incomingCall.callerId,
      incomingCall.receiverId,
      incomingCall.type
    );
    sendCallLogMessage(
      incomingCall.callerId,
      currentUser.uid,
      incomingCall.type,
      'declined',
      undefined,
      incomingCall.id
    );
    setIncomingCall(null);
  };

  const activeCallPartner = selectedPartner || users.find((u) => u.uid === activeCall?.partnerId);
  const incomingCallerUser = users.find((u) => u.uid === incomingCall?.callerId) || (incomingCall ? ({ uid: incomingCall.callerId, displayName: 'User', phone: '' } as UserProfile) : null);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn pointer-events-none max-w-[90vw] text-center">
          <MessageSquare className="w-4 h-4 text-orange-400 dark:text-orange-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header - Only shown when no active chat or group is selected */}
      {!selectedPartnerId && !selectedGroupId && (
        <Header
          currentUser={currentUser}
          lang={lang}
          onToggleLang={handleToggleLang}
          onOpenProfile={() => {
            setShowProfileModal(true);
            pushNavState('profile');
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          isFloatingHeadActive={isFloatingHeadActive}
          onToggleFloatingHead={handleToggleFloatingHead}
          onOpenEncryptionInfo={() => {
            setShowEncryptionInfoModal(true);
            pushNavState('encryptionInfo');
          }}
          onOpenPermissionsGuide={() => {
            setShowPermissionsGuideModal(true);
            pushNavState('permissionsGuide');
          }}
          onTestNotificationReply={triggerTestNotificationReply}
          onLogout={handleRequestLogout}
        />
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative bg-slate-50 dark:bg-slate-950">
        {/* Left Contact List (Shown when no chat is selected) */}
        {!selectedPartnerId && !selectedGroupId ? (
          <div className="w-full h-full">
            <ChatList
              users={users}
              currentUser={currentUser}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={(partnerId) => {
                setSelectedPartnerId(partnerId);
                setSelectedGroupId(null);
                pushNavState('chat');
              }}
              selectedGroupId={selectedGroupId}
              onSelectGroup={(groupId) => {
                setSelectedGroupId(groupId);
                setSelectedPartnerId(null);
                pushNavState('chat');
              }}
              onOpenAddContact={() => {
                setShowAddContactModal(true);
                pushNavState('addContact');
              }}
              onOpenCreateGroup={() => {
                setShowCreateGroupModal(true);
                pushNavState('createGroup');
              }}
              lang={lang}
            />
          </div>
        ) : (
          /* Fullscreen Chat Screen when a partner or group is selected */
          <div className="w-full h-full flex-1">
            {(selectedPartner || selectedGroup) && (
              <ChatScreen
                currentUser={currentUser}
                partner={selectedPartner}
                group={selectedGroup}
                allUsers={users}
                onStartCall={(type) => {
                  handleStartCall(type);
                  pushNavState('call');
                }}
                onBack={() => {
                  safeCloseModal(() => {
                    setSelectedPartnerId(null);
                    setSelectedGroupId(null);
                  });
                }}
                onRegisterSubModalClose={(fn) => {
                  chatSubModalCloseRef.current = fn;
                }}
                onPushNavState={pushNavState}
                onOpenFloatingHead={handleOpenFloatingHead}
                lang={lang}
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Head Mode - ONLY rendered when OUTSIDE/MINIMIZED the app */}
      {isOutsideApp && isFloatingHeadActive && currentUser && (
        <FloatingChatHead
          currentUser={currentUser}
          partners={users.filter((u) => u.uid !== currentUser.uid)}
          selectedPartner={selectedPartner}
          onSelectPartner={(pid) => {
            setSelectedPartnerId(pid);
            setSelectedGroupId(null);
          }}
          onCloseFloatingHead={() => setIsFloatingHeadActive(false)}
          lang={lang}
          isOutsideApp={isOutsideApp}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          currentUser={currentUser}
          allUsers={users}
          onClose={() => safeCloseModal(() => setShowCreateGroupModal(false))}
          onGroupCreated={(createdGroup) => {
            loadData();
            setSelectedGroupId(createdGroup.id);
            setSelectedPartnerId(null);
          }}
          lang={lang}
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => safeCloseModal(() => setShowProfileModal(false))}
          onLogout={handleRequestLogout}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            loadData();
          }}
          lang={lang}
        />
      )}

      {/* Encryption Info Modal */}
      {showEncryptionInfoModal && (
        <EncryptionInfoModal
          onClose={() => safeCloseModal(() => setShowEncryptionInfoModal(false))}
          lang={lang}
        />
      )}

      {/* Permissions Guide Modal */}
      {showPermissionsGuideModal && (
        <PermissionsGuideModal
          onClose={() => safeCloseModal(() => setShowPermissionsGuideModal(false))}
          lang={lang}
        />
      )}

      {/* Add New Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-fadeIn relative text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                {lang === 'bn' ? 'নতুন কন্টাক্ট যোগ করুন' : 'Add New Contact'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  safeCloseModal(() => {
                    setShowAddContactModal(false);
                    setAddContactError(null);
                    setNewContactPhone('');
                  });
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'যার সাথে চ্যাট করতে চান তার ফোন নাম্বার বা ইউজার আইডি প্রদান করুন:'
                : 'Enter the phone number or User ID of the person you want to chat with:'}
            </p>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  {lang === 'bn' ? 'ফোন নাম্বার বা আইডি' : 'Phone Number or User ID'}
                </label>
                <input
                  type="text"
                  value={newContactPhone}
                  onChange={(e) => {
                    setNewContactPhone(e.target.value);
                    if (addContactError) setAddContactError(null);
                  }}
                  placeholder={lang === 'bn' ? 'যেমন: 01700000000 বা user_123...' : 'e.g. 01700000000 or user_123...'}
                  autoFocus
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono tracking-wide"
                />
              </div>

              {addContactError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <span>⚠️</span>
                  <span>{addContactError}</span>
                </div>
              )}

              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/40 rounded-2xl border border-orange-100 dark:border-orange-900/50 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="leading-tight">
                  {lang === 'bn'
                    ? 'নাম্বারটি দিয়ে সরাসরি নিরাপদ এন্ড-টু-এন্ড এনক্রিপ্টেড চ্যাট শুরু হবে।'
                    : 'End-to-end encrypted chat will start immediately upon adding.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    safeCloseModal(() => {
                      setShowAddContactModal(false);
                      setAddContactError(null);
                      setNewContactPhone('');
                    });
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'চ্যাট শুরু করুন' : 'Start Chat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && incomingCallerUser && (
        <IncomingCallModal
          caller={incomingCallerUser}
          type={incomingCall.type}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
          lang={lang}
        />
      )}

      {/* Active Call Modal */}
      {activeCall && activeCallPartner && (
        <CallModal
          partner={activeCallPartner}
          type={activeCall.type || 'audio'}
          initialStatus={activeCall.status === 'connected' ? 'connected' : 'calling'}
          isAccepted={activeCall.status === 'connected'}
          onEndCall={handleEndActiveCall}
          lang={lang}
        />
      )}

      {/* Direct Quick Reply Notification Overlay */}
      {quickReplyMsg && quickReplySender && currentUser && (
        <NotificationQuickReply
          incomingMsg={quickReplyMsg}
          sender={quickReplySender}
          currentUser={currentUser}
          lang={lang}
          onDismiss={() => {
            setQuickReplyMsg(null);
            setQuickReplySender(null);
          }}
          onOpenChat={(senderId) => {
            setSelectedPartnerId(senderId);
            setSelectedGroupId(null);
            setQuickReplyMsg(null);
            setQuickReplySender(null);
          }}
        />
      )}

      {/* Logout Confirmation Modal Popup */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto text-red-600 dark:text-red-400 shadow-inner">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {lang === 'bn' ? 'লগআউট নিশ্চিতকরণ' : 'Confirm Log Out'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {lang === 'bn'
                  ? 'আপনি কি নিশ্চিত যে অ্যাপস থেকে লগআউট করতে চান?'
                  : 'Are you sure you want to log out of the application?'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => safeCloseModal(() => setShowLogoutConfirmModal(false))}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'না (No)' : 'No'}
              </button>

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'হ্যাঁ (Yes)' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
