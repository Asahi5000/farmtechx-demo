"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Error messages stay longer (15s) so users can copy links, others auto-remove after 4s
        const duration = type === 'error' ? 15000 : 4000;
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    // Listen for session timeout events
    useEffect(() => {
        const handleSessionTimeout = () => {
            showToast('Session Timeout Warning: You will be logged out due to inactivity.', 'warning');
        };

        window.addEventListener('session-timeout', handleSessionTimeout);
        return () => window.removeEventListener('session-timeout', handleSessionTimeout);
    }, [showToast]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg border animate-slide-in ${toast.type === 'success'
                                ? 'bg-white border-green-200'
                                : toast.type === 'warning'
                                    ? 'bg-white border-yellow-200'
                                    : 'bg-white border-red-200'
                            }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : toast.type === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <p className={`text-sm text-gray-900 flex-1 ${toast.type === 'error' ? 'select-all cursor-text break-all' : ''}`}>{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
