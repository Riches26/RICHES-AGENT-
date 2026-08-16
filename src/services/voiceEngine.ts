// RICHES AI OS — Production-Grade Voice & Wake Word Engine
// Handles: Multi-Tier Phonetic Wake Word Detection, Web Audio Chimes,
// Gemini 3.1 Flash Neural TTS, and Resilient Continuous STT.

export type WakeSensitivity = 'high' | 'medium' | 'low';
export type VoiceEngineMode = 'gemini_neural' | 'browser_tts';
export type GeminiVoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface WakeDetectionResult {
  triggered: boolean;
  matchedPhrase: string;
  command: string;
  isSummonOnly: boolean;
  confidence: number;
}

// ----------------------------------------------------
// 1. Multi-Tier Phonetic & Regex Wake Word Recognition
// ----------------------------------------------------

export function getVoiceWakeAck(): string {
  const acks = [
    "I'm listening.",
    "Yes, standing by.",
    "Online. What would you like me to do?",
    "I'm here. Go ahead.",
    "Listening now."
  ];
  return acks[Math.floor(Math.random() * acks.length)];
}

const WAKE_PATTERNS_BASE = [
  'riches',
  'richrs',
  'richers',
  'richer',
  'richie',
  'rich',
  'richard',
  'reaches',
  'reach us',
  'rachel',
  'ridge',
  'richesse',
  'jarvis'
];

const WAKE_PREFIXES = ['hey', 'hi', 'ok', 'okay', 'yo', 'hello', 'a', 'the'];

/**
 * Fuzzy phonetic wake-word parser.
 * Handles "Hey Riches", "Riches", "Hey Richrs", "Richrs", "Hey Richard", etc.
 */
export function analyzeWakeWord(
  transcript: string,
  sensitivity: WakeSensitivity = 'medium'
): WakeDetectionResult {
  if (!transcript || typeof transcript !== 'string') {
    return { triggered: false, matchedPhrase: '', command: '', isSummonOnly: false, confidence: 0 };
  }

  const clean = transcript.toLowerCase().trim();

  // 1. High-fidelity Regex Matching
  // Matches "Hey Riches", "Riches", "Hey Richrs", "Ok Riches", "Hi Riches", etc.
  const regexPattern = new RegExp(
    `^(?:(${WAKE_PREFIXES.join('|')})\\s+)?(${WAKE_PATTERNS_BASE.join('|')})([\\s,!?.\\-_].*|$)`,
    'i'
  );

  const match = clean.match(regexPattern);

  if (match) {
    const prefix = match[1] || '';
    const core = match[2] || '';
    const remainder = (match[3] || '').replace(/^[,\s.!?\-_]+/, '').trim();
    const matchedPhrase = prefix ? `${prefix} ${core}` : core;

    return {
      triggered: true,
      matchedPhrase,
      command: remainder,
      isSummonOnly: remainder.length === 0,
      confidence: 0.98
    };
  }

  // 2. Mid-sentence wake word detection (e.g. "...so hey riches open tasks")
  const midRegex = new RegExp(
    `(?:\\b(?:${WAKE_PREFIXES.join('|')})\\s+)?\\b(?:${WAKE_PATTERNS_BASE.join('|')})\\b([\\s,!?.\\-_].*|$)`,
    'i'
  );
  const midMatch = clean.match(midRegex);

  if (midMatch) {
    const rawMatchText = midMatch[0];
    const remainder = (midMatch[1] || '').replace(/^[,\s.!?\-_]+/, '').trim();

    return {
      triggered: true,
      matchedPhrase: rawMatchText.trim(),
      command: remainder,
      isSummonOnly: remainder.length === 0,
      confidence: 0.90
    };
  }

  // 3. High-sensitivity fuzzy matching (levenshtein on leading tokens)
  if (sensitivity === 'high') {
    const words = clean.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0].replace(/[^a-z]/g, '');
      const secondWord = words.length > 1 ? words[1].replace(/[^a-z]/g, '') : '';

      // Check if second word is wake word when first is prefix
      if (WAKE_PREFIXES.includes(firstWord) && secondWord) {
        if (isFuzzyMatch(secondWord, 'riches') || isFuzzyMatch(secondWord, 'richrs')) {
          const remainder = words.slice(2).join(' ');
          return {
            triggered: true,
            matchedPhrase: `${firstWord} ${secondWord}`,
            command: remainder,
            isSummonOnly: remainder.length === 0,
            confidence: 0.82
          };
        }
      }

      // Check if first word directly matches
      if (isFuzzyMatch(firstWord, 'riches') || isFuzzyMatch(firstWord, 'richrs')) {
        const remainder = words.slice(1).join(' ');
        return {
          triggered: true,
          matchedPhrase: firstWord,
          command: remainder,
          isSummonOnly: remainder.length === 0,
          confidence: 0.85
        };
      }
    }
  }

  return { triggered: false, matchedPhrase: '', command: '', isSummonOnly: false, confidence: 0 };
}

function isFuzzyMatch(word: string, target: string): boolean {
  if (word === target) return true;
  if (Math.abs(word.length - target.length) > 2) return false;
  let matches = 0;
  for (let i = 0; i < Math.min(word.length, target.length); i++) {
    if (word[i] === target[i]) matches++;
  }
  return matches >= target.length - 2;
}

// ----------------------------------------------------
// 2. Web Audio Synthesized Chimes & Sound Effects
// ----------------------------------------------------

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export type ChimeType = 'wake_detected' | 'listening_start' | 'success_chord' | 'error_tone' | 'tap_beacon';

export function playChimeSound(type: ChimeType, volume = 0.25): void {
  try {
    const ctx = getSharedAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    if (type === 'wake_detected') {
      // Ascending futuristic dual-tone chime (587Hz D5 -> 880Hz A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.exponentialRampToValueAtTime(0.4, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.01, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.5, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.3);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.5);
    } else if (type === 'listening_start') {
      // Soft gentle ping (784Hz G5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(783.99, now);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success_chord') {
      // Triad chord (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.01, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.05 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.6);
      });
    } else if (type === 'error_tone') {
      // Low double buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(164.81, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'tap_beacon') {
      // Gentle radar blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn('[VoiceEngine] Web Audio chime notice:', e);
  }
}

// ----------------------------------------------------
// 3. Gemini 3.1 Flash Neural Audio PCM Player
// ----------------------------------------------------

let currentAudioSource: AudioBufferSourceNode | null = null;

export async function playGeminiBase64Audio(
  base64Data: string,
  sampleRate = 24000,
  volume = 1.0,
  onEnded?: () => void
): Promise<void> {
  stopAllAudioPlayback();

  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Decode Base64 to ArrayBuffer
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert raw 16-bit PCM (signed integers, little-endian) to Float32 AudioBuffer
  const int16 = new Int16Array(bytes.buffer);
  const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < int16.length; i++) {
    channelData[i] = int16[i] / 32768.0;
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  currentAudioSource = source;

  source.onended = () => {
    if (currentAudioSource === source) {
      currentAudioSource = null;
    }
    if (onEnded) onEnded();
  };

  source.start(0);
}

export function stopAllAudioPlayback(): void {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
    } catch (_) {}
    currentAudioSource = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ----------------------------------------------------
// 4. Browser SpeechSynthesis Refined Player
// ----------------------------------------------------

let ttsKeepAliveTimer: any = null;

export function speakWithBrowserTts(
  text: string,
  options: {
    volume?: number;
    pitch?: number;
    rate?: number;
    preferredVoiceName?: string;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): void {
  stopAllAudioPlayback();

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options.onError) options.onError('SpeechSynthesis is not supported in this browser.');
    return;
  }

  // Clear any existing keep-alive
  if (ttsKeepAliveTimer) {
    clearInterval(ttsKeepAliveTimer);
    ttsKeepAliveTimer = null;
  }

  // Ensure speech synthesis is active and not paused
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (_) {}

  const cleanText = text
    .replace(/[*#`_~[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    if (options.onEnd) options.onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.volume = options.volume ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.rate = options.rate ?? 1.05;

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length > 0) {
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (options.preferredVoiceName) {
      chosenVoice = voices.find(v => v.name.toLowerCase().includes(options.preferredVoiceName!.toLowerCase()));
    }

    if (!chosenVoice) {
      // Find top natural/high quality English voice
      chosenVoice = voices.find(
        v =>
          (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex') || v.name.includes('Karen'))) ||
          v.lang.startsWith('en')
      ) || voices[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
  }

  const cleanup = () => {
    if (ttsKeepAliveTimer) {
      clearInterval(ttsKeepAliveTimer);
      ttsKeepAliveTimer = null;
    }
  };

  utterance.onend = () => {
    cleanup();
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    cleanup();
    console.warn('[VoiceEngine] Browser TTS error:', e);
    if (options.onError) options.onError(e);
  };

  // Chrome garbage collection workaround: keep synthesis engine alive
  ttsKeepAliveTimer = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      cleanup();
    } else {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 5000);

  try {
    window.speechSynthesis.speak(utterance);
    // Explicitly resume to avoid Chrome audio policy freeze
    window.speechSynthesis.resume();
  } catch (err) {
    console.warn('[VoiceEngine] Synthesis speak call exception:', err);
    cleanup();
    if (options.onError) options.onError(err);
  }
}

// ----------------------------------------------------
// 5. Microphone Stream & Analyser Node Generator
// ----------------------------------------------------

export interface MicStreamHandle {
  stream: MediaStream;
  analyser: AnalyserNode;
  audioCtx: AudioContext;
  stop: () => void;
}

export async function createMicrophoneAnalyser(): Promise<MicStreamHandle> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone access is not supported by your browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });

  const audioCtx = getSharedAudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  source.connect(analyser);

  return {
    stream,
    analyser,
    audioCtx,
    stop: () => {
      stream.getTracks().forEach(t => t.stop());
      try {
        source.disconnect();
      } catch (_) {}
    }
  };
}

// ----------------------------------------------------
// 6. Voice Conversational Turn API Client
// ----------------------------------------------------

export interface VoiceTurnResponse {
  success: boolean;
  spokenText: string;
  displayText: string;
  intent?: string;
  actionDirective?: string | null;
  agent?: string;
  latencyMs?: number;
  timestamp?: string;
}

export async function processVoiceConversationalTurn(
  transcript: string,
  history: Array<{ sender: 'user' | 'assistant' | 'riches'; text: string }> = [],
  options?: { personality?: string; voiceSpeed?: number }
): Promise<VoiceTurnResponse> {
  const response = await fetch('/api/voice/conversational-turn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transcript,
      history,
      personality: options?.personality || 'conversational',
      voiceSpeed: options?.voiceSpeed || 1.0
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Voice turn processing failed with status ${response.status}`);
  }

  return response.json();
}
