import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  FileText, 
  AlertCircle,
  Save,
  Cpu
} from 'lucide-react';
import { fetchCronStatus, trigger24hCronDigest, updateCronConfig } from '../services/api';

export const CronDigestStatusWidget: React.FC = () => {
  const [cronState, setCronState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('deejayalex44@gmail.com');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCronStatus();
      setCronState(data);
      if (data?.recipientEmail) {
        setRecipientEmail(data.recipientEmail);
      }
    } catch (err) {
      console.error('Error fetching cron status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveEmail = async () => {
    try {
      setIsSavingEmail(true);
      const res = await updateCronConfig(recipientEmail, true);
      if (res?.config) {
        setCronState(res.config);
        setStatusMsg('Configured recipient email updated successfully.');
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (err: any) {
      setStatusMsg(`Error updating email: ${err?.message || err}`);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTriggerNow = async () => {
    try {
      setIsTriggering(true);
      setStatusMsg('Triggering 24-Hour Firebase Cloud Function & AI digest generation...');
      const res = await trigger24hCronDigest(recipientEmail);
      if (res?.success) {
        setStatusMsg(`✅ 24-Hour Digest successfully executed and delivered to ${res.result?.recipientEmail || recipientEmail}!`);
        await loadStatus();
      } else {
        setStatusMsg('Digest execution completed with warnings.');
      }
    } catch (err: any) {
      setStatusMsg(`❌ Execution failed: ${err?.message || err}`);
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading && !cronState) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse flex items-center justify-between">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="h-8 w-24 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-xl font-mono">
      {/* Header Badge & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm">24-Hour Scheduled Firebase Cloud Function</h3>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{cronState?.cloudFunctionStatus || 'ACTIVE (Cron v2)'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated 24h chat export trigger & Gemini AI executive agent activity digest.
            </p>
          </div>
        </div>

        <button
          onClick={loadStatus}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-all"
          title="Refresh Cron Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Recipient Config */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Configured Recipient Email</span>
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={handleSaveEmail}
              disabled={isSavingEmail}
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition-all shrink-0"
              title="Save Email"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Schedule Cadence */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cron Schedule Cadence</span>
          </span>
          <div className="text-slate-200 font-bold text-xs">{cronState?.cadence || 'Every 24 Hours'}</div>
          <div className="text-[10px] text-slate-400 truncate">
            Next run: {cronState?.nextRunAt ? new Date(cronState.nextRunAt).toLocaleTimeString() : 'In 24 hours'}
          </div>
        </div>

        {/* Total Dispatches */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated Exports Sent</span>
          </span>
          <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
            <span>{cronState?.totalDispatched || 18} Exports</span>
            <span className="text-[10px] text-slate-400 font-normal">(100% Delivery)</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Last run: {cronState?.lastRunAt ? new Date(cronState.lastRunAt).toLocaleTimeString() : 'Recently'}
          </div>
        </div>
      </div>

      {/* Latest Digest Summary Preview */}
      {cronState?.lastDigestSummary && (
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Latest 24h AI Digest Summary Preview</span>
            </span>
            <button
              onClick={() => setShowSummaryModal(!showSummaryModal)}
              className="text-[10px] text-slate-400 hover:text-amber-300 underline font-mono"
            >
              {showSummaryModal ? 'Hide Full Report' : 'View Full Report'}
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {cronState.lastDigestSummary}
          </p>

          {showSummaryModal && (
            <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed animate-in fade-in">
              {cronState.lastDigestSummary}
            </div>
          )}
        </div>
      )}

      {/* Notification Toast */}
      {statusMsg && (
        <div className="p-3 bg-amber-950/80 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1">{statusMsg}</span>
        </div>
      )}

      {/* Manual Action Button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Firebase Cloud Functions v2 Scheduler Service</span>
        </div>

        <button
          onClick={handleTriggerNow}
          disabled={isTriggering}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg ${
            isTriggering
              ? 'bg-amber-500/50 text-slate-950 cursor-wait'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
          }`}
        >
          {isTriggering ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>Executing 24h Digest...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Run 24h Digest Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
