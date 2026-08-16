import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X, 
  Cpu, 
  Sparkles,
  Zap,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { eventBus, ToastEventPayload } from '../services/eventBus';

export interface ToastItem extends ToastEventPayload {
  id: string;
  createdAt: number;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = eventBus.on('toast:show', (payload: ToastEventPayload) => {
      const id = payload.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        ...payload,
        id,
        createdAt: Date.now(),
        duration: payload.duration || (payload.type === 'error' ? 8000 : 4500)
      };

      setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep max 5 active toasts
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none font-mono">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 4500;
    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, intervalTime);

    return () => {
      clearTimeout(dismissTimer);
      clearInterval(interval);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10',
          iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          progressBg: 'bg-emerald-500',
          titleColor: 'text-emerald-300'
        };
      case 'error':
        return {
          bg: 'bg-slate-900/95 border-red-500/50 text-slate-100 shadow-red-500/10',
          iconBg: 'bg-red-500/15 text-red-400 border border-red-500/30',
          icon: <XCircle className="w-4 h-4 text-red-400" />,
          progressBg: 'bg-red-500',
          titleColor: 'text-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-slate-900/95 border-amber-500/50 text-slate-100 shadow-amber-500/10',
          iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          progressBg: 'bg-amber-500',
          titleColor: 'text-amber-300'
        };
      default:
        return {
          bg: 'bg-slate-900/95 border-blue-500/40 text-slate-100 shadow-blue-500/10',
          iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
          icon: <Info className="w-4 h-4 text-blue-400" />,
          progressBg: 'bg-blue-500',
          titleColor: 'text-blue-300'
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className={`pointer-events-auto rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-300 flex flex-col gap-2.5 relative overflow-hidden ${style.bg}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-xl shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className={`text-xs font-bold leading-none ${style.titleColor}`}>
                {toast.title}
              </h4>
              {toast.agent && (
                <span className="px-1.5 py-0.2 bg-slate-800 text-amber-400 border border-slate-700 text-[9px] font-bold rounded">
                  @{toast.agent}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed break-words">
              {toast.message}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons if provided (e.g. Auto-Retry with Different Parameters) */}
      {(toast.action || toast.secondaryAction) && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{toast.action.label}</span>
            </button>
          )}

          {toast.secondaryAction && (
            <button
              onClick={() => {
                toast.secondaryAction?.onClick();
                onDismiss(toast.id);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>{toast.secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Countdown Progress Bar */}
      <div className="w-full bg-slate-950/80 h-1 rounded-full overflow-hidden">
        <div
          style={{ width: `${progress}%` }}
          className={`h-full transition-all duration-75 ${style.progressBg}`}
        />
      </div>
    </div>
  );
};
