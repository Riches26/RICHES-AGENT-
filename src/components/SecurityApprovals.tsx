import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle,
  History,
  Plus,
  RefreshCw
} from 'lucide-react';
import { PendingApproval } from '../types';
import { decideApproval, createProposal, fetchAnalytics, fetchPendingApprovals } from '../services/api';

interface SecurityApprovalsProps {
  approvals?: PendingApproval[];
  setApprovals: React.Dispatch<React.SetStateAction<PendingApproval[]>>;
}

export const SecurityApprovals: React.FC<SecurityApprovalsProps> = ({
  approvals = [],
  setApprovals
}) => {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // New proposal form state
  const [newAction, setNewAction] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newRiskLevel, setNewRiskLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [newAgentId, setNewAgentId] = useState('security');

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [pendingList, analyticsData] = await Promise.all([
        fetchPendingApprovals(),
        fetchAnalytics()
      ]);
      setApprovals(pendingList);
      
      // Filter analytics events that represent security actions or task resolutions
      if (analyticsData?.recentEvents) {
        setAuditLog(analyticsData.recentEvents);
      }
    } catch (e) {
      console.error('Error loading real-time security data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Live polling every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDecide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await decideApproval(id, decision);
      setApprovals(prev => prev.filter(a => a.id !== id));
      await loadData();
    } catch (e) {
      console.error('Error deciding approval:', e);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.trim()) return;

    try {
      const created = await createProposal({
        action: newAction,
        details: newDetails || 'Operator proposed high-risk security checkpoint',
        riskLevel: newRiskLevel,
        agentId: newAgentId,
        payload: { source: 'Operator Manual Proposal', timestamp: new Date().toISOString() }
      });
      setApprovals(prev => [created, ...prev]);
      setShowProposalModal(false);
      setNewAction('');
      setNewDetails('');
    } catch (e) {
      console.error('Error creating proposal:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Security & Human-in-the-Loop Approval Queue</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-red-500/20 text-red-300 rounded-full font-semibold">
                Live Zero-Trust
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Synchronized directly with Firebase Firestore database approvals and security audit trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
            title="Refresh Firestore Security Records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowProposalModal(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Security Action</span>
          </button>

          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
            Pending Review: <strong className="text-red-400">{approvals.length}</strong>
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="p-5 bg-slate-900 rounded-2xl border border-amber-500/40 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Propose High-Risk Operation Checkpoint</span>
            </h3>
            <button 
              onClick={() => setShowProposalModal(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono"
            >
              Cancel ✕
            </button>
          </div>

          <form onSubmit={handleCreateProposal} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-mono">Action Name</label>
              <input
                type="text"
                required
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="e.g., Run Container Migration Script"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono">Operation Details</label>
              <textarea
                rows={2}
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Describe execution parameters and potential system impacts..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Risk Level</label>
                <select
                  value={newRiskLevel}
                  onChange={(e: any) => setNewRiskLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Requesting Agent</label>
                <select
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="security">@security</option>
                  <option value="builder">@builder</option>
                  <option value="communications">@communications</option>
                  <option value="database">@database</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all font-mono"
              >
                Submit Proposal to Firestore
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Approvals */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Pending High-Risk Operation Proposals</span>
        </h2>

        {approvals.length === 0 ? (
          <div className="p-8 bg-slate-900/40 rounded-2xl border border-slate-800 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-200">Zero Pending Approval Requests</p>
            <p className="text-xs text-slate-400">All agent executions are clear and stored in Firestore.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map(appr => (
              <div key={appr.id} className="p-5 bg-slate-900/90 rounded-2xl border border-red-500/30 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded uppercase border border-red-500/30">
                      {appr.riskLevel} Risk
                    </span>
                    <span>{appr.action}</span>
                    <span className="text-amber-400">(@{appr.agentId})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Proposed: {appr.timestamp}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{appr.details}</p>

                {/* Payload details */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <span className="text-slate-500">// Firestore Operation Payload</span>
                  <p>{JSON.stringify(appr.payload)}</p>
                </div>

                {/* Decisions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleDecide(appr.id, 'rejected')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all font-mono"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject & Terminate</span>
                  </button>

                  <button
                    onClick={() => handleDecide(appr.id, 'approved')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Authorize Execution</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Audit Logs */}
      <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between font-mono">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span>Firestore Security Audit & Event Log</span>
          </span>
          <span className="text-xs text-slate-500">Source: Firestore system_events</span>
        </h2>

        <div className="space-y-2 font-mono text-xs">
          {auditLog.length === 0 ? (
            <p className="text-slate-500 text-xs">No audit events logged yet in Firestore.</p>
          ) : (
            auditLog.map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">{log.type || 'security.event'}</span>
                  <span className="text-[10px] text-slate-500">Source: @{log.source || 'system'} • {log.timestamp}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {log.priority || 'logged'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

