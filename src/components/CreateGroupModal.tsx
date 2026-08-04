import React, { useState } from 'react';
import { Users, Plus, Check, X, Shield, Sparkles, MessageSquare } from 'lucide-react';
import { UserProfile, Group } from '../types';
import { createGroup } from '../services/chatService';

interface CreateGroupModalProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
  lang: 'bn' | 'en';
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  currentUser,
  allUsers,
  onClose,
  onGroupCreated,
  lang,
}) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Other users available to add
  const otherUsers = allUsers.filter((u) => u.uid !== currentUser.uid);

  const toggleMember = (uid: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError(
        lang === 'bn'
          ? 'অনুগ্রহ করে গ্রুপের একটি নাম প্রদান করুন।'
          : 'Please enter a group name.'
      );
      return;
    }

    const newGroup = createGroup(
      groupName.trim(),
      description.trim(),
      selectedMemberIds,
      currentUser.uid
    );

    onGroupCreated(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fadeIn relative text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            {lang === 'bn' ? 'নতুন গ্রুপ তৈরি করুন' : 'Create New Group'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              {lang === 'bn' ? 'গ্রুপের নাম' : 'Group Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                lang === 'bn'
                  ? 'যেমন: বন্ধু মহল, ফ্যামিলি গ্রুপ, প্রজেক্ট ডিসকাশন...'
                  : 'e.g. Friends Circle, Family Group...'
              }
              autoFocus
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Group Description / Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {lang === 'bn' ? 'বিবরণ বা বিষয় (ঐচ্ছিক)' : 'Description (Optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'গ্রুপটির মূল বিষয়বস্তু লিখুন...'
                  : 'What is this group about?'
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Select Group Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {lang === 'bn' ? 'সদস্য যুক্ত করুন' : 'Add Members'}
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'bn'
                  ? `${selectedMemberIds.length + 1} জন নির্বাচিত`
                  : `${selectedMemberIds.length + 1} selected`}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1 divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {/* Creator item (Always included) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-900/40">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      {currentUser.displayName}
                      <span className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.2 rounded font-mono font-bold">
                        {lang === 'bn' ? 'আপনি (অ্যাডমিন)' : 'You (Admin)'}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{currentUser.phone}</p>
                  </div>
                </div>
                <Check className="w-4 h-4 text-orange-500 shrink-0" />
              </div>

              {/* Other users directory */}
              {otherUsers.length === 0 ? (
                <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-xs">
                  {lang === 'bn'
                    ? 'অন্য কোন ব্যবহারকারী পাওয়া যায়নি।'
                    : 'No other users registered yet.'}
                </div>
              ) : (
                otherUsers.map((user) => {
                  const isSelected = selectedMemberIds.includes(user.uid);
                  return (
                    <div
                      key={user.uid}
                      onClick={() => toggleMember(user.uid)}
                      className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.displayName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{user.phone}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 font-medium">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'bn' ? 'গ্রুপ তৈরি করুন' : 'Create Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
