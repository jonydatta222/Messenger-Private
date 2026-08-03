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
  Ban
} from 'lucide-react';
import { UserProfile, Message } from '../types';
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
  deleteUser 
} from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';
import { VoiceRecorder } from './VoiceRecorder';
import { CameraModal } from './CameraModal';

interface ChatScreenProps {
  currentUser: UserProfile;
  partner: UserProfile;
  onStartCall: (type: 'audio' | 'video') => void;
  onBack?: () => void;
  onOpenFloatingHead?: () => void;
  lang: 'bn' | 'en';
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  partner,
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

  // Delete, Edit & Long Press states
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [showPartnerProfileModal, setShowPartnerProfileModal] = useState(false);
  const [showChatInfoModal, setShowChatInfoModal] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editTextValue, setEditTextValue] = useState('');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      const decrypted = decryptMessage(
        selectedMessageForAction.text,
        selectedMessageForAction.senderId === currentUser.uid ? partner.publicKey : partner.publicKey,
        currentUser.secretKey
      );
      setEditTextValue(decrypted || selectedMessageForAction.text);
    } else {
      setEditTextValue('');
    }
    setIsEditingMessage(true);
  };

  const handleSaveEdit = () => {
    if (selectedMessageForAction && editTextValue.trim()) {
      editTextMessage(
        selectedMessageForAction.id,
        editTextValue.trim(),
        partner.publicKey,
        currentUser.secretKey
      );
      setIsEditingMessage(false);
      setSelectedMessageForAction(null);
      setShowDeleteModal(false);
    }
  };

  const handleClearAllMessages = () => {
    deleteConversation(currentUser.uid, partner.uid);
    deleteUser(partner.uid);
    setShowClearChatModal(false);
    if (onBack) onBack();
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to realtime messages for this chat partner
  useEffect(() => {
    const unsubscribe = subscribeToMessages(currentUser.uid, partner.uid, (fetchedMessages) => {
      setMessages(fetchedMessages);
      markMessagesAsRead(currentUser.uid, partner.uid);
    });
    return () => unsubscribe();
  }, [currentUser.uid, partner.uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);

    await sendTextMessage(
      currentUser.uid,
      partner.uid,
      textToSend,
      partner.publicKey,
      currentUser.secretKey
    );
  };

  const handleSendVoice = async (audioUrl: string, duration: number) => {
    setShowVoiceRecorder(false);
    await sendVoiceMessage(currentUser.uid, partner.uid, audioUrl, duration);
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
    setShowCameraModal(false);
    await sendImageMessage(currentUser.uid, partner.uid, imageDataUrl);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sendImageMessage(currentUser.uid, partner.uid, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleSendThumbsUp = async () => {
    await sendTextMessage(
      currentUser.uid,
      partner.uid,
      '👍',
      partner.publicKey,
      currentUser.secretKey
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white relative overflow-hidden select-none">
      {/* Active Partner Top App Bar */}
      <div className="px-2 py-2.5 bg-slate-900 border-b border-slate-800/90 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-1">
          {/* Back Arrow for Fullscreen Navigation */}
          <button
            onClick={onBack}
            className="p-1.5 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* User Profile Avatar */}
          <div
            className="relative cursor-pointer flex items-center gap-2.5 ml-0.5"
            onClick={() => setShowPartnerProfileModal(true)}
          >
            <div className="relative">
              <img
                src={partner.photoURL}
                alt={partner.displayName}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700"
              />
              {partner.status === 'online' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              )}
            </div>

            <div>
              <h2 className="font-bold text-sm text-white tracking-tight leading-tight">
                {partner.displayName}
              </h2>
              <span className="text-[10px] text-slate-400 font-normal block -mt-0.5">
                {partner.status === 'online'
                  ? (lang === 'bn' ? 'সক্রিয় আছেন' : 'Active now')
                  : (lang === 'bn' ? 'অফলাইন' : 'Offline')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-1 text-blue-400">
          <button
            onClick={() => onStartCall('audio')}
            className="p-2 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'অডিও কল' : 'Audio Call'}
          >
            <Phone className="w-5 h-5 text-blue-400" />
          </button>

          <button
            onClick={() => onStartCall('video')}
            className="p-2 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'ভিডিও কল' : 'Video Call'}
          >
            <Video className="w-5 h-5 text-blue-400" />
          </button>

          <button
            onClick={() => setShowChatInfoModal(true)}
            className="p-2 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={lang === 'bn' ? 'তথ্য' : 'Info'}
          >
            <Info className="w-5 h-5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3.5 bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950 text-white">
        {/* Top Profile Hero Section (Messenger Style) */}
        <div className="flex flex-col items-center justify-center py-6 text-center my-2 select-none border-b border-slate-800/80 pb-6">
          <img
            src={partner.photoURL}
            alt={partner.displayName}
            className="w-24 h-24 rounded-full object-cover ring-2 ring-slate-800 shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowPartnerProfileModal(true)}
          />
          <h2 className="text-xl font-bold text-white mt-3.5 tracking-tight">
            {partner.displayName}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono tracking-tight">
            @{partner.displayName.toLowerCase().replace(/\s+/g, '')}.{partner.phone ? partner.phone.slice(-6) : '665897'}
          </p>
          <button
            type="button"
            onClick={() => setShowPartnerProfileModal(true)}
            className="mt-4 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full border border-slate-700/80 transition-all hover:scale-105 shadow-sm cursor-pointer"
          >
            {lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View profile'}
          </button>
        </div>

        {/* Message Stream */}
        {messages.map((item) => {
          const isMe = item.senderId === currentUser.uid;

          if (item.isDeletedForEveryone) {
            return (
              <div
                key={item.id}
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
                  className={`max-w-[78%] sm:max-w-[70%] rounded-[18px] px-3.5 py-2 shadow-sm relative border flex items-center gap-2 italic text-xs cursor-pointer ${
                    isMe
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-400 rounded-br-[4px]'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-500 rounded-bl-[4px]'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    {isMe
                      ? (lang === 'bn' ? 'আপনি এই মেসেজটি সবার জন্য রিমুভ করেছেন' : 'You removed this message')
                      : (lang === 'bn' ? 'এই মেসেজটি রিমুভ করা হয়েছে' : 'This message was removed')}
                  </span>
                  <span className="text-[9px] text-slate-500 not-italic ml-1 shrink-0">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>
            );
          }

          let displayText = '';
          if (item.text) {
            if (inspectCiphertext) {
              displayText = item.text;
            } else {
              const decrypted = decryptMessage(
                item.text,
                isMe ? partner.publicKey : partner.publicKey,
                currentUser.secretKey
              );
              displayText = decrypted || (lang === 'bn' ? '⚠️ ডিক্রিপশন ত্রুটি' : '⚠️ Decryption Error');
            }
          }

          return (
            <div
              key={item.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative my-1`}
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
                className={`max-w-[78%] sm:max-w-[70%] rounded-[18px] p-3 shadow-sm relative transition-all cursor-pointer select-none active:scale-[0.98] ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-[4px] shadow-blue-600/20'
                    : 'bg-slate-900 text-white rounded-bl-[4px] border border-slate-800'
                }`}
              >
                {/* Image Payload */}
                {item.imageUrl && (
                  <div className="mb-1 rounded-[14px] overflow-hidden cursor-pointer">
                    <img
                      src={item.imageUrl}
                      alt="Sent media"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImagePreview(item.imageUrl!);
                      }}
                      className="max-h-72 w-full object-cover rounded-[14px] hover:opacity-90 transition-opacity"
                    />
                  </div>
                )}

                {/* Audio Voice Note Payload */}
                {item.audioUrl && (
                  <div className="flex items-center gap-2 p-2 bg-black/40 rounded-xl my-1 border border-zinc-700/40">
                    <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <audio controls src={item.audioUrl} className="h-8 w-48 sm:w-56" />
                  </div>
                )}

                {/* Text Payload */}
                {item.text && (
                  <p
                    className={`text-xs leading-relaxed break-words font-sans ${
                      inspectCiphertext ? 'font-mono text-[10px] text-amber-200 bg-zinc-900 p-2 rounded-xl border border-amber-500/30' : ''
                    }`}
                  >
                    {displayText}
                    {item.isEdited && !inspectCiphertext && (
                      <span className="text-[10px] text-slate-300/80 italic ml-1.5 font-normal">
                        ({lang === 'bn' ? 'সম্পাদিত' : 'edited'})
                      </span>
                    )}
                  </p>
                )}

                {/* Timestamp */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? 'text-blue-100/70' : 'text-zinc-400'
                  }`}
                >
                  <span>{formatTime(item.timestamp)}</span>
                  {isMe && (
                    <CheckCheck
                      className={`w-3 h-3 ${item.read ? 'text-white' : 'text-blue-200/60'}`}
                    />
                  )}
                </div>
              </div>

              {/* Read Avatar Indicator for sent message */}
              {isMe && item.read && (
                <div className="flex justify-end mt-0.5">
                  <img
                    src={partner.photoURL}
                    alt="Read"
                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-black"
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className="bg-[#18191a] border-t border-zinc-800 p-2 flex gap-2 overflow-x-auto text-lg no-scrollbar shadow-inner z-20">
          {['👍', '❤️', '😊', '🔥', '🔒', '🎉', '👋', '🙏', '💯', '🚀', '🇧🇩'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-zinc-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bottom Action Bar */}
      <div className="p-2 bg-slate-900 border-t border-slate-800/90 shadow-lg z-20">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setShowVoiceRecorder(false)}
            lang={lang}
          />
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-1.5">
            {/* Attachment buttons */}
            <div className="flex items-center gap-1 text-blue-400">
              <button
                type="button"
                onClick={() => setInspectCiphertext(!inspectCiphertext)}
                className="p-1.5 text-white bg-blue-600 rounded-full hover:bg-blue-500 transition-colors cursor-pointer shadow-sm"
                title={inspectCiphertext ? 'Show Decrypted' : 'Inspect Ciphertext'}
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCameraModal(true)}
                className="p-1.5 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ছবি তুলুন' : 'Take Photo'}
              >
                <Camera className="w-5 h-5 text-blue-400" />
              </button>

              <label className="p-1.5 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                <ImageIcon className="w-5 h-5 text-blue-400" />
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
                className="p-1.5 text-blue-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={lang === 'bn' ? 'ভয়েস রেকর্ড' : 'Voice Record'}
              >
                <Mic className="w-5 h-5 text-blue-400" />
              </button>
            </div>

            {/* Input field capsule */}
            <div className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-full px-4 py-1.5 flex items-center justify-between gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lang === 'bn' ? 'মেসেজ...' : 'Message'}
                className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Right Action: Send OR Thumbs Up */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="p-1.5 text-blue-400 hover:scale-110 transition-transform cursor-pointer"
                title={lang === 'bn' ? 'পাঠান' : 'Send'}
              >
                <Send className="w-5 h-5 text-blue-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendThumbsUp}
                className="p-1.5 text-[#0084ff] hover:scale-110 transition-transform cursor-pointer"
                title={lang === 'bn' ? 'লাইক দিন' : 'Send Thumbs Up'}
              >
                <ThumbsUp className="w-6 h-6 text-[#0084ff] fill-[#0084ff]" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            {isEditingMessage ? (
              /* Edit Message Form */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Edit2 className="w-5 h-5" />
                  <span>{lang === 'bn' ? 'মেসেজ এডিট করুন' : 'Edit Message'}</span>
                </div>
                <textarea
                  value={editTextValue}
                  onChange={(e) => setEditTextValue(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন মেসেজ লিখুন...' : 'Type updated text...'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[90px]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsEditingMessage(false);
                      setShowDeleteModal(false);
                      setSelectedMessageForAction(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTextValue.trim()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    {lang === 'bn' ? 'সেভ করুন' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* Options Sheet: Edit, Delete for Me, Delete for Everyone */
              <div className="space-y-3">
                <div className="text-center pb-1 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn' ? 'মেসেজ অপশনসমূহ' : 'Message Options'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'bn' ? 'আপনার প্রয়োজনীয় অপশনটি নির্বাচন করুন' : 'Select an option below'}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Edit Option (if message has text and not already removed) */}
                  {selectedMessageForAction.text && !selectedMessageForAction.isDeletedForEveryone && (
                    <button
                      onClick={handleStartEdit}
                      className="w-full p-3 bg-slate-800/80 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-200 hover:text-blue-400 group"
                    >
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{lang === 'bn' ? 'এডিট করুন (Edit)' : 'Edit Message'}</div>
                        <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'মেসেজের ভুল লেখা সংশোধন করুন' : 'Modify mistyped message text'}</div>
                      </div>
                    </button>
                  )}

                  {/* Delete for me */}
                  <button
                    onClick={handleDeleteForMe}
                    className="w-full p-3 bg-slate-800/80 hover:bg-amber-600/20 border border-slate-700/60 hover:border-amber-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-200 hover:text-amber-400 group"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{lang === 'bn' ? 'আমার জন্য ডিলেট (Delete for me)' : 'Delete for Me'}</div>
                      <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'শুধু আপনার স্ক্রিন থেকে মুছে ফেলা হবে' : 'Remove only from your view'}</div>
                    </div>
                  </button>

                  {/* Delete for everyone (if not already removed for everyone) */}
                  {!selectedMessageForAction.isDeletedForEveryone && (
                    <button
                      onClick={handleDeleteForEveryone}
                      className="w-full p-3 bg-slate-800/80 hover:bg-red-600/20 border border-slate-700/60 hover:border-red-500/50 rounded-2xl flex items-center gap-3 text-left transition-all text-slate-200 hover:text-red-400 group cursor-pointer"
                    >
                      <div className="p-2 bg-red-500/10 text-red-400 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{lang === 'bn' ? 'সবার জন্য রিমুভ (Remove for Everyone)' : 'Remove for Everyone'}</div>
                        <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'উভয় পাশের চ্যাটবক্স ও সার্ভার থেকে সম্পূর্ণ মেসেজ রিমুভ হয়ে যাবে' : 'Completely remove message from both chatboxes and server storage'}</div>
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
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'সমস্ত মেসেজ মুছে ফেলতে চান?' : 'Clear All Messages?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'bn'
                  ? `${partner.displayName}-এর সাথে বিনিময় করা সকল মেসেজ মুছে ফেলা হবে।`
                  : `All conversation history with ${partner.displayName} will be deleted.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearChatModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleClearAllMessages}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {lang === 'bn' ? 'সব ডিলেট করুন' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Profile Modal */}
      {showPartnerProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1e21] border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-fadeIn relative text-center">
            <button
              onClick={() => setShowPartnerProfileModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative inline-block mx-auto mt-2">
              <img
                src={partner.photoURL}
                alt={partner.displayName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#0084ff]/30 mx-auto shadow-xl"
              />
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-[#1c1e21] ${
                  partner.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-500'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
                {partner.displayName}
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {partner.email}
              </p>
              {partner.phone && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  {partner.phone}
                </p>
              )}
            </div>

            {/* E2EE Info Box */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 text-left space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'এন্ড-টু-এন্ড এনক্রিপ্টেড' : 'End-to-End Encrypted'}</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono break-all leading-tight">
                {lang === 'bn' ? 'পাবলিক কী:' : 'Public Key:'} {partner.publicKey.slice(0, 28)}...
              </p>
            </div>

            {/* Call Shortcuts */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setShowPartnerProfileModal(false);
                  onStartCall('audio');
                }}
                className="py-2.5 bg-[#0084ff] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>{lang === 'bn' ? 'অডিও কল' : 'Audio Call'}</span>
              </button>
              <button
                onClick={() => {
                  setShowPartnerProfileModal(false);
                  onStartCall('video');
                }}
                className="py-2.5 bg-[#242526] hover:bg-zinc-800 text-white border border-zinc-700/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Video className="w-4 h-4 text-[#0084ff]" />
                <span>{lang === 'bn' ? 'ভিডিও কল' : 'Video Call'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowPartnerProfileModal(false)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Chat Info / Options Modal */}
      {showChatInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={partner.photoURL}
                  alt={partner.displayName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {partner.displayName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {partner.status === 'online'
                      ? (lang === 'bn' ? 'সক্রিয় আছেন' : 'Active now')
                      : (lang === 'bn' ? 'অফলাইন' : 'Offline')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatInfoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
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
                className="w-full p-3 bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-left transition-all text-white group cursor-pointer"
              >
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{lang === 'bn' ? 'চ্যাট হেডে ওপেন করুন' : 'Open in Chat Head'}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'ফ্লোটিং বাবল হিসেবে বাবল মোড চালু করুন' : 'Enable floating chat bubble overlay'}</div>
                </div>
              </button>

              {/* Option 2: View Profile */}
              <button
                onClick={() => {
                  setShowChatInfoModal(false);
                  setShowPartnerProfileModal(true);
                }}
                className="w-full p-3 bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-left transition-all text-white group cursor-pointer"
              >
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'ব্যবহারকারীর তথ্য ও পরিচিতি' : 'See contact & encryption details'}</div>
                </div>
              </button>

              {/* Option 3: Audio Call */}
              <button
                onClick={() => {
                  setShowChatInfoModal(false);
                  onStartCall('audio');
                }}
                className="w-full p-3 bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-left transition-all text-white group cursor-pointer"
              >
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{lang === 'bn' ? 'অডিও কল করুন' : 'Audio Call'}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'সরাসরি অডিও কল শুরু করুন' : 'Start E2EE audio call'}</div>
                </div>
              </button>

              {/* Option 4: Video Call */}
              <button
                onClick={() => {
                  setShowChatInfoModal(false);
                  onStartCall('video');
                }}
                className="w-full p-3 bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-left transition-all text-white group cursor-pointer"
              >
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{lang === 'bn' ? 'ভিডিও কল করুন' : 'Video Call'}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'সরাসরি ভিডিও কল শুরু করুন' : 'Start HD video call'}</div>
                </div>
              </button>

              {/* Option 5: Inspect Ciphertext Toggle */}
              <button
                onClick={() => {
                  setInspectCiphertext(!inspectCiphertext);
                  setShowChatInfoModal(false);
                }}
                className="w-full p-3 bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-left transition-all text-white group cursor-pointer"
              >
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  {inspectCiphertext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    {inspectCiphertext
                      ? (lang === 'bn' ? 'ডিক্রিপ্টেড ভিউতে ফিরুন' : 'Show Decrypted Text')
                      : (lang === 'bn' ? 'এনক্রিপ্টেড সাইফারটেক্সট দেখুন' : 'Inspect Ciphertext')}
                  </div>
                  <div className="text-[10px] text-slate-400">
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
                className="w-full p-3 bg-slate-950/90 hover:bg-red-950/40 border border-slate-800/80 hover:border-red-900/60 rounded-2xl flex items-center gap-3 text-left transition-all text-red-400 group cursor-pointer"
              >
                <div className="p-2 bg-red-500/10 text-red-400 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{lang === 'bn' ? 'সমস্ত চ্যাট ডিলেট করুন' : 'Clear Conversation'}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'এই চ্যাটের সমস্ত মেসেজ মুছে ফেলুন' : 'Permanently remove message history'}</div>
                </div>
              </button>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowChatInfoModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
