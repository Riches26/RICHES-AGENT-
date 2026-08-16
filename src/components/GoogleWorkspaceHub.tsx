import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar as CalendarIcon,
  HardDrive,
  CheckSquare,
  MessageSquare,
  RefreshCw,
  Plus,
  Send,
  LogOut,
  AlertTriangle,
  User as UserIcon,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Lock,
  X
} from 'lucide-react';
import { googleSignIn, logout, getAccessToken, initAuth } from '../lib/firebase';
import { User } from 'firebase/auth';
import {
  listGmailMessages,
  sendGmailMessage,
  listCalendarEvents,
  createCalendarEvent,
  listDriveFiles,
  listTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  listChatSpaces,
  sendChatMessage,
  GmailMessage,
  CalendarEvent,
  DriveFile,
  TaskItem,
  ChatSpace
} from '../services/workspace';

export const GoogleWorkspaceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'calendar' | 'drive' | 'tasks' | 'chat'>('gmail');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);

  // Modals & Confirmation States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {}
  });

  // Forms
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [showComposeEmail, setShowComposeEmail] = useState(false);

  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    start: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    end: new Date(Date.now() + 7200000).toISOString().slice(0, 16)
  });
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const [taskForm, setTaskForm] = useState({ title: '', notes: '', due: '' });
  const [showCreateTask, setShowCreateTask] = useState(false);

  const [chatForm, setChatForm] = useState({ spaceName: '', text: '' });
  const [showSendChat, setShowSendChat] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (accessToken) {
      loadTabData();
    }
  }, [accessToken, activeTab]);

  const loadTabData = async () => {
    const token = accessToken || getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'gmail') {
        const msgs = await listGmailMessages(token);
        setGmailMessages(msgs);
      } else if (activeTab === 'calendar') {
        const evts = await listCalendarEvents(token);
        setCalendarEvents(evts);
      } else if (activeTab === 'drive') {
        const files = await listDriveFiles(token);
        setDriveFiles(files);
      } else if (activeTab === 'tasks') {
        const taskItems = await listTasks(token);
        setTasks(taskItems);
      } else if (activeTab === 'chat') {
        const spaces = await listChatSpaces(token);
        setChatSpaces(spaces);
      }
    } catch (err: any) {
      console.warn(`Notice loading ${activeTab} data:`, err?.message || err);
      const isAuthError = err?.message?.toLowerCase().includes('expired') || err?.message?.toLowerCase().includes('unauthorized') || err?.message?.toLowerCase().includes('401');
      if (isAuthError) {
        setAccessToken(null);
        setError('Your Google Workspace authorization has expired. Please click "Sign in with Google" to refresh.');
      } else {
        setError(err?.message || `Failed to fetch ${activeTab} data from Google API.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setGmailMessages([]);
    setCalendarEvents([]);
    setDriveFiles([]);
    setTasks([]);
    setChatSpaces([]);
  };

  // --- ACTIONS WITH CONFIRMATION DIALOGS ---

  const requestSendEmail = () => {
    if (!emailForm.to || !emailForm.subject) {
      alert('Recipient and subject are required.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Send Email via Gmail',
      description: `Are you sure you want to send this email to "${emailForm.to}" with subject "${emailForm.subject}"?`,
      onConfirm: async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
          await sendGmailMessage(accessToken, emailForm.to, emailForm.subject, emailForm.body);
          setEmailForm({ to: '', subject: '', body: '' });
          setShowComposeEmail(false);
          await loadTabData();
        } catch (err: any) {
          setError(err?.message || 'Failed to send email.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const requestCreateEvent = () => {
    if (!eventForm.summary) {
      alert('Event summary is required.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Create Google Calendar Event',
      description: `Schedule meeting "${eventForm.summary}" starting at ${new Date(eventForm.start).toLocaleString()}?`,
      onConfirm: async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
          await createCalendarEvent(accessToken, eventForm.summary, eventForm.description, eventForm.start, eventForm.end);
          setEventForm({ summary: '', description: '', start: '', end: '' });
          setShowCreateEvent(false);
          await loadTabData();
        } catch (err: any) {
          setError(err?.message || 'Failed to create calendar event.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const requestCreateTask = () => {
    if (!taskForm.title) {
      alert('Task title is required.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Create Google Task',
      description: `Add task "${taskForm.title}" to your primary Google Task List?`,
      onConfirm: async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
          await createGoogleTask(accessToken, taskForm.title, taskForm.notes, taskForm.due);
          setTaskForm({ title: '', notes: '', due: '' });
          setShowCreateTask(false);
          await loadTabData();
        } catch (err: any) {
          setError(err?.message || 'Failed to create task.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const requestToggleTaskStatus = (task: TaskItem) => {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    setConfirmModal({
      isOpen: true,
      title: task.status === 'completed' ? 'Reopen Google Task' : 'Mark Task Completed',
      description: `Are you sure you want to mark task "${task.title}" as ${nextStatus}?`,
      onConfirm: async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
          await updateGoogleTaskStatus(accessToken, task.id, task.status !== 'completed');
          await loadTabData();
        } catch (err: any) {
          setError(err?.message || 'Failed to update task status.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const requestSendChatMessage = () => {
    if (!chatForm.spaceName || !chatForm.text) {
      alert('Space selection and message text are required.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Send Google Chat Message',
      description: `Post message to space "${chatForm.spaceName}"?`,
      onConfirm: async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
          await sendChatMessage(accessToken, chatForm.spaceName, chatForm.text);
          setChatForm({ spaceName: '', text: '' });
          setShowSendChat(false);
          await loadTabData();
        } catch (err: any) {
          setError(err?.message || 'Failed to send Google Chat message.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="p-4 md:p-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-mono">
              Google Workspace Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time integration for Gmail, Google Calendar, Google Drive, Google Tasks & Google Chat
          </p>
        </div>

        {/* Auth State & Action */}
        <div className="flex items-center gap-3">
          {accessToken && user ? (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">{user.displayName || user.email}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> OAuth Connected
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Disconnect Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <UserIcon className="w-4 h-4" />
              {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 md:px-6 pt-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('gmail')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'gmail'
              ? 'bg-slate-800/80 text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Mail className="w-4 h-4" /> Gmail Inbox
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'calendar'
              ? 'bg-slate-800/80 text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendar
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'drive'
              ? 'bg-slate-800/80 text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <HardDrive className="w-4 h-4" /> Google Drive
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'tasks'
              ? 'bg-slate-800/80 text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Google Tasks
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'chat'
              ? 'bg-slate-800/80 text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Google Chat
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 md:mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Content Body */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
        {!accessToken ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Google Workspace Authentication Required</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Connect your Google Account to access Gmail messages, Google Calendar schedules, Google Drive files, Google Tasks, and Google Chat spaces.
            </p>
            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        ) : (
          <>
            {/* Control Sub-Bar */}
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <span className="capitalize text-amber-400 font-bold">{activeTab}</span> Module
                {loading && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadTabData}
                  disabled={loading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>

                {activeTab === 'gmail' && (
                  <button
                    onClick={() => setShowComposeEmail(!showComposeEmail)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Compose Email
                  </button>
                )}

                {activeTab === 'calendar' && (
                  <button
                    onClick={() => setShowCreateEvent(!showCreateEvent)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule Event
                  </button>
                )}

                {activeTab === 'tasks' && (
                  <button
                    onClick={() => setShowCreateTask(!showCreateTask)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                )}

                {activeTab === 'chat' && (
                  <button
                    onClick={() => setShowSendChat(!showSendChat)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Chat Msg
                  </button>
                )}
              </div>
            </div>

            {/* GMAIL TAB */}
            {activeTab === 'gmail' && (
              <div className="space-y-4">
                {showComposeEmail && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Compose New Gmail</h4>
                      <button onClick={() => setShowComposeEmail(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="email"
                      placeholder="To (recipient@example.com)"
                      value={emailForm.to}
                      onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      value={emailForm.subject}
                      onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <textarea
                      rows={4}
                      placeholder="Email Body Content..."
                      value={emailForm.body}
                      onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                    <button
                      onClick={requestSendEmail}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Email via Gmail
                    </button>
                  </div>
                )}

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Inbox Messages ({gmailMessages.length})
                  </div>
                  {gmailMessages.length === 0 ? (
                    <p className="p-8 text-center text-xs text-slate-500">No emails found or inbox is empty.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {gmailMessages.map(msg => (
                        <div key={msg.id} className="p-4 hover:bg-slate-800/40 transition-colors space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-300 truncate max-w-[250px]">{msg.from}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{msg.date}</span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-200">{msg.subject}</h5>
                          <p className="text-xs text-slate-400 line-clamp-2">{msg.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                {showCreateEvent && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Schedule Google Calendar Meeting</h4>
                      <button onClick={() => setShowCreateEvent(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Event Summary / Title"
                      value={eventForm.summary}
                      onChange={e => setEventForm({ ...eventForm, summary: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description or Agenda"
                      value={eventForm.description}
                      onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-mono mb-1 block">Start Time</label>
                        <input
                          type="datetime-local"
                          value={eventForm.start}
                          onChange={e => setEventForm({ ...eventForm, start: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-mono mb-1 block">End Time</label>
                        <input
                          type="datetime-local"
                          value={eventForm.end}
                          onChange={e => setEventForm({ ...eventForm, end: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={requestCreateEvent}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" /> Confirm & Schedule Event
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {calendarEvents.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                      No upcoming calendar events found.
                    </div>
                  ) : (
                    calendarEvents.map(evt => (
                      <div key={evt.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-amber-300">{evt.summary}</h5>
                          {evt.htmlLink && (
                            <a href={evt.htmlLink} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-amber-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {evt.description && <p className="text-xs text-slate-400 line-clamp-2">{evt.description}</p>}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleString() : 'All Day'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* DRIVE TAB */}
            {activeTab === 'drive' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Google Drive Files ({driveFiles.length})
                </div>
                {driveFiles.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">No drive files found.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {driveFiles.map(file => (
                      <div key={file.id} className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 truncate">
                          <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{file.mimeType}</p>
                          </div>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {showCreateTask && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Add Google Task</h4>
                      <button onClick={() => setShowCreateTask(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Task Title"
                      value={taskForm.title}
                      onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes / Instructions"
                      value={taskForm.notes}
                      onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={taskForm.due}
                      onChange={e => setTaskForm({ ...taskForm, due: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={requestCreateTask}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Save Google Task
                    </button>
                  </div>
                )}

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Google Tasks Agenda ({tasks.length})
                  </div>
                  {tasks.length === 0 ? (
                    <p className="p-8 text-center text-xs text-slate-500">No tasks in your Google Task list.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {tasks.map(t => (
                        <div key={t.id} className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={t.status === 'completed'}
                              onChange={() => requestToggleTaskStatus(t)}
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                            <div>
                              <p className={`font-semibold ${t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {t.title}
                              </p>
                              {t.notes && <p className="text-[10px] text-slate-400">{t.notes}</p>}
                            </div>
                          </div>
                          {t.due && <span className="text-[10px] text-slate-500 font-mono">{new Date(t.due).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                {showSendChat && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Post Google Chat Message</h4>
                      <button onClick={() => setShowSendChat(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <select
                      value={chatForm.spaceName}
                      onChange={e => setChatForm({ ...chatForm, spaceName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">Select Google Chat Space...</option>
                      {chatSpaces.map((s, idx) => (
                        <option key={`${s.name}-${idx}`} value={s.name}>
                          {s.displayName} ({s.name})
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      placeholder="Message text..."
                      value={chatForm.text}
                      onChange={e => setChatForm({ ...chatForm, text: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                    <button
                      onClick={requestSendChatMessage}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Post Chat Message
                    </button>
                  </div>
                )}

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Google Chat Spaces ({chatSpaces.length})
                  </div>
                  {chatSpaces.length === 0 ? (
                    <p className="p-8 text-center text-xs text-slate-500">No Google Chat spaces found for account.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {chatSpaces.map(space => (
                        <div key={space.name} className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-amber-400" />
                            <span className="font-semibold text-slate-200">{space.displayName}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{space.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MANDATORY CONFIRMATION DIALOG MODAL FOR MUTATING OPERATIONS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-slate-100">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  await confirmModal.onConfirm();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
