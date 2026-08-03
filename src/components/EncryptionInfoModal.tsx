import React from 'react';
import { ShieldCheck, Lock, Key, Server, CheckCircle2, X } from 'lucide-react';

interface EncryptionInfoModalProps {
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const EncryptionInfoModal: React.FC<EncryptionInfoModalProps> = ({
  onClose,
  lang,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              {lang === 'bn' ? 'প্রান্তিক নিরাপত্তা প্রযুক্তি (E2EE)' : 'End-to-End Encryption Architecture'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[80vh] space-y-4 text-xs text-slate-300">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-300 text-xs">
                {lang === 'bn' ? 'কীভাবে আপনার বার্তা সুরক্ষিত থাকে?' : 'How is your conversation protected?'}
              </h4>
              <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                {lang === 'bn'
                  ? 'এই মেসেঞ্জার অ্যাপটিতে প্রতিটি ব্যবহারকারীর জন্য TweetNaCl-util ভিত্তিক জেনারেটেড Curve25519 Public & Secret KeyPair ব্যবহৃত হয়। মেসেজ প্রেরণের আগে সেটি প্রাপকের পাবলিক কি দিয়ে ডিভাইস পর্যায়েই এনক্রিপ্ট হয়ে যায়।'
                  : 'This messenger uses TweetNaCl Curve25519 public & secret key pairs. Every message is encrypted directly on your device before transmission using the recipient’s public key.'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">
                  {lang === 'bn' ? 'ডিভাইসে সংরক্ষিত প্রাইভেট কি' : 'Private Key Saved Locally'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'আপনার Secret Key শুধুমাত্র আপনার ব্রাউজারে সংরক্ষিত থাকে, যা কখনো কোনো কেন্দ্রীয় সার্ভারে প্রেরিত হয় না।'
                    : 'Your secret key never leaves your device or browser storage.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <Server className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">
                  {lang === 'bn' ? 'সার্ভারে সাইফারটেক্সট রূপ' : 'Ciphertext in Transmission'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'নেটওয়ার্ক বা ডাটাবেজে বার্তাগুলো শুধুমাত্র অবোধ্য অক্ষর (Cyphertext) হিসেবে দেখা যায়।'
                    : 'Network packets and database entries store unreadable base64 cipher text.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">
                  {lang === 'bn' ? 'সাইফারটেক্সট ইনস্পেকশন মোড' : 'Inspect Ciphertext Mode'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'চ্যাট উইন্ডোর "সাইফারটেক্সট" বোতামে ক্লিক করে আসল এনক্রিপ্টেড ডাটা ইনস্পেক্ট করতে পারেন।'
                    : 'Click the "Ciphertext" button in any chat to inspect the raw encrypted base64 payload.'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md transition-colors text-xs mt-2"
          >
            {lang === 'bn' ? 'ঠিক আছে, বুঝতে পেরেছি' : 'Got it, thanks!'}
          </button>
        </div>
      </div>
    </div>
  );
};
