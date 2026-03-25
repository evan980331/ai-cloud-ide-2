'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught Error:', error, errorInfo);
        // You can also log to an error reporting service here like Sentry
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center text-white font-sans p-8">
                    <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl shadow-red-500/10 animate-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-red-400 mb-2">Oops! System Crash</h1>
                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            We encountered an unexpected error. Please refresh the page to continue. Your work is safely backed up in the cloud.
                        </p>
                        <div className="w-full bg-black/50 p-4 rounded-xl text-left border border-white/5 overflow-auto max-h-32 mb-8 custom-scrollbar">
                            <p className="text-[10px] text-red-300/70 font-mono break-all font-black">[Runtime Error] {this.state.error?.message}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <RefreshCcw size={16} /> Reboot System
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
