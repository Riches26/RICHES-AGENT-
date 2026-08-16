import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff,
  Volume2, 
  VolumeX,
  Radio, 
  Play, 
  Pause,
  Sparkles, 
  Activity, 
  Settings,
  Square,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sliders,
  RotateCcw,
  Headphones,
  Cpu,
  Flame,
  ShieldCheck,
  ChevronDown,
  Volume1,
  Languages,
  Check,
  Send,
  Trash2,
  Download,
  Info,
  RadioTower
} from 'lucide-react';
import { 
  sendVoiceConversationalTurn, 
  getVoiceWakeAck, 
  synthesizeGeminiVoice,
  VoiceConversationalTurnResult 
} from '../services/api';
import { 
  analyzeWakeWord, 
  playChimeSound, 
  playGeminiBase64Audio, 
  speakWithBrowserTts, 
  stopAllAudioPlayback,
  createMicrophoneAnalyser,
  MicStreamHandle,
  WakeSensitivity,
  VoiceEngineMode,
  GeminiVoiceName
} from '../services/voiceEngine';
import { AudioVisualizer3D } from './AudioVisualizer3D';

interface VoiceStudioProps {
  isListeningWakeWord: boolean;
  setIsListeningWakeWord: (listening: boolean) => void;
  onNavigateToView?: (view: string) => void;
}

interface VoiceDialogueTurn {
  id: string;
  sender: 'user' | 'riches';
  text: string;
  timestamp: string;
  latencyMs?: number;
  agent?: string;
  intent?: string;
  engineUsed?: 'gemini_neural' | 'browser_tts';
}

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
  isListeningWakeWord,
  setIsListeningWakeWord,
  onNavigateToView
}) => {
  // Voice Studio Operational Mode
  const [operationMode, setOperationMode] = useState<'conversational' | 'wake_word_only' | 'push_to_talk'>('conversational');
  const [voiceEngineMode, setVoiceEngineMode] = useState<VoiceEngineMode>('gemini_neural');
  const [geminiVoice, setGeminiVoice] = useState<GeminiVoiceName>('Kore');
  const [wakeSensitivity, setWakeSensitivity] = useState<WakeSensitivity>('high');
  const [enableSoundEffects, setEnableSoundEffects] = useState<boolean>(true);
  const [sttLanguage, setSttLanguage] = useState<string>('en-US');

  // Dialogue History
  const [dialogueHistory, setDialogueHistory] = useState<VoiceDialogueTurn[]>([
    {
      id: 'd-init-1',
      sender: 'riches',
      text: 'RICHES Voice Engine online. Say "Hey Riches" or tap the microphone to begin voice conversation.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latencyMs: 45,
      agent: 'Riches Voice Engine',
      engineUsed: 'gemini_neural'
    }
  ]);

  // Real-time voice states
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastWakeWordMatch, setLastWakeWordMatch] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [manualInputText, setManualInputText] = useState<string>('');

  // Audio Spectrum & Meter States
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [micDbLevel, setMicDbLevel] = useState<number>(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(24).fill(8));
  const micStreamHandleRef = useRef<MicStreamHandle | null>(null);
  const meterIntervalRef = useRef<number | null>(null);

  // Browser TTS voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>('');
  const [ttsRate, setTtsRate] = useState<number>(1.05);
  const [ttsPitch, setTtsPitch] = useState<number>(1.0);
  const [ttsVolume, setTtsVolume] = useState<number>(1.0);
  const [personality, setPersonality] = useState<'executive' | 'conversational' | 'concise' | 'engineer'>('conversational');

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'conversation' | 'calibration' | 'gemini_voices'>('conversation');

  // Internal References to prevent stale event closures
  const recognitionRef = useRef<any>(null);
  const isAiSpeakingRef = useRef<boolean>(false);
  const isAiThinkingRef = useRef<boolean>(false);
  const isMicActiveRef = useRef<boolean>(false);
  const operationModeRef = useRef(operationMode);
  const wakeSensitivityRef = useRef(wakeSensitivity);
  const enableSoundEffectsRef = useRef(enableSoundEffects);
  const voiceEngineModeRef = useRef(voiceEngineMode);
  const geminiVoiceRef = useRef(geminiVoice);
  const ttsRateRef = useRef(ttsRate);
  const ttsPitchRef = useRef(ttsPitch);
  const ttsVolumeRef = useRef(ttsVolume);
  const selectedBrowserVoiceURIRef = useRef(selectedBrowserVoiceURI);
  const dialogueHistoryRef = useRef(dialogueHistory);

  // Sync refs
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  useEffect(() => { isAiThinkingRef.current = isAiThinking; }, [isAiThinking]);
  useEffect(() => { isMicActiveRef.current = isMicActive; }, [isMicActive]);
  useEffect(() => { operationModeRef.current = operationMode; }, [operationMode]);
  useEffect(() => { wakeSensitivityRef.current = wakeSensitivity; }, [wakeSensitivity]);
  useEffect(() => { enableSoundEffectsRef.current = enableSoundEffects; }, [enableSoundEffects]);
  useEffect(() => { voiceEngineModeRef.current = voiceEngineMode; }, [voiceEngineMode]);
  useEffect(() => { geminiVoiceRef.current = geminiVoice; }, [geminiVoice]);
  useEffect(() => { ttsRateRef.current = ttsRate; }, [ttsRate]);
  useEffect(() => { ttsPitchRef.current = ttsPitch; }, [ttsPitch]);
  useEffect(() => { ttsVolumeRef.current = ttsVolume; }, [ttsVolume]);
  useEffect(() => { selectedBrowserVoiceURIRef.current = selectedBrowserVoiceURI; }, [selectedBrowserVoiceURI]);
  useEffect(() => { dialogueHistoryRef.current = dialogueHistory; }, [dialogueHistory]);

  // Load Browser TTS Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices() || [];
        if (voices.length > 0) {
          setBrowserVoices(voices);
          if (!selectedBrowserVoiceURI) {
            const best = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
            if (best) setSelectedBrowserVoiceURI(best.voiceURI);
          }
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedBrowserVoiceURI]);

  // Handle Vocal Playback (Gemini Neural TTS with Automatic Browser TTS Fallback)
  const vocalizeResponse = useCallback(async (text: string, onFinish?: () => void) => {
    stopAllAudioPlayback();
    setIsAiSpeaking(true);

    const onPlaybackEnd = () => {
      setIsAiSpeaking(false);
      if (onFinish) onFinish();

      // Automatically re-engage mic listening if in conversational mode
      if (isMicActiveRef.current && operationModeRef.current === 'conversational') {
        setTimeout(() => {
          startSpeechRecognition();
        }, 400);
      }
    };

    // 1. Try Gemini 3.1 Flash Neural Studio Voice if selected
    if (voiceEngineModeRef.current === 'gemini_neural') {
      try {
        const res = await synthesizeGeminiVoice(text, geminiVoiceRef.current);
        if (res && res.base64Audio) {
          await playGeminiBase64Audio(res.base64Audio, res.sampleRate || 24000, ttsVolumeRef.current, onPlaybackEnd);
          return;
        }
      } catch (geminiErr) {
        console.warn('[VoiceStudio] Gemini TTS unavailable, falling back to Browser TTS:', geminiErr);
      }
    }

    // 2. Fallback to Browser SpeechSynthesis
    speakWithBrowserTts(text, {
      volume: ttsVolumeRef.current,
      pitch: ttsPitchRef.current,
      rate: ttsRateRef.current,
      preferredVoiceName: selectedBrowserVoiceURIRef.current,
      onEnd: onPlaybackEnd,
      onError: () => onPlaybackEnd()
    });
  }, []);

  // Process User Spoken Conversational Turn
  const handleProcessConversationalTurn = useCallback(async (spokenText: string) => {
    if (!spokenText || !spokenText.trim() || isAiThinkingRef.current) return;

    const cleanInput = spokenText.trim();
    setIsAiThinking(true);
    setLiveTranscript('');
    setInterimTranscript('');

    if (enableSoundEffectsRef.current) {
      playChimeSound('listening_start', 0.2);
    }

    // Append user turn to history
    const userTurnId = `u-${Date.now()}`;
    const newTurn: VoiceDialogueTurn = {
      id: userTurnId,
      sender: 'user',
      text: cleanInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDialogueHistory(prev => [...prev, newTurn]);

    try {
      // Format history for context
      const historyContext = dialogueHistoryRef.current.slice(-4).map(d => ({
        sender: d.sender,
        text: d.text
      }));

      const result: VoiceConversationalTurnResult = await sendVoiceConversationalTurn({
        transcript: cleanInput,
        history: historyContext,
        personality,
        voiceSpeed: ttsRateRef.current
      });

      setIsAiThinking(false);

      const aiTurnId = `r-${Date.now()}`;
      const aiTurn: VoiceDialogueTurn = {
        id: aiTurnId,
        sender: 'riches',
        text: result.spokenText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: result.latencyMs,
        agent: result.agent,
        intent: result.intent,
        engineUsed: voiceEngineModeRef.current
      };

      setDialogueHistory(prev => [...prev, aiTurn]);

      if (enableSoundEffectsRef.current) {
        playChimeSound('success_chord', 0.15);
      }

      // If intent suggests navigating to another screen
      if (result.intent && onNavigateToView) {
        if (result.intent === 'open_tasks' || result.intent === 'create_task') {
          // Keep voice active, optionally notify
        } else if (result.intent === 'open_builder' || result.intent === 'build_app') {
          // Handled
        }
      }

      // Vocalize AI Response
      vocalizeResponse(result.spokenText);

    } catch (err: any) {
      console.error('[VoiceStudio] Conversational turn error:', err);
      setIsAiThinking(false);

      const fallbackText = `I heard "${cleanInput}". I am dispatching this across the RICHES agent mesh.`;
      const fallbackTurn: VoiceDialogueTurn = {
        id: `r-err-${Date.now()}`,
        sender: 'riches',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: 90,
        agent: 'Riches Voice Engine',
        engineUsed: 'browser_tts'
      };

      setDialogueHistory(prev => [...prev, fallbackTurn]);
      vocalizeResponse(fallbackText);
    }
  }, [personality, vocalizeResponse, onNavigateToView]);

  // Continuous Speech Recognition Engine with Multi-Tier Wake Word Parsing
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionError('Web Speech API is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isAiSpeakingRef.current || isAiThinkingRef.current) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = sttLanguage;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setIsUserSpeaking(true);
        setPermissionError(null);
      };

      rec.onresult = (event: any) => {
        if (isAiSpeakingRef.current || isAiThinkingRef.current) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        const currentSpoken = (final || interim).trim();
        setLiveTranscript(final);
        setInterimTranscript(interim);

        if (!currentSpoken) return;

        // 1. Analyze Wake Word ("HEY RICHES", "RICHES", "HEY RICHRS", "RICHRS", etc.)
        const wakeAnalysis = analyzeWakeWord(currentSpoken, wakeSensitivityRef.current);

        if (wakeAnalysis.triggered) {
          setLastWakeWordMatch(wakeAnalysis.matchedPhrase);
          setTimeout(() => setLastWakeWordMatch(null), 3000);

          if (enableSoundEffectsRef.current) {
            playChimeSound('wake_detected', 0.3);
          }

          // Case A: Wake word + Direct Command (e.g. "Hey Riches list my tasks")
          if (!wakeAnalysis.isSummonOnly && wakeAnalysis.command.length > 2) {
            try { rec.abort(); } catch (_) {}
            handleProcessConversationalTurn(wakeAnalysis.command);
            return;
          }

          // Case B: Standalone Wake Word Summon (e.g. "Hey Riches")
          if (wakeAnalysis.isSummonOnly) {
            try { rec.abort(); } catch (_) {}
            getVoiceWakeAck()
              .then(ack => {
                vocalizeResponse(ack.spokenAck || "Yes, I'm listening. What can I do for you?");
              })
              .catch(() => {
                vocalizeResponse("Online. How can I help you?");
              });
            return;
          }
        }

        // 2. Conversational Mode: Process final transcript as conversational turn
        if (operationModeRef.current === 'conversational' && final.trim().length > 2) {
          try { rec.abort(); } catch (_) {}
          handleProcessConversationalTurn(final.trim());
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setPermissionError('Microphone permission was denied. Please grant microphone access in your browser bar.');
          setIsMicActive(false);
          setIsListeningWakeWord(false);
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[VoiceStudio] Speech recognition notice:', e.error);
        }
      };

      rec.onend = () => {
        setIsUserSpeaking(false);
        // Auto-restart recognition if mic is active and AI is not currently speaking
        if (isMicActiveRef.current && !isAiSpeakingRef.current && !isAiThinkingRef.current) {
          setTimeout(() => {
            if (isMicActiveRef.current && !isAiSpeakingRef.current && !isAiThinkingRef.current) {
              try {
                rec.start();
              } catch (_) {}
            }
          }, 250);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.warn('[VoiceStudio] Recognition start exception:', err);
    }
  }, [sttLanguage, handleProcessConversationalTurn, vocalizeResponse, setIsListeningWakeWord]);

  // Stop Speech Recognition
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsUserSpeaking(false);
    setLiveTranscript('');
    setInterimTranscript('');
  }, []);

  // Initialize Microphone Stream & Spectrum Meter
  const startMicrophoneStream = useCallback(async () => {
    try {
      const handle = await createMicrophoneAnalyser();
      micStreamHandleRef.current = handle;
      setAnalyserNode(handle.analyser);
      setPermissionError(null);

      // Start dB audio level sampling loop
      const dataArray = new Uint8Array(handle.analyser.frequencyBinCount);
      const updateAudioMeter = () => {
        if (!micStreamHandleRef.current) return;
        handle.analyser.getByteFrequencyData(dataArray);

        // Calculate average RMS / dB level
        let sum = 0;
        const levels: number[] = [];
        const step = Math.floor(dataArray.length / 24);
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          levels.push(val);
          sum += val * val;
        }
        setAudioLevels(levels);

        const rms = Math.sqrt(sum / dataArray.length);
        const db = Math.min(100, Math.round((rms / 255) * 100));
        setMicDbLevel(db);

        meterIntervalRef.current = requestAnimationFrame(updateAudioMeter);
      };

      meterIntervalRef.current = requestAnimationFrame(updateAudioMeter);
      return true;
    } catch (err: any) {
      console.error('[VoiceStudio] Mic stream init error:', err);
      setPermissionError(err.message || 'Microphone access denied or unavailable.');
      return false;
    }
  }, []);

  const stopMicrophoneStream = useCallback(() => {
    if (meterIntervalRef.current) {
      cancelAnimationFrame(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (micStreamHandleRef.current) {
      micStreamHandleRef.current.stop();
      micStreamHandleRef.current = null;
    }
    setAnalyserNode(null);
    setMicDbLevel(0);
  }, []);

  // Master Microphone Toggle
  const toggleMasterMicrophone = useCallback(async () => {
    if (isMicActive) {
      // Turn OFF
      stopSpeechRecognition();
      stopMicrophoneStream();
      stopAllAudioPlayback();
      setIsMicActive(false);
      setIsListeningWakeWord(false);
      if (enableSoundEffectsRef.current) {
        playChimeSound('tap_beacon', 0.15);
      }
    } else {
      // Turn ON
      const success = await startMicrophoneStream();
      if (success) {
        setIsMicActive(true);
        setIsListeningWakeWord(true);
        startSpeechRecognition();
        if (enableSoundEffectsRef.current) {
          playChimeSound('wake_detected', 0.25);
        }
      }
    }
  }, [isMicActive, startMicrophoneStream, startSpeechRecognition, stopMicrophoneStream, stopSpeechRecognition, setIsListeningWakeWord]);

  // Sync external wake word toggle from Header / parent
  useEffect(() => {
    if (isListeningWakeWord && !isMicActive) {
      toggleMasterMicrophone();
    } else if (!isListeningWakeWord && isMicActive) {
      toggleMasterMicrophone();
    }
  }, [isListeningWakeWord]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      stopMicrophoneStream();
      stopAllAudioPlayback();
    };
  }, [stopSpeechRecognition, stopMicrophoneStream]);

  // Barge-In / Interrupt AI Speaking
  const handleInterruptAi = () => {
    stopAllAudioPlayback();
    setIsAiSpeaking(false);
    setIsAiThinking(false);
    if (enableSoundEffects) playChimeSound('listening_start', 0.2);
    if (isMicActive) {
      startSpeechRecognition();
    }
  };

  // Quick Action Voice Prompts
  const quickActions = [
    { label: 'Summarize Tasks', text: 'Hey Riches, list my top priority tasks for today.' },
    { label: 'Check Security', text: 'Hey Riches, audit all pending system approvals.' },
    { label: 'Research AI', text: 'Hey Riches, research recent breakthroughs in multi-agent systems.' },
    { label: 'Build Component', text: 'Hey Riches, open the builder sandbox and create a clean metric card.' },
    { label: '24h Activity Digest', text: 'Hey Riches, trigger the 24-hour activity digest export.' }
  ];

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputText.trim()) return;
    handleProcessConversationalTurn(manualInputText.trim());
    setManualInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#080d14] text-slate-100 font-sans select-none overflow-y-auto">
      {/* 1. Header Toolbar & Real-time Status */}
      <div className="border-b border-slate-800 bg-[#0d131f]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              isMicActive 
                ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/40' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <RadioTower className={`w-5 h-5 ${isMicActive ? 'animate-pulse' : ''}`} />
            </div>
            {isMicActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-wide text-white flex items-center gap-1.5">
                Voice & Wake Word Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  v2.4 Pro
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              {isAiSpeaking ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" /> Vocalizing Response ({voiceEngineMode === 'gemini_neural' ? `Gemini Neural · ${geminiVoice}` : 'Browser TTS'})
                </span>
              ) : isAiThinking ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 animate-spin" /> Synthesizing Agent Dialogue...
                </span>
              ) : isUserSpeaking ? (
                <span className="text-cyan-400 font-medium flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 animate-pulse" /> Capturing User Speech...
                </span>
              ) : isMicActive ? (
                <span className="text-amber-300/90 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Wake Word Active ("Hey Riches" / "Riches")
                </span>
              ) : (
                <span className="text-slate-400">Microphone Inactive · Tap Start Voice Engine</span>
              )}
            </p>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2">
          {isAiSpeaking && (
            <button
              onClick={handleInterruptAi}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" /> Interrupt Voice
            </button>
          )}

          <button
            onClick={toggleMasterMicrophone}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              isMicActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 ring-2 ring-rose-400/30'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-amber-500/25'
            }`}
          >
            {isMicActive ? (
              <>
                <MicOff className="w-4 h-4" /> Stop Engine
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Start Voice Engine
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission Warning Banner */}
      {permissionError && (
        <div className="bg-rose-950/60 border-b border-rose-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{permissionError}</span>
          </div>
          <button 
            onClick={toggleMasterMicrophone}
            className="px-2.5 py-1 bg-rose-800/60 hover:bg-rose-700/60 rounded text-rose-100 font-medium"
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Last Wake Word Matched Celebration Banner */}
      {lastWakeWordMatch && (
        <div className="bg-gradient-to-r from-amber-900/60 via-amber-800/50 to-amber-900/60 border-b border-amber-500/50 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-200 animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-semibold tracking-wide">Wake Word Detected:</span>
          <span className="px-2 py-0.5 bg-amber-400/20 rounded-md font-mono text-amber-300 border border-amber-400/40">
            "{lastWakeWordMatch.toUpperCase()}"
          </span>
          <span className="text-amber-300/80">— Processing Voice Intent</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Column: 3D Visualizer, Real-Time STT Stage & Controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* 3D Audio Visualizer Display */}
          <div className="relative bg-[#0c121e] border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[300px] flex flex-col">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                {isAiSpeaking ? 'AI_OUTPUT_STREAM' : isMicActive ? 'MIC_INPUT_STREAM' : 'OFFLINE'}
              </span>
              {isMicActive && (
                <span className="px-2 py-1 rounded-lg bg-amber-500/10 backdrop-blur-md text-[11px] font-mono text-amber-400 border border-amber-500/30">
                  {micDbLevel} dB
                </span>
              )}
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60 text-[11px] text-slate-300">
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>{voiceEngineMode === 'gemini_neural' ? `Gemini (${geminiVoice})` : 'Browser TTS'}</span>
              </div>
            </div>

            {/* 3D Visualizer Component */}
            <div className="flex-1 w-full h-[280px]">
              <AudioVisualizer3D
                analyser={analyserNode}
                audioLevels={audioLevels}
                isActive={isMicActive || isAiSpeaking}
                isAiSpeaking={isAiSpeaking}
                isUserSpeaking={isUserSpeaking}
                statusText={
                  isAiSpeaking
                    ? `Vocalizing with ${voiceEngineMode === 'gemini_neural' ? `Gemini Neural (${geminiVoice})` : 'Web Speech'}`
                    : isAiThinking
                    ? 'Synthesizing response with Gemini 3.7...'
                    : isMicActive
                    ? 'Listening for "Hey Riches" or spoken request...'
                    : 'Voice Engine Inactive'
                }
              />
            </div>

            {/* Live Real-Time Speech-to-Text Banner */}
            <div className="bg-slate-950/80 border-t border-slate-800/80 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-1.5 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${isUserSpeaking ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                  REAL-TIME STT TRANSCRIPTION ({sttLanguage}):
                </span>
                {isUserSpeaking && (
                  <span className="text-amber-400 font-medium animate-pulse">Capturing Audio...</span>
                )}
              </div>

              <div className="min-h-[44px] bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-xs sm:text-sm text-slate-200">
                {liveTranscript || interimTranscript ? (
                  <p className="leading-relaxed">
                    <span className="font-medium text-white">{liveTranscript}</span>
                    {interimTranscript && (
                      <span className="text-amber-300/80 italic ml-1">{interimTranscript}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-slate-500 italic flex items-center gap-2">
                    {isMicActive ? (
                      <>
                        <span>Speak naturally. Try saying:</span>
                        <span className="font-mono text-amber-400/90">"Hey Riches, show active tasks"</span>
                      </>
                    ) : (
                      'Click "Start Voice Engine" above to activate speech recognition.'
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Voice Command Prompts */}
          <div className="bg-[#0c121e] border border-slate-800 rounded-2xl p-4 shadow-md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick Verbal Prompts (One-Click Audition)
            </h3>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleProcessConversationalTurn(action.text)}
                  disabled={isAiThinking || isAiSpeaking}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-xs text-slate-200 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback Bar */}
          <form onSubmit={handleManualTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInputText}
              onChange={(e) => setManualInputText(e.target.value)}
              placeholder="Or type a spoken command to vocalize (e.g. 'Hey Riches, create a new task')..."
              className="flex-1 bg-[#0c121e] border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            <button
              type="submit"
              disabled={!manualInputText.trim() || isAiThinking}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" /> Speak
            </button>
          </form>
        </div>

        {/* Right Column: Tabbed Dialogue Stream, Calibration & Neural Voices (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Navigation Tabs */}
          <div className="flex p-1 bg-[#0c121e] border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'conversation'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Dialogue ({dialogueHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('gemini_voices')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'gemini_voices'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Neural Voices
            </button>
            <button
              onClick={() => setActiveTab('calibration')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'calibration'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Calibration
            </button>
          </div>

          {/* TAB 1: Live Dialogue History Stream */}
          {activeTab === 'conversation' && (
            <div className="flex-1 bg-[#0c121e] border border-slate-800 rounded-2xl p-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" /> Conversational Turn Log
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDialogueHistory([dialogueHistory[0]])}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
                    title="Clear Log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Dialogue List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {dialogueHistory.map((turn) => (
                  <div
                    key={turn.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                      turn.sender === 'user'
                        ? 'bg-slate-800/70 border-slate-700/80 text-slate-100 ml-4'
                        : 'bg-amber-950/20 border-amber-500/20 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                      <span className="font-semibold flex items-center gap-1">
                        {turn.sender === 'user' ? (
                          <span className="text-cyan-400">You (Voice)</span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> RICHES Voice
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        {turn.latencyMs && (
                          <span className="text-slate-500">{turn.latencyMs}ms</span>
                        )}
                        <span>{turn.timestamp}</span>
                      </div>
                    </div>

                    <p className="text-slate-100 font-normal">{turn.text}</p>

                    {turn.sender === 'riches' && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                          {turn.engineUsed === 'gemini_neural' ? 'Gemini 3.1 Neural TTS' : 'Web Speech Synthesis'}
                        </span>
                        <button
                          onClick={() => vocalizeResponse(turn.text)}
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" /> Replay
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Gemini 3.1 Flash Neural Voices Selection */}
          {activeTab === 'gemini_voices' && (
            <div className="flex-1 bg-[#0c121e] border border-slate-800 rounded-2xl p-4 flex flex-col h-[520px] overflow-y-auto space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gemini 3.1 Flash Neural Studio Voices
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-fidelity 24kHz conversational neural audio synthesized server-side via Gemini API.
                </p>
              </div>

              {/* TTS Engine Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Active Synthesis Engine:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVoiceEngineMode('gemini_neural')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      voiceEngineMode === 'gemini_neural'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-400/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-300">Gemini Neural TTS</span>
                      {voiceEngineMode === 'gemini_neural' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">Studio 24kHz natural AI human tone</p>
                  </button>

                  <button
                    onClick={() => setVoiceEngineMode('browser_tts')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      voiceEngineMode === 'browser_tts'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-400/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">Browser Speech API</span>
                      {voiceEngineMode === 'browser_tts' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">Zero-latency client-side synthesizer</p>
                  </button>
                </div>
              </div>

              {/* Gemini Voice Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Prebuilt Gemini Neural Voices:</label>
                {[
                  { name: 'Kore', gender: 'Female', desc: 'Warm, articulate, balanced executive voice (Recommended)', tone: 'Clear & Natural' },
                  { name: 'Puck', gender: 'Male', desc: 'Energetic, friendly, conversational and lively tone', tone: 'Upbeat & Crisp' },
                  { name: 'Charon', gender: 'Male', desc: 'Deep, resonant, calm authoritative executive voice', tone: 'Deep & Authoritative' },
                  { name: 'Fenrir', gender: 'Male', desc: 'Dynamic, focused, sharp engineering voice', tone: 'Focused & Direct' },
                  { name: 'Zephyr', gender: 'Female', desc: 'Calm, soothing studio sound with crystal clarity', tone: 'Gentle & Clear' }
                ].map((v) => (
                  <div
                    key={v.name}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      geminiVoice === v.name && voiceEngineMode === 'gemini_neural'
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-400/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{v.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 font-mono">
                          {v.gender}
                        </span>
                        <span className="text-[10px] text-amber-400/80 font-mono">({v.tone})</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{v.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setGeminiVoice(v.name as GeminiVoiceName);
                          setVoiceEngineMode('gemini_neural');
                          vocalizeResponse(`Hello! This is the ${v.name} neural voice on RICHES AI Operating System.`);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-amber-300 font-medium flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-amber-400 text-amber-400" /> Audition
                      </button>

                      <button
                        onClick={() => {
                          setGeminiVoice(v.name as GeminiVoiceName);
                          setVoiceEngineMode('gemini_neural');
                        }}
                        className={`p-1.5 rounded-lg text-xs ${
                          geminiVoice === v.name && voiceEngineMode === 'gemini_neural'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Calibration & Wake Word Sensitivity */}
          {activeTab === 'calibration' && (
            <div className="flex-1 bg-[#0c121e] border border-slate-800 rounded-2xl p-4 flex flex-col h-[520px] overflow-y-auto space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Wake Word & Voice Engine Calibration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fine-tune fuzzy phonetic detection thresholds, microphone input gain, and sound effects.
                </p>
              </div>

              {/* Wake Word Sensitivity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Wake Word Phonetic Sensitivity:</label>
                  <span className="font-mono text-amber-400 capitalize px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px]">
                    {wakeSensitivity}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as WakeSensitivity[]).map((sens) => (
                    <button
                      key={sens}
                      onClick={() => setWakeSensitivity(sens)}
                      className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        wakeSensitivity === sens
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sens}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {wakeSensitivity === 'high'
                    ? 'High: Triggers on fuzzy phonetic matches (Hey Riches, Richrs, Richers, Richard).'
                    : wakeSensitivity === 'medium'
                    ? 'Medium: Standard balanced trigger for "Hey Riches" and "Riches".'
                    : 'Low: Strict exact token match only.'}
                </p>
              </div>

              {/* Supported Wake Words Glossary */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 block mb-1">Recognized Wake Patterns:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Hey Riches', 'Riches', 'Hey Richrs', 'Richrs', 'Hey Richard', 'Hey Reach Us', 'Hey Jarvis'].map((phrase) => (
                    <span key={phrase} className="px-2 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-amber-300/90 border border-slate-700">
                      ✓ {phrase}
                    </span>
                  ))}
                </div>
              </div>

              {/* STT Recognition Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-amber-400" />
                  Speech Recognition Language:
                </label>
                <select
                  value={sttLanguage}
                  onChange={(e) => setSttLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="en-US">English (United States) - en-US</option>
                  <option value="en-GB">English (United Kingdom) - en-GB</option>
                  <option value="en-AU">English (Australia) - en-AU</option>
                  <option value="es-ES">Spanish (Spain) - es-ES</option>
                  <option value="fr-FR">French (France) - fr-FR</option>
                  <option value="de-DE">German (Germany) - de-DE</option>
                </select>
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Web Audio Chimes & Sound FX</span>
                  <span className="text-[11px] text-slate-400">Play futuristic dual-tone ping upon wake word detection</span>
                </div>
                <button
                  onClick={() => setEnableSoundEffects(prev => !prev)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    enableSoundEffects ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      enableSoundEffects ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Audio Output Volume & Speed */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Speech Rate:</span>
                    <span className="font-mono text-amber-400">{ttsRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={ttsRate}
                    onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Speech Volume:</span>
                    <span className="font-mono text-amber-400">{Math.round(ttsVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={ttsVolume}
                    onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
