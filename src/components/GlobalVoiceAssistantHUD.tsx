import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Zap, 
  Radio, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  ChevronRight,
  Headphones,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { 
  analyzeWakeWord, 
  playChimeSound, 
  speakWithBrowserTts, 
  stopAllAudioPlayback,
  getVoiceWakeAck,
  processVoiceConversationalTurn
} from '../services/voiceEngine';
import { 
  loadOwnerVoiceProfileFromStorage,
  OwnerVoiceProfile
} from '../services/voiceprintEngine';
import { fetchOwnerVoiceProfile } from '../services/api';

interface GlobalVoiceAssistantHUDProps {
  isListeningWakeWord: boolean;
  setIsListeningWakeWord: (val: boolean) => void;
  onNavigateToView: (view: string) => void;
  activeView: string;
}

export const GlobalVoiceAssistantHUD: React.FC<GlobalVoiceAssistantHUDProps> = ({
  isListeningWakeWord,
  setIsListeningWakeWord,
  onNavigateToView,
  activeView
}) => {
  const [hudState, setHudState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiSpokenResponse, setAiSpokenResponse] = useState('');
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [lastDetectedWakePhrase, setLastDetectedWakePhrase] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<{ query: string; reply: string }[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerVoiceProfile | null>(() => loadOwnerVoiceProfileFromStorage());

  useEffect(() => {
    fetchOwnerVoiceProfile().then(p => {
      if (p) setOwnerProfile(p);
    }).catch(() => {});
  }, []);

  const recognitionRef = useRef<any>(null);
  const isAwaitingFollowUpRef = useRef(false);
  const followUpTimeoutRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isListeningWakeWordRef = useRef(isListeningWakeWord);
  const silenceTimerRef = useRef<any>(null);
  const currentTranscriptRef = useRef('');

  useEffect(() => {
    isListeningWakeWordRef.current = isListeningWakeWord;
  }, [isListeningWakeWord]);

  // Execute conversational turn
  const handleProcessSpokenTurn = useCallback(async (spokenText: string) => {
    if (!spokenText || spokenText.trim().length < 2 || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setHudState('thinking');
    setLiveTranscript(spokenText);
    currentTranscriptRef.current = '';

    // Clear follow-up state
    isAwaitingFollowUpRef.current = false;
    if (followUpTimeoutRef.current) {
      clearTimeout(followUpTimeoutRef.current);
      followUpTimeoutRef.current = null;
    }

    try {
      const result = await processVoiceConversationalTurn(spokenText, [], { personality: 'conversational', voiceSpeed: 1.0 });
      const reply = result.spokenText || `Understood. Processing "${spokenText}".`;
      
      setAiSpokenResponse(reply);
      setDetectedIntent(result.intent || 'general_chat');
      setRecentInteractions(prev => [{ query: spokenText, reply }, ...prev.slice(0, 3)]);

      // Check intent for screen navigation
      if (result.intent === 'open_tasks' || spokenText.toLowerCase().includes('task')) {
        onNavigateToView('workspace');
      } else if (result.intent === 'open_builder' || spokenText.toLowerCase().includes('build') || spokenText.toLowerCase().includes('code')) {
        onNavigateToView('builder');
      } else if (result.intent === 'open_analytics' || spokenText.toLowerCase().includes('analytic') || spokenText.toLowerCase().includes('metric')) {
        onNavigateToView('analytics');
      } else if (result.intent === 'open_comms' || spokenText.toLowerCase().includes('email') || spokenText.toLowerCase().includes('calendar')) {
        onNavigateToView('google_workspace');
      } else if (result.intent === 'security_audit' || spokenText.toLowerCase().includes('security') || spokenText.toLowerCase().includes('approval')) {
        onNavigateToView('security');
      }

      // Vocalize response
      if (!isMuted) {
        setHudState('speaking');
        isSpeakingRef.current = true;
        
        speakWithBrowserTts(reply, {
          rate: 1.05,
          pitch: 1.0,
          volume: 1.0,
          onEnd: () => {
            isSpeakingRef.current = false;
            isProcessingRef.current = false;
            setHudState('idle');
            // Resume wake-word listening
            if (isListeningWakeWordRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (_) {}
            }
          },
          onError: () => {
            isSpeakingRef.current = false;
            isProcessingRef.current = false;
            setHudState('idle');
          }
        });
      } else {
        isProcessingRef.current = false;
        setHudState('idle');
      }
    } catch (err: any) {
      console.warn('[GlobalVoiceHUD] Voice processing notice:', err);
      const fallback = `Understood: ${spokenText}. Executing on the RICHES agent mesh.`;
      setAiSpokenResponse(fallback);
      isProcessingRef.current = false;
      setHudState('idle');
    }
  }, [isMuted, onNavigateToView]);

  // Handle standalone wake word summon
  const triggerWakeWordSummon = useCallback((matchedPhrase: string) => {
    setLastDetectedWakePhrase(matchedPhrase);
    setTimeout(() => setLastDetectedWakePhrase(null), 4000);
    playChimeSound('wake_detected', 0.35);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    isSpeakingRef.current = true;
    setHudState('speaking');
    
    const ackText = getVoiceWakeAck();
    setAiSpokenResponse(ackText);
    
    speakWithBrowserTts(ackText, {
      rate: 1.05,
      onEnd: () => {
        isSpeakingRef.current = false;
        isAwaitingFollowUpRef.current = true;
        setHudState('listening');
        setLiveTranscript('');
        currentTranscriptRef.current = '';

        // Listen for 10 seconds for follow-up command
        if (followUpTimeoutRef.current) clearTimeout(followUpTimeoutRef.current);
        followUpTimeoutRef.current = setTimeout(() => {
          isAwaitingFollowUpRef.current = false;
          setHudState('idle');
        }, 10000);

        // Restart recognition to capture the command
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      },
      onError: () => {
        isSpeakingRef.current = false;
        isAwaitingFollowUpRef.current = true;
        setHudState('listening');
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      }
    });
  }, []);

  // Start Global Background Speech Recognition
  useEffect(() => {
    // If we are currently inside VoiceStudio view, let VoiceStudio handle its dedicated full screen controls
    if (activeView === 'voice' || !isListeningWakeWord) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
      setHudState('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setHudState('idle');
      };

      rec.onresult = (event: any) => {
        if (isSpeakingRef.current || isProcessingRef.current) return;

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

        const spoken = (final || interim).trim();
        if (!spoken) return;

        setLiveTranscript(spoken);
        currentTranscriptRef.current = spoken;
        setHudState('listening');

        // Check if we are in follow-up mode (user already said "Hey Riches wake up" and is now speaking command)
        if (isAwaitingFollowUpRef.current && (final.trim().length > 2 || spoken.length > 5)) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          silenceTimerRef.current = setTimeout(() => {
            if (currentTranscriptRef.current && !isProcessingRef.current) {
              try { rec.abort(); } catch (_) {}
              handleProcessSpokenTurn(currentTranscriptRef.current);
            }
          }, 1000);

          if (final.trim().length > 2) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            try { rec.abort(); } catch (_) {}
            handleProcessSpokenTurn(final.trim());
          }
          return;
        }

        // Analyze Wake Word ("Hey Riches wake up", "Riches wake up", "Wake up Riches", "Hey Riches", etc.)
        const wakeAnalysis = analyzeWakeWord(spoken, 'medium');

        if (wakeAnalysis.triggered) {
          setLastDetectedWakePhrase(wakeAnalysis.matchedPhrase);
          setTimeout(() => setLastDetectedWakePhrase(null), 4000);

          // Direct command after wake word (e.g. "Hey Riches wake up and show my tasks")
          if (!wakeAnalysis.isSummonOnly && wakeAnalysis.command.length > 2) {
            playChimeSound('wake_detected', 0.35);
            try { rec.abort(); } catch (_) {}
            handleProcessSpokenTurn(wakeAnalysis.command);
            return;
          }

          // Standalone summon ("Hey Riches wake up" or "Hey Riches")
          if (wakeAnalysis.isSummonOnly) {
            triggerWakeWordSummon(wakeAnalysis.matchedPhrase);
            return;
          }
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[GlobalVoiceHUD] Recognition notice:', e.error);
        }
      };

      rec.onend = () => {
        if (isListeningWakeWordRef.current && !isSpeakingRef.current && !isProcessingRef.current && activeView !== 'voice') {
          setTimeout(() => {
            if (isListeningWakeWordRef.current && !isSpeakingRef.current && !isProcessingRef.current && activeView !== 'voice') {
              try { rec.start(); } catch (_) {}
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('[GlobalVoiceHUD] Exception initializing recognition:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (followUpTimeoutRef.current) clearTimeout(followUpTimeoutRef.current);
    };
  }, [isListeningWakeWord, activeView, handleProcessSpokenTurn, triggerWakeWordSummon]);

  // Don't render floating HUD if wake-word is off or if on full VoiceStudio page
  if (!isListeningWakeWord || activeView === 'voice') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl shadow-amber-500/10 space-y-2.5 font-mono text-xs">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hudState === 'listening' ? 'bg-red-400' : hudState === 'speaking' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                hudState === 'listening' ? 'bg-red-500' : hudState === 'speaking' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="text-[11px] font-bold text-slate-200">RICHES Voice Engine</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
              hudState === 'listening' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
              hudState === 'speaking' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              hudState === 'thinking' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
              'bg-slate-800 text-slate-400'
            }`}>
              {hudState === 'listening' ? 'Listening...' :
               hudState === 'speaking' ? 'Speaking...' :
               hudState === 'thinking' ? 'Routing Agent...' :
               'Say "Hey Riches wake up"'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (isSpeakingRef.current) {
                  stopAllAudioPlayback();
                  isSpeakingRef.current = false;
                  setHudState('idle');
                }
                setIsMuted(!isMuted);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title={isMuted ? 'Unmute Speech Output' : 'Mute Speech Output'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              onClick={() => onNavigateToView('voice')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800"
              title="Open Full Voice & Wake Word Studio"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setIsListeningWakeWord(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Turn off Background Wake Word"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Voiceprint Identification Ribbon */}
        <div className="flex items-center justify-between px-2.5 py-1 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300">
              Voice Match: <strong className="text-emerald-400">{ownerProfile?.ownerName ? `${ownerProfile.ownerName} (Enrolled)` : 'Open Pass'}</strong>
            </span>
          </div>
          <button
            onClick={() => onNavigateToView('voice')}
            className="text-amber-400 hover:text-amber-300 underline font-semibold"
          >
            {ownerProfile?.samples?.length ? `${ownerProfile.samples.length} Samples` : 'Enroll Voice'}
          </button>
        </div>

        {/* Wake Word Detection Notification Banner */}
        {lastDetectedWakePhrase && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-[11px] text-amber-300 font-sans font-semibold animate-pulse">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Wake Detected: <strong className="text-white">"{lastDetectedWakePhrase}"</strong></span>
          </div>
        )}

        {/* Live Audio Visualizer Bar (Siri/Google Assistant Waveform) */}
        <div className="flex items-center gap-1 h-4 px-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 overflow-hidden">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 85, 40, 65, 90, 55, 30].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-100 ${
                hudState === 'listening' ? 'bg-gradient-to-t from-red-500 to-amber-400' :
                hudState === 'speaking' ? 'bg-gradient-to-t from-amber-500 to-yellow-300' :
                hudState === 'thinking' ? 'bg-gradient-to-t from-cyan-500 to-blue-400 animate-pulse' :
                'bg-slate-700/50'
              }`}
              style={{
                height: hudState === 'listening' || hudState === 'speaking'
                  ? `${Math.max(25, (h * (Math.sin(Date.now() / 200 + i) + 1.2)) % 100)}%`
                  : '20%'
              }}
            />
          ))}
        </div>

        {/* Live Spoken Transcript Preview */}
        {liveTranscript ? (
          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-200 flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <span className="font-sans italic text-slate-100">"{liveTranscript}"</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between px-1">
            <span>Standby: Say <em>"Hey Riches wake up"</em> or <em>"Wake up Riches"</em></span>
          </div>
        )}

        {/* AI Spoken Response Preview */}
        {aiSpokenResponse && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="font-sans space-y-1">
              <span className="text-[10px] text-amber-400/90 font-mono font-bold block uppercase">
                RICHES Voice Response {detectedIntent ? `[${detectedIntent}]` : ''}
              </span>
              <p className="leading-tight text-slate-100 font-medium">{aiSpokenResponse}</p>
            </div>
          </div>
        )}

        {/* Quick Voice Prompt Chips for Instant Simulation/Testing */}
        <div className="pt-1 border-t border-slate-800/80">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
            Quick Spoken Commands:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Wake up', phrase: 'Hey Riches wake up' },
              { label: 'Tasks', phrase: 'Hey Riches, list my tasks' },
              { label: 'Builder', phrase: 'Hey Riches, open app builder' },
              { label: 'Analytics', phrase: 'Hey Riches, show system analytics' },
              { label: 'Security', phrase: 'Hey Riches, check security audit' }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (item.label === 'Wake up') {
                    triggerWakeWordSummon(item.phrase);
                  } else {
                    const wake = analyzeWakeWord(item.phrase);
                    if (wake.command) {
                      playChimeSound('wake_detected', 0.35);
                      handleProcessSpokenTurn(wake.command);
                    }
                  }
                }}
                className="px-2 py-1 bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-lg text-[10px] font-sans font-medium transition-all active:scale-95 flex items-center gap-1"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
