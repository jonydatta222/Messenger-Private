export interface UserProfile {
  uid: string;
  phone: string;
  password?: string;
  displayName: string;
  email: string;
  photoURL?: string;
  publicKey: string; // Base64 encoded TweetNaCl public key
  secretKey: string; // Base64 encoded TweetNaCl private key
  createdAt: number;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
  bio?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;        // Encrypted base64 payload string
  imageUrl?: string;    // Image URL or Base64 Data URL
  audioUrl?: string;    // Audio voice recording Base64 Data URL
  audioDuration?: number; // Duration in seconds
  timestamp: number;
  read: boolean;
  type?: 'text' | 'image' | 'voice';
  deletedForUsers?: string[]; // User UIDs for whom this message is deleted locally
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
}

export interface CallState {
  active: boolean;
  type: 'audio' | 'video' | null;
  partnerId: string | null;
  status: 'calling' | 'connected' | 'ended' | null;
  startTime?: number;
}
