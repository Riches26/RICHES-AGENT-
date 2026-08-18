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
    "I'm awake and listening. How can I help you?",
    "Yes, I'm awake. Go ahead.",
    "I'm here and listening. What would you like me to do?",
    "Online and standing by. What's on your mind?",
    "I'm awake. How can I assist you today?",
    "Ready. Go ahead."
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

const WAKE_PREFIXES = ['hey', 'hi', 'ok', 'okay', 'yo', 'hello', 'a', 'the', 'dear'];

const WAKE_VERBS = [
  'wake\\s+up',
  'wake',
  'please\\s+wake\\s+up',
  'wake\\s+up\\s+please',
  'are\\s+you\\s+awake',
  'are\\s+you\\s+there',
  'are\\s+you\\s+listening',
  'stand\\s+by',
  'listen\\s+up',
  'listen'
];

/**
 * Fuzzy phonetic wake-word parser.
 * Handles "Hey Riches wake up", "Riches wake up", "Wake up Riches", "Hey Riches", "Ok Riches", etc.
 * Operates with the same high responsiveness as Hey Siri and Hey Google.
 */
export function analyzeWakeWord(
  transcript: string,
  sensitivity: WakeSensitivity = 'medium'
): WakeDetectionResult {
  if (!transcript || typeof transcript !== 'string') {
    return { triggered: false, matchedPhrase: '', command: '', isSummonOnly: false, confidence: 0 };
  }

  const clean = transcript.toLowerCase().trim();
  if (!clean) {
    return { triggered: false, matchedPhrase: '', command: '', isSummonOnly: false, confidence: 0 };
  }

  // 1. Pattern A: "[Prefix] [Riches] [Wake Up / Verb] [Remainder...]"
  // Examples: "Hey Riches wake up", "Hey Riches wake up and show tasks", "Riches wake up", "Hey Riches"
  const patternA = new RegExp(
    `^(?:(${WAKE_PREFIXES.join('|')})\\s+)?(${WAKE_PATTERNS_BASE.join('|')})(?:\\s+(${WAKE_VERBS.join('|')}))?([\\s,!?.\\-_].*|$)`,
    'i'
  );
  const matchA = clean.match(patternA);

  if (matchA) {
    const prefix = matchA[1] || '';
    const core = matchA[2] || '';
    const verb = matchA[3] || '';
    const rawRemainder = matchA[4] || '';

    const matchedParts = [prefix, core, verb].filter(Boolean);
    const matchedPhrase = matchedParts.join(' ');

    const cleanedCommand = cleanSpokenCommand(rawRemainder);
    const isSummonOnly = isSummonOnlyPhrase(cleanedCommand);

    return {
      triggered: true,
      matchedPhrase,
      command: isSummonOnly ? '' : cleanedCommand,
      isSummonOnly,
      confidence: 0.98
    };
  }

  // 2. Pattern B: "[Wake Up / Verb] [Prefix] [Riches] [Remainder...]"
  // Examples: "Wake up Riches", "Wake up hey Riches", "Wake up Riches and open builder"
  const patternB = new RegExp(
    `^(?:(${WAKE_VERBS.join('|')})\\s+)(?:(${WAKE_PREFIXES.join('|')})\\s+)?(${WAKE_PATTERNS_BASE.join('|')})([\\s,!?.\\-_].*|$)`,
    'i'
  );
  const matchB = clean.match(patternB);

  if (matchB) {
    const verb = matchB[1] || '';
    const prefix = matchB[2] || '';
    const core = matchB[3] || '';
    const rawRemainder = matchB[4] || '';

    const matchedParts = [verb, prefix, core].filter(Boolean);
    const matchedPhrase = matchedParts.join(' ');

    const cleanedCommand = cleanSpokenCommand(rawRemainder);
    const isSummonOnly = isSummonOnlyPhrase(cleanedCommand);

    return {
      triggered: true,
      matchedPhrase,
      command: isSummonOnly ? '' : cleanedCommand,
      isSummonOnly,
      confidence: 0.96
    };
  }

  // 3. Pattern C: Pure Wake Up Summon ("wake up", "wake up please", "are you awake")
  const patternC = new RegExp(`^(?:${WAKE_VERBS.join('|')})$`, 'i');
  if (patternC.test(clean)) {
    return {
      triggered: true,
      matchedPhrase: clean,
      command: '',
      isSummonOnly: true,
      confidence: 0.92
    };
  }

  // 4. Mid-sentence wake phrase (e.g. "...so hey riches wake up show my tasks")
  const midRegex = new RegExp(
    `(?:\\b(?:${WAKE_PREFIXES.join('|')})\\s+)?\\b(?:${WAKE_PATTERNS_BASE.join('|')})\\b(?:\\s+(?:${WAKE_VERBS.join('|')}))?([\\s,!?.\\-_].*|$)`,
    'i'
  );
  const midMatch = clean.match(midRegex);

  if (midMatch) {
    const rawMatchText = midMatch[0];
    const rawRemainder = midMatch[1] || '';

    const cleanedCommand = cleanSpokenCommand(rawRemainder);
    const isSummonOnly = isSummonOnlyPhrase(cleanedCommand);

    return {
      triggered: true,
      matchedPhrase: rawMatchText.trim(),
      command: isSummonOnly ? '' : cleanedCommand,
      isSummonOnly,
      confidence: 0.90
    };
  }

  // 5. High-sensitivity fuzzy matching (levenshtein on leading tokens)
  if (sensitivity === 'high') {
    const words = clean.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0].replace(/[^a-z]/g, '');
      const secondWord = words.length > 1 ? words[1].replace(/[^a-z]/g, '') : '';
      const thirdWord = words.length > 2 ? words[2].replace(/[^a-z]/g, '') : '';

      // Check if second word is wake word when first is prefix (e.g. "hey richrs wake up")
      if (WAKE_PREFIXES.includes(firstWord) && secondWord) {
        if (isFuzzyMatch(secondWord, 'riches') || isFuzzyMatch(secondWord, 'richrs')) {
          let remainderWords = words.slice(2);
          // Check if third word is "wake up"
          if (thirdWord === 'wake' || thirdWord === 'wakeup') {
            remainderWords = words.slice(3);
          }
          const rawRemainder = remainderWords.join(' ');
          const cleanedCommand = cleanSpokenCommand(rawRemainder);
          const isSummonOnly = isSummonOnlyPhrase(cleanedCommand);

          return {
            triggered: true,
            matchedPhrase: `${firstWord} ${secondWord}${thirdWord ? ` ${thirdWord}` : ''}`,
            command: isSummonOnly ? '' : cleanedCommand,
            isSummonOnly,
            confidence: 0.85
          };
        }
      }

      // Check if first word directly matches (e.g. "richrs wake up")
      if (isFuzzyMatch(firstWord, 'riches') || isFuzzyMatch(firstWord, 'richrs')) {
        let remainderWords = words.slice(1);
        if (secondWord === 'wake' || secondWord === 'wakeup') {
          remainderWords = words.slice(2);
        }
        const rawRemainder = remainderWords.join(' ');
        const cleanedCommand = cleanSpokenCommand(rawRemainder);
        const isSummonOnly = isSummonOnlyPhrase(cleanedCommand);

        return {
          triggered: true,
          matchedPhrase: `${firstWord}${secondWord ? ` ${secondWord}` : ''}`,
          command: isSummonOnly ? '' : cleanedCommand,
          isSummonOnly,
          confidence: 0.85
        };
      }
    }
  }

  return { triggered: false, matchedPhrase: '', command: '', isSummonOnly: false, confidence: 0 };
}

function cleanSpokenCommand(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^[,\s.!?\-_]+/, '')
    .replace(/^(?:and\s+|wake\s+up\s+(?:and\s+)?|please\s+(?:wake\s+up\s+)?|can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|would\s+you\s+(?:please\s+)?|to\s+|just\s+)+/i, '')
    .replace(/[,\s.!?\-_]+$/, '')
    .trim();
}

function isSummonOnlyPhrase(command: string): boolean {
  if (!command || command.length === 0) return true;
  const summonFillers = [
    'wake up',
    'wake',
    'please wake up',
    'wake up please',
    'are you there',
    'are you awake',
    'are you listening',
    'can you hear me',
    'hello',
    'good morning',
    'good afternoon',
    'good evening',
    'hey',
    'hi',
    'please',
    'thanks'
  ];
  return summonFillers.includes(command.toLowerCase().trim());
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
// 4. Browser SpeechSynthesis Refined Player (Sentence Chunked & Deep Masculine Accented Voice Priority)
// ----------------------------------------------------

let ttsKeepAliveTimer: any = null;
let currentUtteranceQueue: SpeechSynthesisUtterance[] = [];
let isQueuePlaying = false;

// Heuristic to discover the best deep masculine English voices across platforms
export function getBestMasculineVoice(voices: SpeechSynthesisVoice[], preferredVoiceName?: string): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;

  if (preferredVoiceName) {
    const matched = voices.find(v => v.name.toLowerCase().includes(preferredVoiceName.toLowerCase()) || v.voiceURI.toLowerCase() === preferredVoiceName.toLowerCase());
    if (matched) return matched;
  }

  // Priority search for distinguished deep male accents:
  // 1. UK English Deep / British Male (Daniel, George, Arthur, Oliver, Ryan, Malcolm, Brian)
  // 2. US English Deep Male (Google US English Male, Guy, David, Alex, Tom, Aaron, Fred)
  // 3. AU / Scottish / Irish / South African accents (Russell, Oliver, James)
  const maleKeywords = [
    'daniel', 'george', 'guy', 'david', 'alex', 'arthur', 'oliver', 'ryan',
    'brian', 'tom', 'aaron', 'russell', 'james', 'richard', 'charles', 'male', 'deep', 'natural (male)'
  ];

  // Try British/Scottish/Irish deep male voice first for refined accented persona
  const britishMale = voices.find(v => {
    const name = v.name.toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    return (lang.includes('en-gb') || lang.includes('en_gb') || lang.includes('en-sc') || lang.includes('en-ie')) &&
      maleKeywords.some(k => name.includes(k));
  });
  if (britishMale) return britishMale;

  // General English masculine voice matching keywords
  const englishMale = voices.find(v => {
    const name = v.name.toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    return lang.startsWith('en') && maleKeywords.some(k => name.includes(k));
  });
  if (englishMale) return englishMale;

  // UK English natural voice
  const ukEnglish = voices.find(v => {
    const lang = (v.lang || '').toLowerCase();
    return lang.includes('en-gb') || lang.includes('en_gb') || lang.includes('en-au');
  });
  if (ukEnglish) return ukEnglish;

  // Any English voice
  return voices.find(v => (v.lang || '').toLowerCase().startsWith('en')) || voices[0];
}

// Splits continuous text into natural conversational spoken phrases to prevent SpeechSynthesis timeouts
function splitIntoConversationalChunks(text: string): string[] {
  // Clean markdown, symbols, code markers
  const clean = text
    .replace(/[*#`_~[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return [];

  // Split by sentence boundaries (. ! ?) or major commas/semicolons if sentence is long
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length > 140) {
      // Split long sentence at comma/semicolon for natural human breathing pauses
      const subParts = trimmed.split(/([,;:]\s+)/);
      let buffer = '';
      for (const part of subParts) {
        if ((buffer + part).length < 120) {
          buffer += part;
        } else {
          if (buffer.trim()) chunks.push(buffer.trim());
          buffer = part;
        }
      }
      if (buffer.trim()) chunks.push(buffer.trim());
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.filter(c => c.length > 0);
}

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

  const chunks = splitIntoConversationalChunks(text);
  if (chunks.length === 0) {
    if (options.onEnd) options.onEnd();
    return;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  const chosenVoice = getBestMasculineVoice(voices, options.preferredVoiceName);

  // Deep masculine acoustic settings: pitch = 0.88 - 0.92, rate = 0.98 - 1.02
  const pitch = options.pitch !== undefined ? options.pitch : 0.88;
  const rate = options.rate !== undefined ? options.rate : 0.98;
  const volume = options.volume !== undefined ? options.volume : 1.0;

  const utterances = chunks.map(chunk => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.volume = volume;
    u.pitch = pitch;
    u.rate = rate;
    if (chosenVoice) {
      u.voice = chosenVoice;
    }
    return u;
  });

  currentUtteranceQueue = utterances;
  isQueuePlaying = true;

  const cleanup = () => {
    if (ttsKeepAliveTimer) {
      clearInterval(ttsKeepAliveTimer);
      ttsKeepAliveTimer = null;
    }
    currentUtteranceQueue = [];
    isQueuePlaying = false;
  };

  // Robust keep-alive loop to prevent Chrome and Safari SpeechSynthesis engine cutoff after 10-15s
  ttsKeepAliveTimer = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      if (!isQueuePlaying) cleanup();
    } else {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 4000);

  let currentIndex = 0;

  const playNextChunk = () => {
    if (!isQueuePlaying || currentIndex >= currentUtteranceQueue.length) {
      cleanup();
      if (options.onEnd) options.onEnd();
      return;
    }

    const currentUtterance = currentUtteranceQueue[currentIndex];

    currentUtterance.onend = () => {
      currentIndex++;
      playNextChunk();
    };

    currentUtterance.onerror = (e) => {
      console.warn('[VoiceEngine] TTS chunk error:', e);
      currentIndex++;
      if (currentIndex < currentUtteranceQueue.length) {
        playNextChunk();
      } else {
        cleanup();
        if (options.onError) options.onError(e);
      }
    };

    try {
      window.speechSynthesis.speak(currentUtterance);
      window.speechSynthesis.resume();
    } catch (err) {
      console.warn('[VoiceEngine] Utterance speak exception:', err);
      cleanup();
      if (options.onError) options.onError(err);
    }
  };

  playNextChunk();
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
