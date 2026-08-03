import { Message, UserProfile } from '../types';
import { generateKeyPair, encryptMessage, decryptMessage } from './encryptionService';

const STORAGE_MESSAGES_KEY = 'e2ee_messenger_messages';
const STORAGE_USERS_KEY = 'e2ee_messenger_users';
const STORAGE_AUTH_SESSION_KEY = 'e2ee_messenger_auth_session_uid';

// Default users array (now empty as demo accounts are removed)
export const DEFAULT_USERS: UserProfile[] = [];

const DEMO_UIDS = ['user_mehedi', 'user_sadia', 'user_tanvir', 'user_nusrat', 'user_joni', 'joni'];

// Helper to load registered users
export const getUsers = (): UserProfile[] => {
  const stored = localStorage.getItem(STORAGE_USERS_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed: UserProfile[] = JSON.parse(stored);
    
    // Filter out old demo users if present in localStorage (including Joni)
    const cleanUsers = parsed.filter(
      (u) =>
        !DEMO_UIDS.includes(u.uid) &&
        u.displayName?.toLowerCase() !== 'joni' &&
        !u.uid.toLowerCase().includes('joni')
    );

    let modified = cleanUsers.length !== parsed.length;
    
    // Ensure every registered user has phone and password string safety
    cleanUsers.forEach((u) => {
      if (!u.phone) {
        u.phone = '01700000000';
        modified = true;
      }
      if (!u.password) {
        u.password = 'password123';
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(cleanUsers));
    }
    return cleanUsers;
  } catch {
    return [];
  }
};

// Auth session methods (Persistent login state)
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

// Sign Up User
export const signUpUser = (
  phone: string,
  password: string,
  displayName: string,
  email?: string
): { success: boolean; user?: UserProfile; error?: string } => {
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

  const users = getUsers();
  const existingUser = users.find((u) => (u.phone || '').replace(/[\s-]/g, '') === cleanPhone);
  if (existingUser) {
    return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
  }

  const keys = generateKeyPair();
  const newUser: UserProfile = {
    uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    phone: cleanPhone,
    password,
    displayName: displayName.trim(),
    email: email?.trim() || `${cleanPhone}@messenger.app`,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    createdAt: Date.now(),
    status: 'online',
    bio: '🔐 E2EE Secured Messenger User',
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  setAuthSession(newUser.uid);
  return { success: true, user: newUser };
};

// Login User
export const loginUser = (
  phone: string,
  password: string
): { success: boolean; user?: UserProfile; error?: string } => {
  const cleanPhone = (phone || '').replace(/[\s-]/g, '').trim();
  const users = getUsers();

  const user = users.find((u) => (u.phone || '').replace(/[\s-]/g, '') === cleanPhone);
  if (!user) {
    return { success: false, error: 'এই ফোন নাম্বারে কোন একাউন্ট পাওয়া যায়নি (Phone number not registered)' };
  }

  if (user.password !== password) {
    return { success: false, error: 'ভুল পাসওয়ার্ড দিয়েছেন! আবার চেষ্টা করুন (Incorrect password)' };
  }

  setAuthSession(user.uid);
  return { success: true, user };
};

// Logout
export const logoutUser = () => {
  setAuthSession(null);
};

// Broadcast Channel for multi-tab real-time sync
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('e2ee_messenger_sync')
  : null;

const broadcastChange = () => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'SYNC_MESSAGES', timestamp: Date.now() });
  }
  // Dispatch custom local window event for same-tab updates
  window.dispatchEvent(new CustomEvent('e2ee_messenger_updated'));
};

// Pre-seed default encrypted messages if none exist
export const getMessages = (): Message[] => {
  const stored = localStorage.getItem(STORAGE_MESSAGES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }

  // Generate pre-encrypted seed messages between Mehedi and Sadia
  const mehedi = DEFAULT_USERS[0];
  const sadia = DEFAULT_USERS[1];
  const tanvir = DEFAULT_USERS[2];

  const now = Date.now();

  const seedMessages: Message[] = [
    {
      id: 'msg_1',
      senderId: sadia.uid,
      receiverId: mehedi.uid,
      text: encryptMessage('হ্যালো মেহেদী ভাই! কেমন আছেন? এনক্রিপ্টেড মেসেজিং সিস্টেম কেমন চলছে?', mehedi.publicKey, sadia.secretKey),
      timestamp: now - 3600000 * 3,
      read: true,
      type: 'text',
    },
    {
      id: 'msg_2',
      senderId: mehedi.uid,
      receiverId: sadia.uid,
      text: encryptMessage('আলহামদুলিল্লাহ ভালো! TweetNaCl 25519 এনক্রিপশন সম্পূর্ণ কাজ করছে। কেউ মেসেজ ইন্টারসেপ্ট করতে পারবে না। 🔒', sadia.publicKey, mehedi.secretKey),
      timestamp: now - 3600000 * 2,
      read: true,
      type: 'text',
    },
    {
      id: 'msg_3',
      senderId: sadia.uid,
      receiverId: mehedi.uid,
      text: encryptMessage('অসাধারণ! ছবি এবং ভয়েস মেসেজও সহজে পাঠানো যাচ্ছে। দারুণ ডিজাইন!', mehedi.publicKey, sadia.secretKey),
      timestamp: now - 3600000 * 1,
      read: true,
      type: 'text',
    },
    {
      id: 'msg_4',
      senderId: tanvir.uid,
      receiverId: mehedi.uid,
      text: encryptMessage('Hi Mehedi, can you review the Messenger UI layout today?', mehedi.publicKey, tanvir.secretKey),
      timestamp: now - 1800000,
      read: false,
      type: 'text',
    },
  ];

  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(seedMessages));
  return seedMessages;
};

// Send Text Message
export const sendTextMessage = async (
  senderId: string,
  receiverId: string,
  text: string,
  receiverPublicKey: string,
  myPrivateKey: string
): Promise<Message> => {
  const messages = getMessages();
  const encryptedText = encryptMessage(text, receiverPublicKey, myPrivateKey);

  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    senderId,
    receiverId,
    text: encryptedText,
    timestamp: Date.now(),
    read: false,
    type: 'text',
  };

  messages.push(newMessage);
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
  broadcastChange();

  return newMessage;
};

// Send Image Message
export const sendImageMessage = async (
  senderId: string,
  receiverId: string,
  imageUrl: string
): Promise<Message> => {
  const messages = getMessages();

  const newMessage: Message = {
    id: `msg_img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    senderId,
    receiverId,
    imageUrl,
    timestamp: Date.now(),
    read: false,
    type: 'image',
  };

  messages.push(newMessage);
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
  broadcastChange();

  return newMessage;
};

// Send Voice Note Message
export const sendVoiceMessage = async (
  senderId: string,
  receiverId: string,
  audioUrl: string,
  duration: number
): Promise<Message> => {
  const messages = getMessages();

  const newMessage: Message = {
    id: `msg_audio_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    senderId,
    receiverId,
    audioUrl,
    audioDuration: duration,
    timestamp: Date.now(),
    read: false,
    type: 'voice',
  };

  messages.push(newMessage);
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
  broadcastChange();

  return newMessage;
};

// Mark Messages as Read
export const markMessagesAsRead = (currentUserId: string, partnerId: string) => {
  const messages = getMessages();
  let updated = false;

  const updatedMessages = messages.map((msg) => {
    if (msg.senderId === partnerId && msg.receiverId === currentUserId && !msg.read) {
      updated = true;
      return { ...msg, read: true };
    }
    return msg;
  });

  if (updated) {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updatedMessages));
    broadcastChange();
  }
};

// Create or Add New Custom User Contact
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
    uid: `user_${Date.now()}`,
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

  users.push(newUser);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  broadcastChange();
  return newUser;
};

// Get list of users who have chatted with or messaged current user
export const getConversationsForUser = (currentUserId: string): UserProfile[] => {
  const allMessages = getMessages();
  const allUsers = getUsers();

  // Find partner UIDs where currentUserId is sender or receiver
  const partnerIds = new Set<string>();
  allMessages.forEach((m) => {
    if (m.deletedForUsers?.includes(currentUserId)) return;
    if (m.senderId === currentUserId && m.receiverId !== currentUserId) {
      partnerIds.add(m.receiverId);
    } else if (m.receiverId === currentUserId && m.senderId !== currentUserId) {
      partnerIds.add(m.senderId);
    }
  });

  // Map to UserProfile objects
  let conversationUsers = allUsers.filter((u) => u.uid !== currentUserId && partnerIds.has(u.uid));

  // Sort by last message timestamp descending
  conversationUsers.sort((a, b) => {
    const lastA = getLastMessage(currentUserId, a.uid);
    const lastB = getLastMessage(currentUserId, b.uid);
    const timeA = lastA ? lastA.timestamp : 0;
    const timeB = lastB ? lastB.timestamp : 0;
    return timeB - timeA;
  });

  return conversationUsers;
};

// Subscribe to realtime updates for a specific conversation
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
    // Sort chronologically
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    onMessagesUpdate(filtered);
  };

  // Initial call
  fetchAndFilter();

  // Listeners for multi-tab BroadcastChannel & Local Custom Event
  const handleStorageOrChannel = () => {
    fetchAndFilter();
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleStorageOrChannel);
  }

  window.addEventListener('e2ee_messenger_updated', handleStorageOrChannel);
  window.addEventListener('storage', handleStorageOrChannel);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleStorageOrChannel);
    }
    window.removeEventListener('e2ee_messenger_updated', handleStorageOrChannel);
    window.removeEventListener('storage', handleStorageOrChannel);
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
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  broadcastChange();
  return updatedUser;
};

// Delete a message for current user only ("Delete for me")
export const deleteForMe = (messageId: string, userId: string) => {
  const messages = getMessages();
  const index = messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    const deletedFor = messages[index].deletedForUsers || [];
    if (!deletedFor.includes(userId)) {
      messages[index].deletedForUsers = [...deletedFor, userId];
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      broadcastChange();
    }
  }
};

// Delete a message for everyone ("Delete for everyone")
export const deleteForEveryone = (messageId: string) => {
  const messages = getMessages();
  const updated = messages.filter((m) => m.id !== messageId);
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updated));
  broadcastChange();
};

// Legacy deleteMessage fallback
export const deleteMessage = (messageId: string) => {
  deleteForEveryone(messageId);
};

// Edit a text message and re-encrypt
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
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    broadcastChange();
  }
};

// Delete entire conversation between current user and partner
export const deleteConversation = (currentUserId: string, partnerId: string) => {
  const messages = getMessages();
  const updated = messages.filter(
    (m) =>
      !((m.senderId === currentUserId && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === currentUserId))
  );
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updated));
  broadcastChange();
};

// Delete user permanently from registered users directory and remove all messages
export const deleteUser = (userId: string) => {
  const users = getUsers();
  const updatedUsers = users.filter((u) => u.uid !== userId);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

  // Also delete all messages associated with this user
  const messages = getMessages();
  const updatedMessages = messages.filter(
    (m) => m.senderId !== userId && m.receiverId !== userId
  );
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updatedMessages));

  broadcastChange();
};

// Calculate unread count for a partner
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

// Get last message between current user and partner
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
