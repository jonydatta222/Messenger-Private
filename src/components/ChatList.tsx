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
  AlertTriangle,
  Plus
} from 'lucide-react';
import { UserProfile, Group } from '../types';
import { 
  getLastMessage, 
  getUnreadCount, 
  getConversationsForUser, 
  createNewUser, 
  deleteConversation, 
  deleteUser,
  getGroupsForUser,
  getLastGroupMessage,
  getUnreadGroupCount,
  deleteGroup,
  isUserOnline
} from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';

interface ChatListProps {
  users: UserProfile[];
  currentUser: UserProfile;
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string) => void;
  onOpenAddContact: () => void;
  onOpenCreateGroup?: () => void;
  lang: 'bn' | 'en';
}

export const ChatList: React.FC<ChatListProps> = ({
  users,
  currentUser,
  selectedPartnerId,
  onSelectPartner,
  selectedGroupId,
  onSelectGroup,
  onOpenAddContact,
  onOpenCreateGroup,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my_chats' | 'groups'>('my_chats');

  // Real-time Typing Map state
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleTyping = (e: any) => {
      if (e.detail && e.detail.receiverId === currentUser.uid) {
        setTypingMap((prev) => ({
          ...prev,
          [e.detail.senderId]: Boolean(e.detail.isTyping),
        }));
      }
    };
    window.addEventListener('e2ee_messenger_typing', handleTyping);
    return () => {
      window.removeEventListener('e2ee_messenger_typing', handleTyping);
    };
  }, [currentUser.uid]);

  // Long press & Delete states
  const [partnerToDelete, setPartnerToDelete] = useState<UserProfile | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false);
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
      if (selectedPartnerId === partnerToDelete.uid) {
        onSelectPartner('');
      }
      setPartnerToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleConfirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroup(groupToDelete.id);
      if (selectedGroupId === groupToDelete.id && onSelectGroup) {
        onSelectGroup('');
      }
      setGroupToDelete(null);
      setShowGroupDeleteModal(false);
    }
  };

  // Active conversations for the logged in user with reactive updates
  const [myConversations, setMyConversations] = useState<UserProfile[]>(() =>
    getConversationsForUser(currentUser.uid)
  );

  // Groups for current user
  const [myGroups, setMyGroups] = useState<Group[]>(() =>
    getGroupsForUser(currentUser.uid)
  );

  useEffect(() => {
    const syncData = () => {
      setMyConversations(getConversationsForUser(currentUser.uid));
      setMyGroups(getGroupsForUser(currentUser.uid));
    };
    syncData();

    window.addEventListener('e2ee_messenger_updated', syncData);
    window.addEventListener('storage', syncData);

    const channel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel('e2ee_messenger_sync')
        : null;

    if (channel) {
      channel.addEventListener('message', syncData);
    }

    return () => {
      window.removeEventListener('e2ee_messenger_updated', syncData);
      window.removeEventListener('storage', syncData);
      if (channel) {
        channel.removeEventListener('message', syncData);
        channel.close();
      }
    };
  }, [currentUser.uid]);

  // Other users in directory
  const otherUsers = users.filter((u) => u.uid !== currentUser.uid);

  // Determine user conversations or filtered groups based on tab and search
  let displayUsers: UserProfile[] = [];
  let displayGroups: Group[] = [];

  if (activeTab === 'groups') {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      displayGroups = myGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          (g.description || '').toLowerCase().includes(term)
      );
    } else {
      displayGroups = myGroups;
    }
  } else {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const termClean = term.replace(/[\s-]/g, '');

      displayUsers = otherUsers.filter((u) => {
        const uPhoneClean = (u.phone || '').replace(/[\s-]/g, '');
        const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
        const uUid = (u.uid || '').toLowerCase();
        const nameMatch = (u.displayName || '').toLowerCase().includes(term);
        const uidMatch = uUid.includes(term);
        const phoneMatch = termClean.length > 0 && (uPhoneClean.includes(termClean) || uPhoneDigits.includes(termClean));
        const emailMatch = (u.email || '').toLowerCase().includes(term);
        return nameMatch || uidMatch || phoneMatch || emailMatch;
      });
    } else {
      displayUsers = myConversations;
    }
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
    <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full select-none transition-colors">
      {/* Header & Tabs */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-orange-500" />
            {lang === 'bn' ? 'বার্তা ও গ্রুপ' : 'Messages & Groups'}
          </h2>
          <button
            onClick={activeTab === 'groups' ? onOpenCreateGroup : onOpenAddContact}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 border border-orange-200 dark:border-slate-700 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
          >
            {activeTab === 'groups' ? <Users className="w-3.5 h-3.5 text-orange-500" /> : <UserPlus className="w-3.5 h-3.5 text-orange-500" />}
            {activeTab === 'groups'
              ? (lang === 'bn' ? 'গ্রুপ তৈরি' : 'New Group')
              : (lang === 'bn' ? 'যোগ করুন' : 'Add Contact')}
          </button>
        </div>

        {/* My Chats vs Groups Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('my_chats')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'my_chats'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'bn' ? `ইনবক্স (${myConversations.length})` : `Inbox (${myConversations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'bn' ? `গ্রুপ (${myGroups.length})` : `Groups (${myGroups.length})`}</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'groups'
                ? (lang === 'bn' ? 'গ্রুপের নাম দিয়ে খুঁজুন...' : 'Search group name...')
                : (lang === 'bn' ? 'নাম বা ফোন নাম্বার দিয়ে খুঁজুন...' : 'Search name or phone number...')
            }
            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Main List Rendering */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {/* GROUPS TAB CONTENT */}
        {activeTab === 'groups' ? (
          <div>
            {/* Create New Group Banner Button */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                onClick={onOpenCreateGroup}
                className="w-full py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/50 rounded-2xl text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="p-1.5 bg-blue-600 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span>{lang === 'bn' ? 'নতুন গ্রুপ তৈরি করুন' : 'Create New Group'}</span>
              </button>
            </div>

            {displayGroups.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3">
                <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto opacity-50" />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'কোন গ্রুপ পাওয়া যায়নি' : 'No groups found'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {lang === 'bn'
                      ? 'নতুন গ্রুপ তৈরি করে বন্ধু ও সহকর্মীদের সাথে একসাথে কথা বলুন।'
                      : 'Create a new group to chat with multiple friends and colleagues together.'}
                  </p>
                </div>
              </div>
            ) : (
              displayGroups.map((group) => {
                const isSelected = group.id === selectedGroupId;
                const lastMsg = getLastGroupMessage(group.id);
                const memberCount = group.members.length > 0 ? group.members.length : users.length;

                let lastMsgText = '';
                if (lastMsg) {
                  const sender = users.find((u) => u.uid === lastMsg.senderId);
                  const senderName = sender ? sender.displayName : 'Member';
                  if (lastMsg.isDeletedForEveryone) {
                    lastMsgText = `${senderName}: ${lang === 'bn' ? '🚫 মেসেজটি রিমুভ করা হয়েছে' : '🚫 Message removed'}`;
                  } else if (lastMsg.type === 'image') {
                    lastMsgText = `${senderName}: 📷 ${lang === 'bn' ? 'ছবি' : 'Image'}`;
                  } else if (lastMsg.type === 'voice') {
                    lastMsgText = `${senderName}: 🎙️ ${lang === 'bn' ? 'ভয়েস' : 'Voice'}`;
                  } else {
                    lastMsgText = `${senderName}: ${lastMsg.text || ''}`;
                  }
                } else {
                  lastMsgText = group.description || (lang === 'bn' ? 'গ্রুপ চ্যাটরুম' : 'Group Chatroom');
                }

                return (
                  <div key={group.id} className="relative group">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectGroup && onSelectGroup(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectGroup && onSelectGroup(group.id);
                        }
                      }}
                      className={`w-full p-3 flex items-center gap-3 transition-colors text-left select-none cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-slate-800 border-l-4 border-orange-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Group Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={group.photoURL || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
                          alt={group.name}
                          className="w-11 h-11 rounded-2xl object-cover ring-2 ring-orange-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900">
                          {memberCount}
                        </span>
                      </div>

                      {/* Group Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 flex items-center gap-1.5">
                            {group.name}
                          </h3>
                          {lastMsg && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(lastMsg.timestamp)}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">
                          {lastMsgText}
                        </p>
                      </div>

                      {/* Delete / Leave Group Option */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupToDelete(group);
                          setShowGroupDeleteModal(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0 cursor-pointer"
                        title={lang === 'bn' ? 'গ্রুপ মুছে ফেলুন' : 'Delete Group'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* DIRECT MESSAGES INBOX TAB CONTENT */
          displayUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3">
              <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto opacity-60" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'bn' ? 'আপনার ইনবক্সে কোনো চ্যাট নেই' : 'No active chats in your inbox'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {lang === 'bn'
                    ? 'উপরে "যোগ করুন" বাটনে ক্লিক করে নিবন্ধিত ফোন নাম্বার দিয়ে চ্যাট শুরু করুন।'
                    : 'Click "Add Contact" above to start a chat with any registered phone number.'}
                </p>
              </div>
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
                } else if (lastMsg.type === 'call' || lastMsg.callInfo) {
                  const isVideo = lastMsg.callInfo?.type === 'video';
                  const status = lastMsg.callInfo?.status;
                  const cLabel = isVideo ? (lang === 'bn' ? 'ভিডিও কল' : 'Video call') : (lang === 'bn' ? 'অডিও কল' : 'Audio call');
                  if (status === 'missed') {
                    lastMsgText = `📞 ${lang === 'bn' ? 'মিসড' : 'Missed'} ${cLabel}`;
                  } else if (status === 'declined') {
                    lastMsgText = `📞 ${cLabel} ${lang === 'bn' ? 'প্রত্যাখ্যাত' : 'declined'}`;
                  } else {
                    lastMsgText = `📞 ${cLabel}`;
                  }
                } else if (lastMsg.text) {
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
                        ? 'bg-orange-50 dark:bg-slate-800 border-l-4 border-orange-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                    }`}
                  >
                    {/* User Avatar with status dot */}
                    <div className="relative shrink-0">
                      <img
                        src={partner.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={partner.displayName}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-orange-200 dark:ring-slate-700"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          isUserOnline(partner)
                            ? 'bg-emerald-500'
                            : partner.status === 'away'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    {/* Info & Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400">
                          {partner.displayName}
                        </h3>
                        {lastMsg ? (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-0.5 shrink-0">
                            <Phone className="w-2.5 h-2.5 text-orange-500" />
                            {partner.phone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {typingMap[partner.uid] ? (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate pr-2 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span>{lang === 'bn' ? 'typing...' : 'typing...'}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pr-2 flex items-center gap-1 font-medium">
                            {lastMsg ? (
                              <>
                                {lastMsg.senderId === currentUser.uid && (
                                  <CheckCheck className={`w-3.5 h-3.5 shrink-0 ${lastMsg.read ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                )}
                                {lastMsg.senderId === currentUser.uid && lastMsg.read && (
                                  <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/70 px-1 py-0.2 rounded border border-sky-200 dark:border-sky-800 shrink-0">
                                    Seen
                                  </span>
                                )}
                                <span className="truncate">{lastMsgText}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-emerald-500" />
                                {lang === 'bn' ? `ফোন: ${partner.phone}` : `Phone: ${partner.phone}`}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Unread badge */}
                        {unreadCount > 0 && (
                          <span className="shrink-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-2xs">
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0 cursor-pointer"
                      title={lang === 'bn' ? 'চ্যাট মুছে ফেলুন' : 'Delete Chat'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Delete Direct User Confirmation Modal */}
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
                  ? `${partnerToDelete.displayName}-কে তালিকা থেকে মুছে ফেলা হবে।`
                  : `${partnerToDelete.displayName} and conversation history will be deleted.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPartnerToDelete(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDeleteConversation}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {lang === 'bn' ? 'ডিলেট করুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showGroupDeleteModal && groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'গ্রুপটি মুছে ফেলতে চান?' : 'Delete Group?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'bn'
                  ? `"${groupToDelete.name}" এবং এর সমস্ত মেসেজ স্থায়ীভাবে মুছে ফেলা হবে।`
                  : `"${groupToDelete.name}" and all group messages will be deleted.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowGroupDeleteModal(false);
                  setGroupToDelete(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDeleteGroup}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
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

