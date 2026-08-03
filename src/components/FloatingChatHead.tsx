import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Ban, MessageSquare, ChevronDown, Users } from 'lucide-react';
import { UserProfile, Message } from '../types';
import { getUnreadCount, sendTextMessage, subscribeToMessages, markMessagesAsRead, getConversationsForUser } from '../services/chatService';
import { decryptMessage } from '../services/encryptionService';

interface FloatingChatHeadProps {
  currentUser: UserProfile;
  partners: UserProfile[];
  selectedPartner: UserProfile | null;
  onSelectPartner: (partnerId: string) => void;
  onCloseFloatingHead: () => void;
  lang: 'bn' | 'en';
}

export const FloatingChatHead: React.FC<FloatingChatHeadProps> = ({
  currentUser,
  partners,
  selectedPartner,
  onSelectPartner,
  onCloseFloatingHead,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [internalPartnerId, setInternalPartnerId] = useState<string | null>(selectedPartner?.uid || null);
  const [showSelectorDropdown, setShowSelectorDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPartner) {
      setInternalPartnerId(selectedPartner.uid);
    }
  }, [selectedPartner?.uid]);

  // Determine active partner dynamically (prefer explicitly selected partner or most recent conversation)
  const conversations = getConversationsForUser(currentUser.uid);
  let activePartnerCandidate =
    selectedPartner ||
    partners.find((p) => p.uid === internalPartnerId);

  if (!activePartnerCandidate && conversations.length > 0) {
    activePartnerCandidate = partners.find((p) => p.uid === conversations[0].uid) || null;
  }

  const activePartner = activePartnerCandidate || null;

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

  useEffect(() => {
    if (isOpen && activePartner) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activePartner]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartner) return;

    const textToSend = inputText.trim();
    setInputText('');

    await sendTextMessage(
      currentUser.uid,
      activePartner.uid,
      textToSend,
      activePartner.publicKey,
      currentUser.secretKey
    );
  };

  const unreadCount = activePartner ? getUnreadCount(currentUser.uid, activePartner.uid) : 0;

  const handleSwitchPartner = (pid: string) => {
    setInternalPartnerId(pid);
    onSelectPartner(pid);
    setShowSelectorDropdown(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Quick Chat Window Overlay */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[480px] animate-fadeIn relative">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white relative z-20">
            {activePartner ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setShowSelectorDropdown(!showSelectorDropdown)}
                  className="flex items-center gap-2 hover:bg-slate-800 p-1 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={activePartner.photoURL}
                      alt={activePartner.displayName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/60"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                        activePartner.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                      <span>{activePartner.displayName}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-emerald-400" />
                      <span>
                        {activePartner.status === 'online'
                          ? (lang === 'bn' ? 'অনলাইন' : 'Active now')
                          : (lang === 'bn' ? 'অফলাইন' : 'Offline')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs font-bold text-white">
                  {lang === 'bn' ? 'চ্যাট নির্বাচন করুন' : 'Select a Chat'}
                </h3>
              </div>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={lang === 'bn' ? 'মিনিমাইজ করুন' : 'Minimize'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact Switcher Dropdown Sheet */}
          {showSelectorDropdown && (
            <div className="absolute top-14 left-0 right-0 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md z-30 max-h-60 overflow-y-auto divide-y divide-slate-800/60 animate-fadeIn">
              <div className="p-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'bn' ? 'কন্টাক্ট নির্বাচন করুন:' : 'Select Contact:'}</span>
              </div>
              {partners.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {lang === 'bn' ? 'কোনো কন্টাক্ট পাওয়া যায়নি' : 'No contacts found'}
                </div>
              ) : (
                partners.map((p) => (
                  <button
                    key={p.uid}
                    onClick={() => handleSwitchPartner(p.uid)}
                    className={`w-full p-2.5 flex items-center gap-2.5 hover:bg-slate-800 text-left transition-colors cursor-pointer ${
                      activePartner?.uid === p.uid ? 'bg-blue-600/20 text-white font-bold' : 'text-slate-300'
                    }`}
                  >
                    <img src={p.photoURL} alt={p.displayName} className="w-7 h-7 rounded-full object-cover" />
                    <div className="flex-1 min-w-0 text-xs truncate">
                      <div className="truncate">{p.displayName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Messages Container OR Select Partner List */}
          {!activePartner ? (
            <div className="flex-1 p-4 bg-slate-950 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-400 text-center font-medium">
                {lang === 'bn' ? 'চ্যাট করার জন্য একজন কন্টাক্ট নির্বাচন করুন:' : 'Select a contact to start messaging:'}
              </p>
              <div className="space-y-2">
                {partners.map((p) => (
                  <button
                    key={p.uid}
                    onClick={() => handleSwitchPartner(p.uid)}
                    className="w-full p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group"
                  >
                    <img src={p.photoURL} alt={p.displayName} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{p.displayName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{p.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Messages Container */}
              <div className="flex-1 p-3 overflow-y-auto bg-slate-950 space-y-2.5 text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-slate-500">
                      {lang === 'bn' ? 'এখনই মেসেজ পাঠিয়ে চ্যাট শুরু করুন' : 'Send a message to start chatting'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;

                    if (msg.isDeletedForEveryone) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[80%] rounded-2xl px-3 py-1.5 text-xs bg-slate-900/60 border border-slate-800 text-slate-500 italic flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>
                              {isMe
                                ? (lang === 'bn' ? 'মেসেজটি রিমুভ করেছেন' : 'You removed this message')
                                : (lang === 'bn' ? 'মেসেজটি রিমুভ করা হয়েছে' : 'This message was removed')}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    let decryptedText = '';
                    if (msg.text) {
                      decryptedText = isMe
                        ? decryptMessage(msg.text, activePartner.publicKey, currentUser.secretKey)
                        : decryptMessage(msg.text, activePartner.publicKey, currentUser.secretKey);
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-slate-900 text-slate-100 rounded-bl-xs border border-slate-800'
                          }`}
                        >
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
                              isMe ? 'text-blue-200' : 'text-slate-500'
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={lang === 'bn' ? 'মেসেজ লিখুন...' : 'Type a message...'}
                  className="flex-1 bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Circle Bubble Icon */}
      <div className="relative group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-13 h-13 rounded-full bg-slate-900 p-0.5 shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center ring-2 ring-blue-500/70 cursor-pointer"
        >
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden relative">
            {activePartner ? (
              <img
                src={activePartner.photoURL}
                alt={activePartner.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <MessageSquare className="w-6 h-6 text-blue-400" />
            )}
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-md">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Close Floating Head toggle button */}
        <button
          onClick={onCloseFloatingHead}
          className="absolute -top-1 -left-1 bg-slate-800 text-slate-400 hover:text-white p-1 rounded-full border border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title={lang === 'bn' ? 'চ্যাট হেড বন্ধ করুন' : 'Close Chat Head'}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};


