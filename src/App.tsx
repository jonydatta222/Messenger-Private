import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatList } from './components/ChatList';
import { ChatScreen } from './components/ChatScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { FloatingChatHead } from './components/FloatingChatHead';
import { CallModal } from './components/CallModal';
import { EncryptionInfoModal } from './components/EncryptionInfoModal';
import { AuthScreen } from './components/AuthScreen';
import { 
  getUsers, 
  getCurrentUserProfile, 
  createNewUser,
  logoutUser,
  getConversationsForUser,
  setAuthSession,
  getMessages
} from './services/chatService';
import { UserProfile, CallState } from './types';
import { ArrowLeft, MessageSquare, Plus, Lock, Phone } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // Modals & States
  const [isFloatingHeadActive, setIsFloatingHeadActive] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEncryptionInfoModal, setShowEncryptionInfoModal] = useState(false);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);

  // New Contact Form State
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addContactError, setAddContactError] = useState<string | null>(null);

  // Track last known message ID to detect new incoming SMS
  const lastKnownMsgIdRef = useRef<string | null>(null);

  // Request browser notification permission if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Check for new incoming messages and trigger Floating Chat Head
  const checkNewIncomingMessages = (currUser: UserProfile, loadedUsers: UserProfile[]) => {
    const allMsgs = getMessages();
    const myIncomingMsgs = allMsgs.filter((m) => m.receiverId === currUser.uid && m.senderId !== currUser.uid);

    if (myIncomingMsgs.length > 0) {
      const latest = myIncomingMsgs[myIncomingMsgs.length - 1];

      if (lastKnownMsgIdRef.current && latest.id !== lastKnownMsgIdRef.current) {
        // A brand new SMS has arrived! Automatically activate Chat Head & select partner
        setIsFloatingHeadActive(true);
        setSelectedPartnerId(latest.senderId);

        // Send a browser desktop notification if app is hidden/minimized or in background
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const sender = loadedUsers.find((u) => u.uid === latest.senderId);
          const senderName = sender ? sender.displayName : 'Messenger';
          try {
            new Notification(senderName, {
              body: lang === 'bn' ? 'নতুন মেসেজ এসেছে (চ্যাট হেডে দেখুন)' : 'New SMS received (view in Chat Head)',
              icon: sender?.photoURL || '/icon.png',
            });
          } catch {
            // ignore notification error
          }
        }
      }
      lastKnownMsgIdRef.current = latest.id;
    }
  };

  // Load state on mount & listen to real-time events
  const loadData = () => {
    const loadedUsers = getUsers();
    const currUser = getCurrentUserProfile();
    setUsers(loadedUsers);
    setCurrentUser(currUser);

    if (currUser) {
      checkNewIncomingMessages(currUser, loadedUsers);

      if (selectedPartnerId && !loadedUsers.some((u) => u.uid === selectedPartnerId)) {
        setSelectedPartnerId(null);
      }
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    // Auto show Chat Head when user minimizes or switches away from the app
    const handleAppMinimized = () => {
      const currUser = getCurrentUserProfile();
      if (currUser && document.hidden) {
        setIsFloatingHeadActive(true);
      }
    };

    window.addEventListener('e2ee_messenger_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    document.addEventListener('visibilitychange', handleAppMinimized);
    window.addEventListener('blur', handleAppMinimized);

    return () => {
      window.removeEventListener('e2ee_messenger_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleAppMinimized);
      window.removeEventListener('blur', handleAppMinimized);
    };
  }, [lang]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    loadData();
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setSelectedPartnerId(null);
  };

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        lang={lang}
        onToggleLang={() => setLang(lang === 'bn' ? 'en' : 'bn')}
      />
    );
  }

  const selectedPartner = users.find((u) => u.uid === selectedPartnerId) || null;

  const handleSwitchUser = (uid: string) => {
    setAuthSession(uid);
    const updatedUser = users.find((u) => u.uid === uid) || null;
    setCurrentUser(updatedUser);

    const otherPartner = users.find((u) => u.uid !== uid);
    if (otherPartner) {
      setSelectedPartnerId(otherPartner.uid);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setAddContactError(null);
    const cleanPhone = newContactPhone.replace(/[\s-]/g, '').trim();

    if (!cleanPhone) {
      setAddContactError(
        lang === 'bn'
          ? 'অনুগ্রহ করে একটি ফোন নাম্বার প্রদান করুন।'
          : 'Please enter a phone number.'
      );
      return;
    }

    if (cleanPhone.length < 5) {
      setAddContactError(
        lang === 'bn'
          ? 'ফোন নাম্বারটি অন্তত ৫ সংখ্যার হতে হবে।'
          : 'Phone number must be at least 5 digits.'
      );
      return;
    }

    // Check if adding own number
    const currentPhoneClean = (currentUser?.phone || '').replace(/[\s-]/g, '').trim();
    if (currentPhoneClean && currentPhoneClean === cleanPhone) {
      setAddContactError(
        lang === 'bn'
          ? 'আপনি আপনার নিজের ফোনে বার্তা পাঠাতে পারবেন না।'
          : 'You cannot add your own phone number.'
      );
      return;
    }

    // Check if user with this phone number exists
    const normalizePhone = (p: string) => p.replace(/[\s\-\+\(\)]/g, '').replace(/^88/, '');
    const searchNorm = normalizePhone(cleanPhone);

    const loadedUsers = getUsers();
    const existingUser = loadedUsers.find((u) => {
      const uNorm = normalizePhone(u.phone || '');
      return uNorm && (uNorm === searchNorm || uNorm.endsWith(searchNorm) || searchNorm.endsWith(uNorm));
    });

    if (existingUser) {
      setSelectedPartnerId(existingUser.uid);
      setNewContactPhone('');
      setAddContactError(null);
      setShowAddContactModal(false);
    } else {
      setAddContactError(
        lang === 'bn'
          ? 'এই নাম্বারে কোনো আইডি খোলা নেই।'
          : 'No account exists with this phone number.'
      );
    }
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (selectedPartner) {
      setActiveCall({
        active: true,
        type,
        partnerId: selectedPartner.uid,
        status: 'calling',
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 overflow-hidden select-none">
      {/* Top Header - Only shown when no active chat is selected */}
      {!selectedPartnerId && (
        <Header
          currentUser={currentUser}
          lang={lang}
          onToggleLang={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenAddContact={() => setShowAddContactModal(true)}
          isFloatingHeadActive={isFloatingHeadActive}
          onToggleFloatingHead={() => setIsFloatingHeadActive(!isFloatingHeadActive)}
          onOpenEncryptionInfo={() => setShowEncryptionInfoModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative bg-black">
        {/* Left Contact List (Shown when no chat is selected) */}
        {!selectedPartnerId ? (
          <div className="w-full h-full">
            <ChatList
              users={users}
              currentUser={currentUser}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={(partnerId) => setSelectedPartnerId(partnerId)}
              onOpenAddContact={() => setShowAddContactModal(true)}
              lang={lang}
            />
          </div>
        ) : (
          /* Fullscreen Chat Screen when a partner is selected */
          <div className="w-full h-full flex-1">
            {selectedPartner && (
              <ChatScreen
                currentUser={currentUser}
                partner={selectedPartner}
                onStartCall={handleStartCall}
                onBack={() => setSelectedPartnerId(null)}
                onOpenFloatingHead={() => setIsFloatingHeadActive(true)}
                lang={lang}
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Head Mode */}
      {isFloatingHeadActive && (
        <FloatingChatHead
          currentUser={currentUser}
          partners={users.filter((u) => u.uid !== currentUser.uid)}
          selectedPartner={selectedPartner}
          onSelectPartner={(pid) => setSelectedPartnerId(pid)}
          onCloseFloatingHead={() => setIsFloatingHeadActive(false)}
          lang={lang}
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
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
          onClose={() => setShowEncryptionInfoModal(false)}
          lang={lang}
        />
      )}

      {/* Add New Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-fadeIn relative">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                {lang === 'bn' ? 'নতুন কন্টাক্ট যোগ করুন' : 'Add New Contact'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddContactModal(false);
                  setAddContactError(null);
                  setNewContactPhone('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'যার সাথে চ্যাট করতে চান তার ফোন নাম্বারটি নিচে প্রদান করুন:'
                : 'Enter the phone number of the person you want to chat with:'}
            </p>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  {lang === 'bn' ? 'ফোন নাম্বার' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => {
                    setNewContactPhone(e.target.value);
                    if (addContactError) setAddContactError(null);
                  }}
                  placeholder={lang === 'bn' ? 'যেমন: 01700000000' : 'e.g. 01700000000'}
                  autoFocus
                  required
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wide"
                />
              </div>

              {addContactError && (
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 text-red-200 text-xs rounded-xl flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{addContactError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 text-[11px] text-slate-400 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
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
                    setShowAddContactModal(false);
                    setAddContactError(null);
                    setNewContactPhone('');
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'চ্যাট শুরু করুন' : 'Start Chat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {activeCall && selectedPartner && (
        <CallModal
          partner={selectedPartner}
          type={activeCall.type || 'audio'}
          onEndCall={() => setActiveCall(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
