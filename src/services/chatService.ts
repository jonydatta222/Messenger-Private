import { Message, UserProfile, Group, CallSignal } from '../types';
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
const DEMO_UIDS: string[] = [];

// Helper to normalize phone numbers consistently across Bangladesh (+880, 880, 017...)
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) {
    digits = '0' + digits.substring(3);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }
  return digits;
};

// Helper to remove undefined fields before sending to Firestore
export const cleanForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
};

// Local Cache In-Memory & LocalStorage getters/setters
export const getUsers = (): UserProfile[] => {
  const stored = localStorage.getItem(STORAGE_USERS_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed: UserProfile[] = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u) => u && typeof u === 'object' && u.uid && u.displayName);
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
      console.debug('Firestore Users snapshot error:', error);
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
      console.debug('Firestore Messages snapshot error:', error);
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
      console.debug('Firestore Groups snapshot error:', error);
    }
  );

  // Real-time listener for Calls collection
  onSnapshot(
    collection(db, 'calls'),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const callData = change.doc.data() as CallSignal;
        if (callData && callData.id) {
          notifyCallSignal(callData);
        }
      });
    },
    (error) => {
      console.debug('Firestore Calls snapshot error:', error);
    }
  );
};

// Start Firestore real-time synchronization automatically
initFirestoreSync();

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
  email?: string,
  photoURL?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  try {
    const rawCleanPhone = (phone || '').replace(/[\s-]/g, '').trim();
    const normPhone = normalizePhone(phone);
    if (!rawCleanPhone || normPhone.length < 5) {
      return { success: false, error: 'বৈধ ফোন নাম্বার টাইপ করুন (Please enter a valid phone number)' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে (Password must be at least 4 characters)' };
    }
    if (!displayName || !displayName.trim()) {
      return { success: false, error: 'আপনার নাম প্রদান করুন (Please enter your name)' };
    }

    // Check existing phone in Firestore (checking both normalized and raw phone)
    const q1 = query(collection(db, 'users'), where('phone', '==', normPhone));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
    }
    if (rawCleanPhone !== normPhone) {
      const q2 = query(collection(db, 'users'), where('phone', '==', rawCleanPhone));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
      }
    }

    // Also check local cache fallback
    const localUsers = getUsers();
    const existingLocal = localUsers.find((u) => {
      const uNorm = normalizePhone(u.phone || '');
      return uNorm === normPhone || u.phone === rawCleanPhone;
    });
    if (existingLocal) {
      return { success: false, error: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট খোলা হয়েছে (Phone number already registered)' };
    }

    const keys = generateKeyPair();
    const newUser: UserProfile = {
      uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: normPhone,
      password,
      displayName: displayName.trim(),
      email: email?.trim() || `${normPhone}@messenger.app`,
      photoURL: photoURL?.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName.trim())}`,
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
      createdAt: Date.now(),
      status: 'online',
      lastSeen: Date.now(),
      bio: '🔐 E2EE Secured Messenger User',
    };

    // Save to Firestore permanently
    await setDoc(doc(db, 'users', newUser.uid), cleanForFirestore(newUser));

    // Save locally & set session
    localUsers.push(newUser);
    saveUsersLocally(localUsers);
    setAuthSession(newUser.uid);

    // Sync all remote users/data to ensure current phone has complete list
    await fetchAllFromFirestore();

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
    const rawCleanPhone = (phone || '').replace(/[\s-]/g, '').trim();
    const normPhone = normalizePhone(phone);

    if (!normPhone && !rawCleanPhone) {
      return { success: false, error: 'ফোন নাম্বার প্রদান করুন (Please enter phone number)' };
    }

    // Query Firestore for this phone number first (ensures data restoration on any new device!)
    let targetUser: UserProfile | null = null;
    try {
      // 1. Try normalized phone query
      const qNorm = query(collection(db, 'users'), where('phone', '==', normPhone));
      const snapNorm = await getDocs(qNorm);
      if (!snapNorm.empty) {
        targetUser = snapNorm.docs[0].data() as UserProfile;
      } else {
        // 2. Try raw clean phone query
        const qRaw = query(collection(db, 'users'), where('phone', '==', rawCleanPhone));
        const snapRaw = await getDocs(qRaw);
        if (!snapRaw.empty) {
          targetUser = snapRaw.docs[0].data() as UserProfile;
        } else {
          // 3. Fallback: fetch all user docs and find matching normalized phone
          const allDocs = await getDocs(collection(db, 'users'));
          allDocs.forEach((d) => {
            const uData = d.data() as UserProfile;
            if (uData && uData.phone) {
              const uNorm = normalizePhone(uData.phone);
              if (uNorm === normPhone || uData.phone === rawCleanPhone) {
                targetUser = uData;
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Firestore user search error, trying local cache:', e);
    }

    // Local fallback if Firestore fails or offline
    if (!targetUser) {
      const users = getUsers();
      targetUser = users.find((u) => {
        const uNorm = normalizePhone(u.phone || '');
        return uNorm === normPhone || u.phone === rawCleanPhone;
      }) || null;
    }

    if (!targetUser) {
      return { success: false, error: 'এই ফোন নাম্বারে কোন একাউন্ট পাওয়া যায়নি (Phone number not registered)' };
    }

    if (targetUser.password !== password) {
      return { success: false, error: 'ভুল পাসওয়ার্ড দিয়েছেন! আবার চেষ্টা করুন (Incorrect password)' };
    }

    // Ensure user phone in object is normalized
    targetUser.phone = normPhone || targetUser.phone;
    targetUser.status = 'online';
    targetUser.lastSeen = Date.now();

    // Save user locally & sync full history from Firestore BEFORE returning
    const localUsers = getUsers();
    const existingIndex = localUsers.findIndex((u) => u.uid === targetUser!.uid);
    if (existingIndex >= 0) {
      localUsers[existingIndex] = targetUser;
    } else {
      localUsers.push(targetUser);
    }
    saveUsersLocally(localUsers);

    setAuthSession(targetUser.uid);
    updateUserPresence(targetUser.uid, 'online').catch(() => {});

    // Trigger full Firestore sync so all past messages and groups are pulled in immediately
    await fetchAllFromFirestore();

    return { success: true, user: targetUser };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err?.message || 'লগইনে সমস্যা হয়েছে।' };
  }
};

// Search and find user by Phone Number, User ID (uid), Email, or Display Name across local storage & Firestore
export const findUserByPhoneOrId = async (
  searchTerm: string
): Promise<UserProfile | null> => {
  if (!searchTerm || !searchTerm.trim()) return null;

  const cleanTerm = searchTerm.trim();
  const lowerTerm = cleanTerm.toLowerCase();
  const normPhone = normalizePhone(cleanTerm);
  const digitsOnly = cleanTerm.replace(/\D/g, '');
  const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '';

  const saveAndReturn = (user: UserProfile) => {
    const localUsers = getUsers();
    const idx = localUsers.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) {
      localUsers[idx] = user;
    } else {
      localUsers.push(user);
    }
    saveUsersLocally(localUsers);
    return user;
  };

  // 1. Check local cache first
  const localUsers = getUsers();
  const foundLocal = localUsers.find((u) => {
    if (!u) return false;
    const uUid = (u.uid || '').toLowerCase();
    const uEmail = (u.email || '').toLowerCase();
    const uPhoneNorm = normalizePhone(u.phone || '');
    const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
    const uLast10 = uPhoneDigits.length >= 10 ? uPhoneDigits.slice(-10) : '';

    if (uUid === lowerTerm || uEmail === lowerTerm) return true;
    if (normPhone && uPhoneNorm === normPhone) return true;
    if (last10Digits && uLast10 && last10Digits === uLast10) return true;
    if (u.phone && (u.phone === cleanTerm || u.phone === digitsOnly)) return true;
    return false;
  });

  if (foundLocal) return foundLocal;

  // 2. Query Firestore directly
  try {
    // 2a. Query by exact UID
    try {
      const docRef = doc(db, 'users', cleanTerm);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const uData = docSnap.data() as UserProfile;
        if (uData && uData.uid) {
          return saveAndReturn(uData);
        }
      }
    } catch {
      // ignore
    }

    // 2b. Query by normalized phone
    if (normPhone) {
      try {
        const qPhone = query(collection(db, 'users'), where('phone', '==', normPhone));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          const uData = snapPhone.docs[0].data() as UserProfile;
          return saveAndReturn(uData);
        }
      } catch {
        // ignore
      }
    }

    // 2c. Query by raw digits
    if (digitsOnly && digitsOnly !== normPhone) {
      try {
        const qDigits = query(collection(db, 'users'), where('phone', '==', digitsOnly));
        const snapDigits = await getDocs(qDigits);
        if (!snapDigits.empty) {
          const uData = snapDigits.docs[0].data() as UserProfile;
          return saveAndReturn(uData);
        }
      } catch {
        // ignore
      }
    }

    // 2d. Query by email
    try {
      const qEmail = query(collection(db, 'users'), where('email', '==', lowerTerm));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const uData = snapEmail.docs[0].data() as UserProfile;
        return saveAndReturn(uData);
      }
    } catch {
      // ignore
    }

    // 3. Complete scan of Firestore users collection
    const allDocs = await getDocs(collection(db, 'users'));
    let matchedUser: UserProfile | null = null;

    allDocs.forEach((d) => {
      if (matchedUser) return;
      const u = d.data() as UserProfile;
      if (!u) return;

      const uUid = (u.uid || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uDisplayName = (u.displayName || '').toLowerCase();
      const uPhoneNorm = normalizePhone(u.phone || '');
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const uLast10 = uPhoneDigits.length >= 10 ? uPhoneDigits.slice(-10) : '';

      if (
        uUid === lowerTerm ||
        uEmail === lowerTerm ||
        (normPhone && uPhoneNorm === normPhone) ||
        (last10Digits && uLast10 && last10Digits === uLast10) ||
        (u.phone && (u.phone === cleanTerm || u.phone === digitsOnly)) ||
        (lowerTerm.length >= 3 && uDisplayName === lowerTerm)
      ) {
        matchedUser = u;
      }
    });

    if (matchedUser) {
      return saveAndReturn(matchedUser);
    }
  } catch (err) {
    console.error('Error finding user in Firestore:', err);
  }

  return null;
};

// Find user for Password Reset by phone or email
export const findUserForPasswordReset = async (
  phoneOrEmail: string
): Promise<{ success: boolean; user?: UserProfile; emailMasked?: string; error?: string }> => {
  try {
    const queryTerm = (phoneOrEmail || '').trim();
    if (!queryTerm) {
      return { success: false, error: 'ফোন নাম্বার বা ইমেইল টাইপ করুন (Please enter phone or email)' };
    }

    const normPhone = normalizePhone(queryTerm);
    const cleanRaw = queryTerm.replace(/[\s-]/g, '');

    let foundUser: UserProfile | null = null;

    // 1. Try querying Firestore by phone (normalized or raw)
    if (normPhone) {
      const qNorm = query(collection(db, 'users'), where('phone', '==', normPhone));
      const snapNorm = await getDocs(qNorm);
      if (!snapNorm.empty) {
        foundUser = snapNorm.docs[0].data() as UserProfile;
      }
    }

    if (!foundUser && cleanRaw) {
      const qRaw = query(collection(db, 'users'), where('phone', '==', cleanRaw));
      const snapRaw = await getDocs(qRaw);
      if (!snapRaw.empty) {
        foundUser = snapRaw.docs[0].data() as UserProfile;
      }
    }

    // 2. Try querying Firestore by email
    if (!foundUser) {
      const qEmail = query(collection(db, 'users'), where('email', '==', queryTerm.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        foundUser = snapEmail.docs[0].data() as UserProfile;
      }
    }

    // 3. Fallback: Search all Firestore docs
    if (!foundUser) {
      try {
        const allDocs = await getDocs(collection(db, 'users'));
        allDocs.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u) {
            const uNorm = normalizePhone(u.phone || '');
            const uEmail = (u.email || '').toLowerCase();
            if (
              (uNorm && uNorm === normPhone) ||
              u.phone === cleanRaw ||
              uEmail === queryTerm.toLowerCase()
            ) {
              foundUser = u;
            }
          }
        });
      } catch (e) {
        console.warn('Search all docs error:', e);
      }
    }

    // 4. Local fallback
    if (!foundUser) {
      const users = getUsers();
      foundUser =
        users.find((u) => {
          const uNorm = normalizePhone(u.phone || '');
          const uEmail = (u.email || '').toLowerCase();
          return uNorm === normPhone || u.phone === cleanRaw || uEmail === queryTerm.toLowerCase();
        }) || null;
    }

    if (!foundUser) {
      return {
        success: false,
        error: 'এই তথ্য দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি (No account found matching this phone/email)',
      };
    }

    // Mask email or phone for display
    let masked = foundUser.email || foundUser.phone;
    if (foundUser.email && foundUser.email.includes('@')) {
      const [parts0, parts1] = foundUser.email.split('@');
      const start = parts0.substring(0, 2);
      masked = `${start}***@${parts1}`;
    } else if (foundUser.phone) {
      const len = foundUser.phone.length;
      masked = foundUser.phone.substring(0, 3) + '****' + foundUser.phone.substring(len - 3);
    }

    return { success: true, user: foundUser, emailMasked: masked };
  } catch (err: any) {
    console.error('Find user for password reset error:', err);
    return { success: false, error: err?.message || 'অ্যাকাউন্ট খুঁজতে ব্যর্থ হয়েছে।' };
  }
};

// Reset User Password
export const resetUserPassword = async (
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে (Password must be at least 4 characters)' };
    }

    // Update in Firestore
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { password: newPassword });

    // Update local cache
    const users = getUsers();
    const idx = users.findIndex((u) => u.uid === uid);
    if (idx >= 0) {
      users[idx].password = newPassword;
      saveUsersLocally(users);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Reset password error:', err);
    return { success: false, error: err?.message || 'পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।' };
  }
};

// Helper to check if a user is currently online (heartbeat within last 45s)
export const isUserOnline = (user: UserProfile | null | undefined): boolean => {
  if (!user) return false;
  if (user.status !== 'online') return false;
  if (!user.lastSeen) {
    return user.status === 'online';
  }
  const diff = Date.now() - user.lastSeen;
  return diff < 45000;
};

// Helper to format lastSeen time string for offline users
export const formatLastSeenText = (lastSeen?: number, lang: 'bn' | 'en' = 'en'): string => {
  if (!lastSeen) return lang === 'bn' ? 'অফলাইন' : 'Offline';
  const diffMs = Date.now() - lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return lang === 'bn' ? 'এইমাত্র অফলাইন' : 'Just now';
  } else if (diffMins < 60) {
    return lang === 'bn' ? `${diffMins} মিনিট আগে` : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return lang === 'bn' ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
  } else {
    return lang === 'bn' ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
  }
};

// Send active user presence heartbeat to Firestore & local state
export const updateUserPresence = async (uid: string, status: 'online' | 'offline' | 'away' = 'online') => {
  if (!uid) return;
  const now = Date.now();

  // Update local cache
  const localUsers = getUsers();
  const idx = localUsers.findIndex((u) => u.uid === uid);
  if (idx !== -1) {
    localUsers[idx].status = status;
    localUsers[idx].lastSeen = now;
    saveUsersLocally(localUsers);
  }

  // Update Firestore user doc
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status,
      lastSeen: now,
    });
  } catch (err) {
    try {
      await setDoc(doc(db, 'users', uid), { status, lastSeen: now }, { merge: true });
    } catch (e) {
      // ignore
    }
  }
};

// Logout
export const logoutUser = () => {
  const uid = getCurrentUserId();
  if (uid) {
    updateUserPresence(uid, 'offline').catch(() => {});
  }
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
  setDoc(doc(db, 'users', newUser.uid), cleanForFirestore(newUser)).catch((e) => console.error(e));

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
    const uniqueMap = new Map<string, Message>();
    allMessages.forEach((m) => {
      if (
        !m.deletedForUsers?.includes(currentUserId) &&
        ((m.senderId === currentUserId && m.receiverId === chatPartnerId) ||
          (m.senderId === chatPartnerId && m.receiverId === currentUserId))
      ) {
        uniqueMap.set(m.id, m);
      }
    });
    const filtered = Array.from(uniqueMap.values());
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
  setDoc(doc(db, 'users', uid), cleanForFirestore(updatedUser), { merge: true }).catch((e) => console.error(e));

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
      updateDoc(doc(db, 'messages', messageId), cleanForFirestore({ deletedForUsers: updated })).catch(() => {});
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
    setDoc(doc(db, 'messages', messageId), cleanForFirestore(messages[index])).catch(() => {});
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
  const updated = messages.map((m) => {
    if (
      (m.senderId === currentUserId && m.receiverId === partnerId) ||
      (m.senderId === partnerId && m.receiverId === currentUserId)
    ) {
      const deletedFor = m.deletedForUsers || [];
      if (!deletedFor.includes(currentUserId)) {
        const updatedDeletedFor = [...deletedFor, currentUserId];
        updateDoc(doc(db, 'messages', m.id), cleanForFirestore({ deletedForUsers: updatedDeletedFor })).catch(() => {});
        return { ...m, deletedForUsers: updatedDeletedFor };
      }
    }
    return m;
  });
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
    await setDoc(doc(db, 'groups', newGroup.id), cleanForFirestore(newGroup));
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
    await setDoc(doc(db, 'messages', welcomeMsg.id), cleanForFirestore(welcomeMsg));
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
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
    const uniqueMap = new Map<string, Message>();
    allMessages.forEach((m) => {
      if (
        !m.deletedForUsers?.includes(currentUserId) &&
        (m.groupId === groupId || m.receiverId === groupId)
      ) {
        uniqueMap.set(m.id, m);
      }
    });
    const filtered = Array.from(uniqueMap.values());
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

// ==================== TYPING INDICATOR SERVICES ====================

const typingMemoryCache = new Map<string, boolean>();

export const setTypingStatus = async (senderId: string, receiverId: string, isTyping: boolean) => {
  const key = `${senderId}_${receiverId}`;
  if (typingMemoryCache.get(key) === isTyping) return;
  typingMemoryCache.set(key, isTyping);

  // Broadcast locally & cross-tab
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'TYPING_STATUS', senderId, receiverId, isTyping });
  }
  window.dispatchEvent(
    new CustomEvent('e2ee_messenger_typing', { detail: { senderId, receiverId, isTyping } })
  );

  // Sync to Firestore doc
  try {
    await setDoc(doc(db, 'typing', key), {
      senderId,
      receiverId,
      isTyping,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Typing status sync error:', err);
  }
};

export const subscribeToTypingStatus = (
  senderId: string,
  partnerId: string,
  onTypingUpdate: (isTyping: boolean) => void
) => {
  const docId = `${partnerId}_${senderId}`;

  // Local & Broadcast listener
  const handleLocalTyping = (e: any) => {
    if (e.detail && e.detail.senderId === partnerId && e.detail.receiverId === senderId) {
      onTypingUpdate(Boolean(e.detail.isTyping));
    }
  };

  const handleBroadcastTyping = (e: MessageEvent) => {
    if (
      e.data &&
      e.data.type === 'TYPING_STATUS' &&
      e.data.senderId === partnerId &&
      e.data.receiverId === senderId
    ) {
      onTypingUpdate(Boolean(e.data.isTyping));
    }
  };

  window.addEventListener('e2ee_messenger_typing', handleLocalTyping);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastTyping);
  }

  // Firestore Snapshot listener
  const unsubscribeFirestore = onSnapshot(
    doc(db, 'typing', docId),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isFresh = Date.now() - (data.updatedAt || 0) < 8000;
        onTypingUpdate(Boolean(data.isTyping && isFresh));
      } else {
        onTypingUpdate(false);
      }
    },
    (err) => {
      console.warn('Typing snapshot error:', err);
    }
  );

  return () => {
    window.removeEventListener('e2ee_messenger_typing', handleLocalTyping);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastTyping);
    }
    unsubscribeFirestore();
  };
};

// ==================== CALL SIGNALING SERVICES ====================

export const notifyCallSignal = (call: CallSignal) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'CALL_SIGNAL', call });
  }
  window.dispatchEvent(new CustomEvent('e2ee_messenger_call_signal', { detail: call }));
};

export const sendCallSignal = async (
  callerId: string,
  receiverId: string,
  type: 'audio' | 'video'
): Promise<CallSignal> => {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const call: CallSignal = {
    id: callId,
    callerId,
    receiverId,
    type,
    status: 'ringing',
    timestamp: Date.now(),
  };

  notifyCallSignal(call);

  try {
    await setDoc(doc(db, 'calls', callId), cleanForFirestore(call));
  } catch (err) {
    console.warn('Failed to send call signal to Firestore:', err);
  }

  return call;
};

export const updateCallSignalStatus = async (
  callId: string,
  status: 'accepted' | 'rejected' | 'ended',
  callerId?: string,
  receiverId?: string,
  type?: 'audio' | 'video'
) => {
  if (callerId && receiverId && type) {
    notifyCallSignal({
      id: callId,
      callerId,
      receiverId,
      type,
      status,
      timestamp: Date.now(),
    });
  }
  try {
    await updateDoc(doc(db, 'calls', callId), { status });
  } catch (err) {
    console.warn('Failed to update call status in Firestore:', err);
  }
};

export const subscribeToCallSignals = (
  currentUserId: string,
  onSignal: (signal: CallSignal) => void
) => {
  const handleLocalSignal = (e: any) => {
    if (e.detail) {
      const sig = e.detail as CallSignal;
      if (sig.callerId === currentUserId || sig.receiverId === currentUserId) {
        onSignal(sig);
      }
    }
  };

  const handleBroadcastSignal = (e: MessageEvent) => {
    if (e.data && e.data.type === 'CALL_SIGNAL' && e.data.call) {
      const sig = e.data.call as CallSignal;
      if (sig.callerId === currentUserId || sig.receiverId === currentUserId) {
        onSignal(sig);
      }
    }
  };

  window.addEventListener('e2ee_messenger_call_signal', handleLocalSignal);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastSignal);
  }

  return () => {
    window.removeEventListener('e2ee_messenger_call_signal', handleLocalSignal);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastSignal);
    }
  };
};

export const sendCallLogMessage = async (
  callerId: string,
  receiverId: string,
  callType: 'audio' | 'video',
  callStatus: 'missed' | 'declined' | 'completed',
  duration?: number,
  callId?: string
): Promise<Message | null> => {
  const msgId = callId ? `msg_call_${callId}` : `msg_call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const localMessages = getMessages();
  if (localMessages.some((m) => m.id === msgId)) {
    return null;
  }

  const newMessage: Message = {
    id: msgId,
    senderId: callerId,
    receiverId,
    timestamp: Date.now(),
    read: false,
    type: 'call',
    callInfo: {
      callId,
      type: callType,
      status: callStatus,
      duration,
    },
  };

  try {
    await setDoc(doc(db, 'messages', newMessage.id), cleanForFirestore(newMessage));
  } catch (e) {
    console.error('Error writing call log message to Firestore:', e);
  }

  if (!localMessages.some((m) => m.id === newMessage.id)) {
    localMessages.push(newMessage);
    saveMessagesLocally(localMessages);
  }

  return newMessage;
};
