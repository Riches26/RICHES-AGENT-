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
  RefreshCw
} from 'lucide-react';
import { 
  analyzeWakeWord, 
  playChimeSound, 
  speakWithBrowserTts, 
  stopAllAudioPlayback,
  getVoiceWakeAck,
  processVoiceConversationalTurn
} from '../services/voiceEngine';

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
  const [isMuted, setIsMuted] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<{ query: string; reply: string }[]>([]);

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

        // Check if we are in follow-up mode (user already said "Hey Riches" and is now speaking command)
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

        // Analyze Wake Word ("Hey Riches", "Riches", etc.)
        const wakeAnalysis = analyzeWakeWord(spoken, 'medium');

        if (wakeAnalysis.triggered) {
          playChimeSound('wake_detected', 0.35);

          // Direct command after wake word (e.g. "Hey Riches, open tasks")
          if (!wakeAnalysis.isSummonOnly && wakeAnalysis.command.length > 2) {
            try { rec.abort(); } catch (_) {}
            handleProcessSpokenTurn(wakeAnalysis.command);
            return;
          }

          // Standalone summon ("Hey Riches")
          if (wakeAnalysis.isSummonOnly) {
            try { rec.abort(); } catch (_) {}
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
                try { rec.start(); } catch (_) {}
              },
              onError: () => {
                isSpeakingRef.current = false;
                isAwaitingFollowUpRef.current = true;
                setHudState('listening');
                try { rec.start(); } catch (_) {}
              }
            });
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
  }, [isListeningWakeWord, activeView, handleProcessSpokenTurn]);

  // Don't render floating HUD if wake-word is off or if on full VoiceStudio page
  if (!isListeningWakeWord || activeView === 'voice') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3.5 shadow-2xl shadow-amber-500/10 space-y-2.5 font-mono text-xs">
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
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
              hudState === 'listening' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
              hudState === 'speaking' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              hudState === 'thinking' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
              'bg-slate-800 text-slate-400'
            }`}>
              {hudState === 'listening' ? 'Listening...' :
               hudState === 'speaking' ? 'Speaking...' :
               hudState === 'thinking' ? 'Routing Agent...' :
               'Say "Hey Riches"'}
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
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title={isMuted ? 'Unmute Speech Output' : 'Mute Speech Output'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              onClick={() => onNavigateToView('voice')}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
              title="Open Full Voice & Wake Word Studio"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setIsListeningWakeWord(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Turn off Background Wake Word"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Bar */}
        <div className="flex items-center gap-1 h-3.5 px-2 bg-slate-900/80 rounded-lg border border-slate-800/80 overflow-hidden">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 85, 40, 65, 90, 55, 30].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-100 ${
                hudState === 'listening' ? 'bg-red-400' :
                hudState === 'speaking' ? 'bg-amber-400' :
                hudState === 'thinking' ? 'bg-cyan-400 animate-pulse' :
                'bg-slate-700/50'
              }`}
              style={{
                height: hudState === 'listening' || hudState === 'speaking'
                  ? `${Math.max(20, (h * (Math.sin(Date.now() / 200 + i) + 1.2)) % 100)}%`
                  : '20%'
              }}
            />
          ))}
        </div>

        {/* Live Spoken Transcript Preview */}
        {liveTranscript ? (
          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-200 flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <span className="font-sans italic">"{liveTranscript}"</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between px-1">
            <span>Try: <em>"Hey Riches, list my tasks"</em> or <em>"Hey Riches, open builder"</em></span>
          </div>
        )}

        {/* AI Spoken Response Preview */}
        {aiSpokenResponse && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="font-sans space-y-1">
              <span className="text-[10px] text-amber-400/80 font-mono font-bold block uppercase">
                RICHES Response {detectedIntent ? `[${detectedIntent}]` : ''}
              </span>
              <p className="leading-tight">{aiSpokenResponse}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
