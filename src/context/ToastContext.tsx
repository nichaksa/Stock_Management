import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastItem = { id, type, title, message };
    
    setToasts(prev => [...prev.slice(-4), newToast]); // keep max 5

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-modal animate-fade-in transition-all duration-200 ${
              toast.type === 'success'
                ? 'bg-white dark:bg-app-darkSurface border-gr/30 text-app-text dark:text-app-darkText'
                : toast.type === 'error'
                ? 'bg-white dark:bg-app-darkSurface border-gi/30 text-app-text dark:text-app-darkText'
                : toast.type === 'warning'
                ? 'bg-white dark:bg-app-darkSurface border-warn/30 text-app-text dark:text-app-darkText'
                : 'bg-white dark:bg-app-darkSurface border-brand-blue/30 text-app-text dark:text-app-darkText'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-gr" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-gi" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warn" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-brand-blue" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-app-secondary dark:text-app-darkSecondary mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-app-muted hover:text-app-text dark:hover:text-app-darkText transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
