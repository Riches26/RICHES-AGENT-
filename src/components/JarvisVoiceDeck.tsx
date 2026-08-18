import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Play,
  Square,
  Activity,
  Terminal,
  Cpu,
  Radio,
  Send,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Shield,
  Layers,
  FileCode,
  HardDrive
} from 'lucide-react';
import { processJarvisVoiceCommand, trigger24hCronDigest, publishEventBus } from '../services/api';
import { speakWithBrowserTts, stopAllAudioPlayback, playChimeSound } from '../services/voiceEngine';

interface VoiceDialogue {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  action?: string;
  timestamp: string;
}

export const JarvisVoiceDeck: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(0.88); // Deep masculine resonance
  const [speechRate, setSpeechRate] = useState(0.98); // Natural cadence

  const [dialogueHistory, setDialogueHistory] = useState<VoiceDialogue[]>([
    {
      id: 'd-1',
      sender: 'jarvis',
      text: 'Good day. RICHES AI Operating System online and standing by. How may I assist your engineering workflow?',
      action: 'system_ready',
      timestamp: '18:20:00'
    }
  ]);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported in browser
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setSpokenTranscript(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    speakWithBrowserTts(text, {
      volume: voiceVolume,
      pitch: speechPitch,
      rate: speechRate
    });
  };

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (spokenTranscript.trim()) {
        playChimeSound('success_chord', 0.2);
        handleExecuteVoiceCommand(spokenTranscript);
      }
    } else {
      setSpokenTranscript('');
      stopAllAudioPlayback();
      playChimeSound('listening_start', 0.25);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start warning:', err);
        setIsListening(true);
      }
    }
  };

  const handleExecuteVoiceCommand = async (customCommand?: string) => {
    const commandToRun = customCommand || spokenTranscript;
    if (!commandToRun.trim()) return;

    const userMsg: VoiceDialogue = {
      id: `d-${Date.now()}`,
      sender: 'user',
      text: commandToRun,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setDialogueHistory(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setSpokenTranscript('');

    try {
      const res = await processJarvisVoiceCommand(commandToRun, {
        activeTab: 'voice_os_deck',
        timestamp: new Date().toISOString()
      });

      const responseText = res?.spokenResponse || 'Action executed successfully.';
      const actionTriggered = res?.action || 'voice_response';

      const jarvisMsg: VoiceDialogue = {
        id: `d-${Date.now() + 1}`,
        sender: 'jarvis',
        text: responseText,
        action: actionTriggered,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setDialogueHistory(prev => [...prev, jarvisMsg]);
      speakText(responseText);

      // Trigger actual system automations if matched
      if (actionTriggered === 'trigger_24h_digest') {
        trigger24hCronDigest();
      }
    } catch (e: any) {
      const errorMsg: VoiceDialogue = {
        id: `d-${Date.now() + 2}`,
        sender: 'jarvis',
        text: 'Apologies, I encountered an issue executing that command.',
        action: 'error',
        timestamp: new Date().toLocaleTimeString()
      };
      setDialogueHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAutomations = [
    {
      title: 'Synthesize RISC-V EDA Script',
      cmd: 'Generate SkyWater 130nm synthesis script for RISC-V core with OpenSTA timing constraints',
      icon: Cpu,
      color: 'text-indigo-400 border-indigo-500/30'
    },
    {
      title: 'Run 24h Chat Export & Digest',
      cmd: 'Trigger the 24-hour Firebase Cloud Function chat export and agent activity digest for deejayalex44@gmail.com',
      icon: Radio,
      color: 'text-amber-400 border-amber-500/30'
    },
    {
      title: 'Run System Security Audit',
      cmd: 'Run a security audit on all pending high-risk tool approval queues and API keys',
      icon: Shield,
      color: 'text-emerald-400 border-emerald-500/30'
    },
    {
      title: 'Aggregate Multi-Platform Analytics',
      cmd: 'Aggregate YouTube, TikTok, and Instagram engagement metrics and report ROI',
      icon: Activity,
      color: 'text-cyan-400 border-cyan-500/30'
    }
  ];

  return (
    <div className="space-y-6 font-mono text-slate-200">
      {/* Voice Deck Header & Live Audio Waveform */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Mic className={`w-6 h-6 ${isListening ? 'text-red-400 animate-ping' : 'text-amber-400'}`} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">JARVIS Voice & OS Automation Deck</h2>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded border border-amber-500/40 uppercase">
                  Voice STT / TTS Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Hands-free system automation, voice command interpreter, and audio speech synthesis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                ttsEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{ttsEnabled ? 'Voice TTS Enabled' : 'Muted'}</span>
            </button>

            <button
              onClick={handleToggleListening}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                isListening
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-slate-950" />
                  <span>Voice Command ("Riches")</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Voice Waveform Visualization */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isListening
                    ? 'bg-gradient-to-t from-amber-500 to-red-500'
                    : isProcessing
                    ? 'bg-gradient-to-t from-indigo-500 to-cyan-500'
                    : 'bg-slate-800'
                }`}
                style={{
                  height: isListening
                    ? `${Math.max(6, Math.sin(i * 0.4 + Date.now() * 0.005) * 24 + 14)}px`
                    : isProcessing
                    ? `${Math.max(4, Math.cos(i * 0.6) * 16 + 10)}px`
                    : '6px'
                }}
              />
            ))}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2 shrink-0">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isListening ? 'Listening for voice stream...' : isProcessing ? 'Reasoning...' : 'Mic Ready'}</span>
          </div>
        </div>
      </div>

      {/* Quick OS Action Launcher Pad */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Quick System Automation Action Pad
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickAutomations.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleExecuteVoiceCommand(item.cmd)}
                disabled={isProcessing}
                className="p-3.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-2xl text-left transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 group-hover:border-amber-500/40 transition-all">
                    <Icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                  </div>
                  <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-all" />
                </div>
                <div className="font-bold text-xs text-slate-200 group-hover:text-amber-300">
                  {item.title}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 font-sans">
                  "{item.cmd}"
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Conversation & Voice Dialogue Stream */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              JARVIS Audio & System Command Stream
            </h3>
          </div>

          <span className="text-[10px] text-slate-400">
            {dialogueHistory.length} interactions logged
          </span>
        </div>

        {/* Message Dialogue List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
          {dialogueHistory.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all text-xs ${
                item.sender === 'jarvis'
                  ? 'bg-slate-950/90 border-amber-500/20 text-slate-200 ml-0 mr-8'
                  : 'bg-slate-850 border-slate-700 text-slate-100 ml-8 mr-0'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                <span className={`font-bold uppercase ${item.sender === 'jarvis' ? 'text-amber-400' : 'text-slate-300'}`}>
                  {item.sender === 'jarvis' ? '✦ JARVIS AI OS' : 'User (Voice Command)'}
                </span>
                <span>{item.timestamp}</span>
              </div>

              <p className="font-sans text-xs leading-relaxed">
                {item.text}
              </p>

              {item.action && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-amber-300 font-mono">
                    Action: {item.action}
                  </span>

                  {item.sender === 'jarvis' && ttsEnabled && (
                    <button
                      onClick={() => speakText(item.text)}
                      className="text-slate-400 hover:text-amber-300 flex items-center gap-1 text-[10px]"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Replay Voice</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Manual Text / Voice Command Bar */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteVoiceCommand();
            }}
            className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-amber-500 transition-all"
          >
            <input
              type="text"
              value={spokenTranscript}
              onChange={(e) => setSpokenTranscript(e.target.value)}
              placeholder="Speak command or type e.g. 'Synthesize 32-bit ALU' or 'Run security audit'..."
              className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-200 outline-none font-mono"
            />

            <button
              type="submit"
              disabled={isProcessing || !spokenTranscript.trim()}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition-all disabled:opacity-40"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
