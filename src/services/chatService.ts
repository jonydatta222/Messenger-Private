import { Message, UserProfile, Group } from '../types';
import { generateKeyPair, encryptMessage } from './encryptionService';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_MESSAGES_KEY = 'e2ee_messenger_messages';
const STORAGE_USERS_KEY = 'e2ee_messenger_users';
const STORAGE_AUTH_SESSION_KEY = 'e2ee_messenger_auth_session_uid';
const STORAGE_GROUPS_KEY = 'e2ee_messenger_groups';

export const DEFAULT_USERS: UserProfile[] = [];
const DEMO_UIDS = ['user_mehedi', 'user_sadia', 'user_tanvir', 'user_nusrat', 'user_joni', 'joni'];

// Local Cache In-Memory & LocalStorage getters/setters
export const getUsers = (): UserProfile[] => {
  const stored = localStorage.getItem(STORAGE_USERS_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed: UserProfile[] = JSON.parse(stored);
    const cleanUsers = parsed.filter(
      (u) =>
        !DEMO_UIDS.includes(u.uid) &&
        u.displayName?.toLowerCase() !== 'joni' &&
        !u.uid.toLowerCase().includes('joni')
    );
    return cleanUsers;
  } catch {
    return [];
  }
};

const saveUsersLocally = (users: UserProfile[]) => {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  broadcastChange();
};

export const getMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [];
};

const saveMessagesLocally = (messages: Message[]) => {
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
  broadcastChange();
};

export const getGroups = (): Group[] => {
  const stored = localStorage.getItem(STORAGE_GROUPS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return [];
};

const saveGroupsLocally = (groups: Group[]) => {
  localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(groups));
  broadcastChange();
};

// Auth session methods
export const getAuthSession = (): string | null => {
  return localStorage.getItem(STORAGE_AUTH_SESSION_KEY);
};

export const setAuthSession = (uid: string | null) => {
  if (uid) {
    localStorage.setItem(STORAGE_AUTH_SESSION_KEY, uid);
  } else {
    localStorage.removeItem(STORAGE_AUTH_SESSION_KEY);
  }
  broadcastChange();
};

export const getCurrentUserId = (): string | null => {
  return getAuthSession();
};

export const getCurrentUserProfile = (): UserProfile | null => {
  const uid = getAuthSession();
  if (!uid) return null;
  const users = getUsers();
  return users.find((u) => u.uid === uid) || null;
};

// Broadcast Channel & Window Events for UI reactivity
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('e2ee_messenger_sync')
  : null;

const broadcastChange = () => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'SYNC_MESSAGES', timestamp: Date.now() });
  }
  window.dispatchEvent(new CustomEvent('e2ee_messenger_updated'));
};

// ==================== FIRESTORE REAL-TIME SYNC ENGINE ====================

let isFirestoreInitialized = false;

export const initFirestoreSync = () => {
  if (isFirestoreInitialized) return;
  isFirestoreInitialized = true;

  // Real-time listener for Users collection
  onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const remoteUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        remoteUsers.push(docSnap.data() as UserProfile);
      });

      if (remoteUsers.length > 0) {
        const localUsers = getUsers();
        // Merge local & remote users by UID (remote takes precedence)
        const userMap = new Map<string, UserProfile>();
        localUsers.forEach((u) => userMap.set(u.uid, u));
        remoteUsers.forEach((u) => userMap.set(u.uid, u));

        const mergedUsers = Array.from(userMap.values()).filter(
          (u) => !DEMO_UIDS.includes(u.uid)
        );
        saveUsersLocally(mergedUsers);
      }
    },
    (error) => {
      console.warn('Firestore Users snapshot error:', error);
    }
  );

  // Real-time listener for Messages collection
  onSnapshot(
    collection(db, 'messages'),
    (snapshot) => {
      const remoteMsgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        remoteMsgs.push(docSnap.data() as Message);
      });

      if (remoteMsgs.length > 0) {
        const localMsgs = getMessages();
        const msgMap = new Map<string, Message>();
        localMsgs.forEach((m) => msgMap.set(m.id, m));
        remoteMsgs.forEach((m) => msgMap.set(m.id, m));

        const mergedMsgs = Array.from(msgMap.values());
        saveMessagesLocally(mergedMsgs);
      }
    },
    (error) => {
      console.warn('Firestore Messages snapshot error:', error);
    }
  );

  // Real-time listener for Groups collection
  onSnapshot(
    collection(db, 'groups'),
    (snapshot) => {
      const remoteGroups: Group[] = [];
      snapshot.forEach((docSnap) => {
        remoteGroups.push(docSnap.data() as Group);
      });

      if (remoteGroups.length > 0) {
        const localGroups = getGroups();
        const groupMap = new Map<string, Group>();
        localGroups.forEach((g) => groupMap.set(g.id, g));
        remoteGroups.forEach((g) => groupMap.set(g.id, g));

        const mergedGroups = Array.from(groupMap.values());
        saveGroupsLocally(mergedGroups);
      }
    },
    (error) => {
      console.warn('Firestore Groups snapshot error:', error);
    }
  );
};

// Manual full fetch from Firestore
export const fetchAllFromFirestore = async () => {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const remoteUsers: UserProfile[] = [];
    usersSnap.forEach((d) => remoteUsers.push(d.data() as UserProfile));
    if (remoteUsers.length > 0) {
      saveUsersLocally(remoteUsers);
    }

    const msgsSnap = await getDocs(collection(db, 'messages'));
    const remoteMsgs: Message[] = [];
    msgsSnap.forEach((d) => remoteMsgs.push(d.data() as Message));
    if (remoteMsgs.length > 0) {
      saveMessagesLocally(remoteMsgs);
    }

    const groupsSnap = await getDocs(collection(db, 'groups'));
    const remoteGroups: Group[] = [];
    groupsSnap.forEach((d) => remoteGroups.push(d.data() as Group));
    if (remoteGroups.length > 0) {
      saveGroupsLocally(remoteGroups);
    }
  } catch (err) {
    console.error('Failed to sync from Firestore:', err);
  }
};

// Initialize listeners on module load
if (typeof window !== 'undefined') {
  initFirestoreSync();
}

// ==================== AUTHENTICATION SERVICES ====================

// Sign Up User
export const signUpUser = async (
  phone: string,
  password: string,
  displayName: string,
  email?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  try {
    const cleanPhone = (phone || '').replace(/[\s-]/g, '').trim();
    if (!cleanPhone) {
      return { success: false, error: 'বৈধ ফোন নাম্বার টাইপ করুন (Please enter a valid phone number)' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে (Password must be at least 4 characters)' };
    }
    if (!displayName || !displayName.trim()) {
      return { success: false, error: 'আপনার নাম প্রদান করুন (Please enter your name)' };
    }

    // Check existing phone in Firestore
    const q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
    }

    // Also check local cache fallback
    const localUsers = getUsers();
    const existingLocal = localUsers.find((u) => (u.phone || '').replace(/[\s-]/g, '') === cleanPhone);
    if (existingLocal) {
      return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
    }

    const keys = generateKeyPair();
    const newUser: UserProfile = {
      uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: cleanPhone,
      password,
      displayName: displayName.trim(),
      email: email?.trim() || `${cleanPhone}@messenger.app`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName.trim())}`,
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
      createdAt: Date.now(),
      status: 'online',
      bio: '🔐 E2EE Secured Messenger User',
    };

    // Save to Firestore permanently
    await setDoc(doc(db, 'users', newUser.uid), newUser);

    // Save locally & set session
    localUsers.push(newUser);
    saveUsersLocally(localUsers);
    setAuthSession(newUser.uid);

    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Sign up error:', err);
    return { success: false, error: err?.message || 'সাইন আপে সমস্যা হয়েছে। আবার চেষ্টা করুন।' };
  }
};

// Login User
export const loginUser = async (
  phone: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  try {
    const cleanPhone = (phone || '').replace(/[\s-]/g, '').trim();

    // Query Firestore for this phone number first (ensures data restoration after uninstall!)
    let targetUser: UserProfile | null = null;
    try {
      const q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        targetUser = querySnap.docs[0].data() as UserProfile;
      }
    } catch (e) {
      console.warn('Firestore user search error, trying local cache:', e);
    }

    // Local fallback if Firestore fails or offline
    if (!targetUser) {
      const users = getUsers();
      targetUser = users.find((u) => (u.phone || '').replace(/[\s-]/g, '') === cleanPhone) || null;
    }

    if (!targetUser) {
      return { success: false, error: 'এই ফোন নাম্বারে কোন একাউন্ট পাওয়া যায়নি (Phone number not registered)' };
    }

    if (targetUser.password !== password) {
      return { success: false, error: 'ভুল পাসওয়ার্ড দিয়েছেন! আবার চেষ্টা করুন (Incorrect password)' };
    }

    // Save user locally & sync full history from Firestore
    const localUsers = getUsers();
    if (!localUsers.some((u) => u.uid === targetUser!.uid)) {
      localUsers.push(targetUser);
      saveUsersLocally(localUsers);
    }

    setAuthSession(targetUser.uid);

    // Trigger full Firestore sync so all past messages and groups are pulled in
    fetchAllFromFirestore();

    return { success: true, user: targetUser };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err?.message || 'লগইনে সমস্যা হয়েছে।' };
  }
};

// Logout
export const logoutUser = () => {
  setAuthSession(null);
};

// ==================== MESSAGING SERVICES ====================

// Send Text Message
export const sendTextMessage = async (
  senderId: string,
  receiverId: string,
  text: string,
  receiverPublicKey: string,
  myPrivateKey: string,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const encryptedText = encryptMessage(text, receiverPublicKey, myPrivateKey);

  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    text: encryptedText,
    timestamp: Date.now(),
    read: false,
    type: 'text',
    replyTo,
  };

  // Save to Firestore
  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error('Error writing message to Firestore:', e);
  }

  // Save locally
  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

// Send Image Message
export const sendImageMessage = async (
  senderId: string,
  receiverId: string,
  imageUrl: string,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const newMessage: Message = {
    id: `msg_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    imageUrl,
    timestamp: Date.now(),
    read: false,
    type: 'image',
    replyTo,
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error('Error writing image message to Firestore:', e);
  }

  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

// Send Voice Note Message
export const sendVoiceMessage = async (
  senderId: string,
  receiverId: string,
  audioUrl: string,
  duration: number,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const newMessage: Message = {
    id: `msg_audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    audioUrl,
    audioDuration: duration,
    timestamp: Date.now(),
    read: false,
    type: 'voice',
    replyTo,
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error('Error writing voice message to Firestore:', e);
  }

  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

// Mark Messages as Read
export const markMessagesAsRead = async (currentUserId: string, partnerId: string) => {
  const messages = getMessages();
  let updated = false;

  const updatedMessages = messages.map((msg) => {
    if (msg.senderId === partnerId && msg.receiverId === currentUserId && !msg.read) {
      updated = true;
      // Sync update to Firestore doc
      try {
        updateDoc(doc(db, 'messages', msg.id), { read: true }).catch(() => {});
      } catch {
        // ignore
      }
      return { ...msg, read: true };
    }
    return msg;
  });

  if (updated) {
    saveMessagesLocally(updatedMessages);
  }
};

// Create or Add New User Contact
export const createNewUser = (
  displayName: string,
  email: string,
  phone?: string,
  photoURL?: string
): UserProfile => {
  const users = getUsers();
  const keys = generateKeyPair();
  const cleanPhone = phone ? phone.replace(/[\s-]/g, '').trim() : `017${Math.floor(10000000 + Math.random() * 90000000)}`;
  const newUser: UserProfile = {
    uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    phone: cleanPhone,
    password: 'password123',
    displayName,
    email,
    photoURL: photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    createdAt: Date.now(),
    status: 'online',
    bio: '🔐 E2EE Secured Messenger User',
  };

  // Sync with Firestore
  setDoc(doc(db, 'users', newUser.uid), newUser).catch((e) => console.error(e));

  users.push(newUser);
  saveUsersLocally(users);
  return newUser;
};

// Get conversations list
export const getConversationsForUser = (currentUserId: string): UserProfile[] => {
  const allMessages = getMessages();
  const allUsers = getUsers();

  const partnerIds = new Set<string>();
  allMessages.forEach((m) => {
    if (m.deletedForUsers?.includes(currentUserId)) return;
    if (m.senderId === currentUserId && m.receiverId !== currentUserId) {
      partnerIds.add(m.receiverId);
    } else if (m.receiverId === currentUserId && m.senderId !== currentUserId) {
      partnerIds.add(m.senderId);
    }
  });

  let conversationUsers = allUsers.filter((u) => u.uid !== currentUserId && partnerIds.has(u.uid));

  conversationUsers.sort((a, b) => {
    const lastA = getLastMessage(currentUserId, a.uid);
    const lastB = getLastMessage(currentUserId, b.uid);
    const timeA = lastA ? lastA.timestamp : 0;
    const timeB = lastB ? lastB.timestamp : 0;
    return timeB - timeA;
  });

  return conversationUsers;
};

// Subscribe to real-time conversation messages
export const subscribeToMessages = (
  currentUserId: string,
  chatPartnerId: string,
  onMessagesUpdate: (messages: Message[]) => void
) => {
  const fetchAndFilter = () => {
    const allMessages = getMessages();
    const filtered = allMessages.filter(
      (m) =>
        !m.deletedForUsers?.includes(currentUserId) &&
        ((m.senderId === currentUserId && m.receiverId === chatPartnerId) ||
          (m.senderId === chatPartnerId && m.receiverId === currentUserId))
    );
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    onMessagesUpdate(filtered);
  };

  fetchAndFilter();

  const handleUpdate = () => {
    fetchAndFilter();
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleUpdate);
  }
  window.addEventListener('e2ee_messenger_updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleUpdate);
    }
    window.removeEventListener('e2ee_messenger_updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

// Update user profile info
export const updateUserProfile = (
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'password' | 'email' | 'photoURL' | 'bio'>>
): UserProfile | null => {
  const users = getUsers();
  const index = users.findIndex((u) => u.uid === uid);
  if (index === -1) return null;

  const updatedUser = {
    ...users[index],
    ...data,
  };

  users[index] = updatedUser;
  saveUsersLocally(users);

  // Sync to Firestore
  setDoc(doc(db, 'users', uid), updatedUser, { merge: true }).catch((e) => console.error(e));

  return updatedUser;
};

// Delete for me
export const deleteForMe = (messageId: string, userId: string) => {
  const messages = getMessages();
  const index = messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    const deletedFor = messages[index].deletedForUsers || [];
    if (!deletedFor.includes(userId)) {
      const updated = [...deletedFor, userId];
      messages[index].deletedForUsers = updated;
      saveMessagesLocally(messages);

      // Firestore sync
      updateDoc(doc(db, 'messages', messageId), { deletedForUsers: updated }).catch(() => {});
    }
  }
};

// Delete for everyone
export const deleteForEveryone = (messageId: string) => {
  const messages = getMessages();
  const index = messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    messages[index] = {
      ...messages[index],
      isDeletedForEveryone: true,
      text: undefined,
      imageUrl: undefined,
      audioUrl: undefined,
      replyTo: undefined,
    };
    saveMessagesLocally(messages);

    // Firestore sync
    setDoc(doc(db, 'messages', messageId), messages[index]).catch(() => {});
  }
};

export const deleteMessage = (messageId: string) => {
  deleteForEveryone(messageId);
};

// Edit text message
export const editTextMessage = (
  messageId: string,
  newText: string,
  receiverPublicKey: string,
  senderPrivateKey: string
) => {
  const messages = getMessages();
  const index = messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    const encryptedText = encryptMessage(newText, receiverPublicKey, senderPrivateKey);
    messages[index].text = encryptedText;
    messages[index].isEdited = true;
    saveMessagesLocally(messages);

    // Firestore sync
    updateDoc(doc(db, 'messages', messageId), { text: encryptedText, isEdited: true }).catch(() => {});
  }
};

// Delete conversation
export const deleteConversation = (currentUserId: string, partnerId: string) => {
  const messages = getMessages();
  const updated = messages.filter(
    (m) =>
      !((m.senderId === currentUserId && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === currentUserId))
  );
  saveMessagesLocally(updated);
};

// Delete user permanently
export const deleteUser = (userId: string) => {
  const users = getUsers();
  const updatedUsers = users.filter((u) => u.uid !== userId);
  saveUsersLocally(updatedUsers);

  // Firestore delete
  deleteDoc(doc(db, 'users', userId)).catch(() => {});

  const messages = getMessages();
  const updatedMessages = messages.filter(
    (m) => m.senderId !== userId && m.receiverId !== userId
  );
  saveMessagesLocally(updatedMessages);
};

// Calculate unread count
export const getUnreadCount = (currentUserId: string, partnerId: string): number => {
  const messages = getMessages();
  return messages.filter(
    (m) =>
      !m.deletedForUsers?.includes(currentUserId) &&
      m.senderId === partnerId &&
      m.receiverId === currentUserId &&
      !m.read
  ).length;
};

// Get last message
export const getLastMessage = (currentUserId: string, partnerId: string): Message | null => {
  const messages = getMessages();
  const filtered = messages.filter(
    (m) =>
      !m.deletedForUsers?.includes(currentUserId) &&
      ((m.senderId === currentUserId && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === currentUserId))
  );
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => b.timestamp - a.timestamp);
  return filtered[0];
};

// ==================== GROUP CHAT SERVICES ====================

export const createGroup = async (
  name: string,
  description: string,
  memberIds: string[],
  creatorId: string,
  photoURL?: string
): Promise<Group> => {
  const groups = getGroups();
  const allMembers = Array.from(new Set([...memberIds, creatorId]));

  const newGroup: Group = {
    id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: description.trim() || 'গ্রুপ চ্যাটরুম',
    photoURL: photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
    createdBy: creatorId,
    createdAt: Date.now(),
    members: allMembers,
  };

  // Firestore sync
  try {
    await setDoc(doc(db, 'groups', newGroup.id), newGroup);
  } catch (e) {
    console.error('Group write to firestore failed:', e);
  }

  groups.push(newGroup);
  saveGroupsLocally(groups);

  // System welcome message
  const welcomeMsg: Message = {
    id: `msg_sys_${Date.now()}`,
    senderId: creatorId,
    receiverId: newGroup.id,
    groupId: newGroup.id,
    text: `🎉 "${newGroup.name}" গ্রুপটি তৈরি করা হয়েছে।`,
    timestamp: Date.now(),
    read: true,
    type: 'text',
  };

  try {
    await setDoc(doc(db, 'messages', welcomeMsg.id), welcomeMsg);
  } catch (e) {
    console.error(e);
  }

  const messages = getMessages();
  messages.push(welcomeMsg);
  saveMessagesLocally(messages);

  return newGroup;
};

export const deleteGroup = (groupId: string) => {
  const groups = getGroups();
  const updated = groups.filter((g) => g.id !== groupId);
  saveGroupsLocally(updated);

  deleteDoc(doc(db, 'groups', groupId)).catch(() => {});

  const messages = getMessages();
  const updatedMessages = messages.filter((m) => m.groupId !== groupId && m.receiverId !== groupId);
  saveMessagesLocally(updatedMessages);
};

export const addMembersToGroup = (groupId: string, newMemberIds: string[]) => {
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx !== -1) {
    const updatedMembers = Array.from(new Set([...groups[idx].members, ...newMemberIds]));
    groups[idx].members = updatedMembers;
    saveGroupsLocally(groups);

    updateDoc(doc(db, 'groups', groupId), { members: updatedMembers }).catch(() => {});
  }
};

export const removeMemberFromGroup = (groupId: string, memberId: string) => {
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx !== -1) {
    const updatedMembers = groups[idx].members.filter((m) => m !== memberId);
    groups[idx].members = updatedMembers;
    saveGroupsLocally(groups);

    updateDoc(doc(db, 'groups', groupId), { members: updatedMembers }).catch(() => {});
  }
};

export const sendGroupTextMessage = async (
  senderId: string,
  groupId: string,
  text: string,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const newMessage: Message = {
    id: `msg_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId: groupId,
    groupId,
    text,
    timestamp: Date.now(),
    read: true,
    type: 'text',
    replyTo,
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error(e);
  }

  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

export const sendGroupImageMessage = async (
  senderId: string,
  groupId: string,
  imageUrl: string,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const newMessage: Message = {
    id: `msg_grp_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId: groupId,
    groupId,
    imageUrl,
    timestamp: Date.now(),
    read: true,
    type: 'image',
    replyTo,
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error(e);
  }

  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

export const sendGroupVoiceMessage = async (
  senderId: string,
  groupId: string,
  audioUrl: string,
  duration: number,
  replyTo?: Message['replyTo']
): Promise<Message> => {
  const newMessage: Message = {
    id: `msg_grp_aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId: groupId,
    groupId,
    audioUrl,
    audioDuration: duration,
    timestamp: Date.now(),
    read: true,
    type: 'voice',
    replyTo,
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), newMessage);
  } catch (e) {
    console.error(e);
  }

  const messages = getMessages();
  messages.push(newMessage);
  saveMessagesLocally(messages);

  return newMessage;
};

export const getGroupsForUser = (currentUserId: string): Group[] => {
  const allGroups = getGroups();
  return allGroups.filter(
    (g) => g.members.length === 0 || g.members.includes(currentUserId) || g.createdBy === currentUserId
  );
};

export const subscribeToGroupMessages = (
  groupId: string,
  currentUserId: string,
  onMessagesUpdate: (messages: Message[]) => void
) => {
  const fetchAndFilter = () => {
    const allMessages = getMessages();
    const filtered = allMessages.filter(
      (m) =>
        !m.deletedForUsers?.includes(currentUserId) &&
        (m.groupId === groupId || m.receiverId === groupId)
    );
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    onMessagesUpdate(filtered);
  };

  fetchAndFilter();

  const handleUpdate = () => {
    fetchAndFilter();
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleUpdate);
  }

  window.addEventListener('e2ee_messenger_updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleUpdate);
    }
    window.removeEventListener('e2ee_messenger_updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

export const getLastGroupMessage = (groupId: string): Message | null => {
  const messages = getMessages();
  const filtered = messages.filter((m) => m.groupId === groupId || m.receiverId === groupId);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => b.timestamp - a.timestamp);
  return filtered[0];
};

export const getUnreadGroupCount = (groupId: string, currentUserId: string): number => {
  const messages = getMessages();
  return messages.filter(
    (m) =>
      !m.deletedForUsers?.includes(currentUserId) &&
      (m.groupId === groupId || m.receiverId === groupId) &&
      m.senderId !== currentUserId &&
      !m.read
  ).length;
};
