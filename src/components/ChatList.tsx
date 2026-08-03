import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  UserPlus, 
  ShieldAlert, 
  CheckCheck, 
  Image as ImageIcon, 
  Mic, 
  Lock,
  MessageCircle,
  Clock,
  Users,
  Phone,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';
import { getLastMessage, getUnreadCount, getConversationsForUser, createNewUser, deleteConversation, deleteUser } from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';

interface ChatListProps {
  users: UserProfile[];
  currentUser: UserProfile;
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
  onOpenAddContact: () => void;
  lang: 'bn' | 'en';
}

export const ChatList: React.FC<ChatListProps> = ({
  users,
  currentUser,
  selectedPartnerId,
  onSelectPartner,
  onOpenAddContact,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my_chats' | 'all_users'>('my_chats');

  // Long press & Delete conversation states
  const [partnerToDelete, setPartnerToDelete] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (partner: UserProfile) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setPartnerToDelete(partner);
      setShowDeleteModal(true);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmDeleteConversation = () => {
    if (partnerToDelete) {
      deleteConversation(currentUser.uid, partnerToDelete.uid);
      deleteUser(partnerToDelete.uid);
      if (selectedPartnerId === partnerToDelete.uid) {
        onSelectPartner('');
      }
      setPartnerToDelete(null);
      setShowDeleteModal(false);
    }
  };

  // Active conversations for the logged in user with reactive updates
  const [myConversations, setMyConversations] = useState<UserProfile[]>(() =>
    getConversationsForUser(currentUser.uid)
  );

  useEffect(() => {
    const syncConversations = () => {
      setMyConversations(getConversationsForUser(currentUser.uid));
    };
    syncConversations();

    window.addEventListener('e2ee_messenger_updated', syncConversations);
    window.addEventListener('storage', syncConversations);

    const channel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel('e2ee_messenger_sync')
        : null;

    if (channel) {
      channel.addEventListener('message', syncConversations);
    }

    return () => {
      window.removeEventListener('e2ee_messenger_updated', syncConversations);
      window.removeEventListener('storage', syncConversations);
      if (channel) {
        channel.removeEventListener('message', syncConversations);
        channel.close();
      }
    };
  }, [currentUser.uid]);

  // Other users in directory
  const otherUsers = users.filter((u) => u.uid !== currentUser.uid);

  // Determine list based on tab or search
  let displayUsers: UserProfile[] = [];

  if (searchTerm.trim()) {
    // Search across all users by name, phone (cleaned), or email
    const term = searchTerm.toLowerCase().trim();
    const termClean = term.replace(/[\s-]/g, '');

    displayUsers = otherUsers.filter((u) => {
      const uPhoneClean = (u.phone || '').replace(/[\s-]/g, '');
      const nameMatch = (u.displayName || '').toLowerCase().includes(term);
      const phoneMatch = termClean.length > 0 && uPhoneClean.includes(termClean);
      const emailMatch = (u.email || '').toLowerCase().includes(term);
      return nameMatch || phoneMatch || emailMatch;
    });
  } else if (activeTab === 'my_chats') {
    displayUsers = myConversations;
  } else {
    displayUsers = otherUsers;
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Header & Tabs */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            {lang === 'bn' ? 'বার্তা ও ইনবক্স' : 'Messages & Inbox'}
          </h2>
          <button
            onClick={onOpenAddContact}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'যোগ করুন' : 'Add New'}
          </button>
        </div>

        {/* My Chats vs All Users Filter Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('my_chats')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'my_chats' && !searchTerm.trim()
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            <span>{lang === 'bn' ? `আমার ইনবক্স (${myConversations.length})` : `My Inbox (${myConversations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('all_users')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'all_users' || searchTerm.trim()
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>{lang === 'bn' ? 'সকল ব্যবহারকারী' : 'All Users'}</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'নাম বা ফোন নাম্বার দিয়ে খুঁজুন...'
                : 'Search name or phone number...'
            }
            className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* User Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {displayUsers.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-3">
            <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto opacity-60" />
            <div>
              <p className="font-semibold text-slate-300">
                {activeTab === 'my_chats' && !searchTerm
                  ? (lang === 'bn' ? 'আপনার ইনবক্সে কোনো চ্যাট নেই' : 'No active chats in your inbox')
                  : (lang === 'bn' ? 'এই নাম্বারে কোনো আইডি বা অ্যাকাউন্ট খোলা নেই' : 'No account found with this phone number')}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 max-w-xs mx-auto">
                {activeTab === 'my_chats' && !searchTerm
                  ? (lang === 'bn'
                      ? '"সকল ব্যবহারকারী" ট্যাবে যান অথবা নিবন্ধিত নাম/ফোন নাম্বার দিয়ে সার্চ করুন।'
                      : 'Switch to "All Users" tab or search registered name/phone number.')
                  : (lang === 'bn'
                      ? 'ফোন নাম্বারটি পুনঃনিরীক্ষা করুন। ব্যবহারকারী এই অ্যাপে নিবন্ধিত থাকলে তবেই চ্যাট সম্ভব।'
                      : 'Please check the phone number. Chat is only available with registered accounts.')}
              </p>
            </div>

            {activeTab === 'my_chats' && !searchTerm && (
              <button
                onClick={() => setActiveTab('all_users')}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'সকল ব্যবহারকারী ডিরেক্টরি দেখুন' : 'Explore All Users Directory'}
              </button>
            )}
          </div>
        ) : (
          displayUsers.map((partner) => {
            const isSelected = partner.uid === selectedPartnerId;
            const lastMsg = getLastMessage(currentUser.uid, partner.uid);
            const unreadCount = getUnreadCount(currentUser.uid, partner.uid);

            let lastMsgText = '';
            if (lastMsg) {
              if (lastMsg.isDeletedForEveryone) {
                lastMsgText = lang === 'bn' ? '🚫 মেসেজটি রিমুভ করা হয়েছে' : '🚫 Message removed';
              } else if (lastMsg.type === 'image') {
                lastMsgText = lang === 'bn' ? '📷 ছবি' : '📷 Image';
              } else if (lastMsg.type === 'voice') {
                lastMsgText = lang === 'bn' ? '🎙️ ভয়েস মেসেজ' : '🎙️ Voice message';
              } else if (lastMsg.text) {
                // Decrypt snippet
                const decrypted = decryptMessage(
                  lastMsg.text,
                  lastMsg.senderId === currentUser.uid ? partner.publicKey : partner.publicKey,
                  currentUser.secretKey
                );
                lastMsgText = decrypted || (lang === 'bn' ? '🔒 এনক্রিপ্টেড তথ্য' : '🔒 Encrypted message');
              }
            }

            return (
              <div key={partner.uid} className="relative group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPartner(partner.uid)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectPartner(partner.uid);
                    }
                  }}
                  onTouchStart={() => startLongPress(partner)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onMouseDown={() => startLongPress(partner)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPartnerToDelete(partner);
                    setShowDeleteModal(true);
                  }}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left relative select-none cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-l-4 border-blue-500'
                      : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  {/* User Avatar with status dot */}
                  <div className="relative shrink-0">
                    <img
                      src={partner.photoURL}
                      alt={partner.displayName}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-700/60"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                        partner.status === 'online'
                          ? 'bg-emerald-500'
                          : partner.status === 'away'
                          ? 'bg-amber-500'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Info & Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                        {partner.displayName}
                      </h3>
                      {lastMsg ? (
                        <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(lastMsg.timestamp)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5 shrink-0">
                          <Phone className="w-2.5 h-2.5 text-blue-400" />
                          {partner.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-slate-400 truncate pr-2 flex items-center gap-1">
                        {lastMsg ? (
                          <>
                            {lastMsg.senderId === currentUser.uid && (
                              <CheckCheck className={`w-3 h-3 ${lastMsg.read ? 'text-blue-400' : 'text-slate-500'}`} />
                            )}
                            <span className="truncate">{lastMsgText}</span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-emerald-500" />
                            {lang === 'bn' ? `ফোন: ${partner.phone}` : `Phone: ${partner.phone}`}
                          </span>
                        )}
                      </p>

                      {/* Unread badge */}
                      {unreadCount > 0 && (
                        <span className="shrink-0 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button on hover / long-press target */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPartnerToDelete(partner);
                      setShowDeleteModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all shrink-0"
                    title={lang === 'bn' ? 'চ্যাট মুছে ফেলুন' : 'Delete Chat'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Chat Confirmation Modal */}
      {showDeleteModal && partnerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'ব্যবহারকারী ও চ্যাট মুছে ফেলতে চান?' : 'Delete User & Chat?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'bn'
                  ? `${partnerToDelete.displayName}-কে সকল ব্যবহারকারী তালিকা ও ইনবক্স থেকে স্থায়ীভাবে মুছে ফেলা হবে।`
                  : `${partnerToDelete.displayName} and all conversation history will be permanently deleted from all users.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPartnerToDelete(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDeleteConversation}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20"
              >
                {lang === 'bn' ? 'ডিলেট করুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
