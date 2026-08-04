import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props!: Props;
  state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('e2ee_messenger_auth_session_uid');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-white">
              অ্যাপে সাময়িক ত্রুটি দেখা দিয়েছে
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              অনুগ্রহ করে নিচের বাটনে চাপ দিয়ে অ্যাপস রিফ্রেশ করুন।
            </p>

            {this.state.error?.message && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-2xl text-[11px] font-mono text-red-300 text-left break-all">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>অ্যাপ রিস্টার্ট ও রিফ্রেশ করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
