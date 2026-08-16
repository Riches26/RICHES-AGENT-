import { useEffect } from 'react';

// Enhanced Riches Voice: Wake-word, UI controls, optional on-device hotword integration placeholder,
// visual transcript, retry/backoff, language & sensitivity controls, mute toggle.

const DEFAULT_WAKE_WORD_REGEX = /\b(hey\s+riches|riches)\b/i;
let WAKE_WORD_REGEX = DEFAULT_WAKE_WORD_REGEX;
let COMMAND_CAPTURE_MS = 5500; // capture window after wake (adjustable by sensitivity)

function log(...args: any[]) {
  console.log('[Riches Voice]', ...args);
}

function speak(text: string, lang = 'en-US', muted = false) {
  try {
    if (muted) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1.0;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS error', e);
  }
}

function safeJson(v: any) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

async function fetchWithRetry(url: string, options: any, retries = 3) {
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < retries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      const delay = Math.pow(2, attempt) * 300; // exponential backoff
      await new Promise(r => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

export default function initRichesVoice() {
  const AnyWindow: any = window as any;
  const SpeechRecognition = AnyWindow.webkitSpeechRecognition || AnyWindow.SpeechRecognition;

  // UI state
  let recognition: any = null;
  let capturingCommand = false;
  let commandBuffer = '';
  let captureTimer: any = null;
  let lastInterim = '';
  let enabled = false;
  let muted = false;
  let currentLang = 'en-US';
  let sensitivity = 0.5; // 0.0 (low) - 1.0 (high) controlling capture window and responsiveness
  let useOnDeviceHotword = false;
  let hotwordEngineAvailable = !!(AnyWindow.PvPorcupine || AnyWindow.pvPorcupine);
  let porcupineInstance: any = null;
  let hotwordStream: MediaStream | null = null;

  // Inject floating UI control
  const controlId = 'riches-voice-control';
  if (!document.getElementById(controlId)) {
    const el = document.createElement('div');
    el.id = controlId;
    el.style.position = 'fixed';
    el.style.right = '12px';
    el.style.bottom = '12px';
    el.style.zIndex = '9999';
    el.style.width = '280px';
    el.style.maxWidth = 'calc(100% - 24px)';
    el.style.background = 'rgba(10,11,13,0.85)';
    el.style.color = 'white';
    el.style.borderRadius = '12px';
    el.style.boxShadow = '0 6px 20px rgba(2,6,23,0.6)';
    el.style.padding = '10px';
    el.style.fontFamily = 'Inter, system-ui, -apple-system, Roboto, sans-serif';
    el.style.fontSize = '13px';

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <button id="riches-voice-toggle" style="background:#ffb020;border:none;padding:8px;border-radius:8px;font-weight:600;cursor:pointer">Enable</button>
        <div style="flex:1"> <div id="riches-voice-status" style="font-weight:700">Idle</div>
        <div id="riches-voice-substatus" style="font-size:11px;opacity:0.8">Click to grant mic permission</div></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
        <label style="font-size:12px">Lang</label>
        <select id="riches-voice-lang" style="flex:1;padding:6px;border-radius:6px;background:#0b1220;border:1px solid rgba(255,255,255,0.06);color:white">
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Español</option>
          <option value="fr-FR">Français</option>
        </select>
      </div>

      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
        <label style="font-size:12px">Sensitivity</label>
        <input id="riches-voice-sensitivity" type="range" min="0" max="1" step="0.05" value="0.5" style="flex:1" />
      </div>

      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
        <button id="riches-voice-mute" style="flex:1;padding:6px;border-radius:8px;background:#111827;border:1px solid rgba(255,255,255,0.06);color:white">Mute</button>
        <button id="riches-voice-hotword" style="flex:1;padding:6px;border-radius:8px;background:#0b1220;border:1px solid rgba(255,255,255,0.06);color:white">Hotword: ${hotwordEngineAvailable ? 'Available' : 'Not found'}</button>
      </div>

      <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;max-height:120px;overflow:auto">
        <div id="riches-voice-transcript" style="white-space:pre-wrap;font-size:12px;opacity:0.95">Transcript will appear here...</div>
      </div>
    `;

    document.body.appendChild(el);

    // Attach handlers
    const toggleBtn = document.getElementById('riches-voice-toggle') as HTMLButtonElement;
    const muteBtn = document.getElementById('riches-voice-mute') as HTMLButtonElement;
    const langSelect = document.getElementById('riches-voice-lang') as HTMLSelectElement;
    const sensInput = document.getElementById('riches-voice-sensitivity') as HTMLInputElement;
    const hotwordBtn = document.getElementById('riches-voice-hotword') as HTMLButtonElement;

    toggleBtn.addEventListener('click', () => {
      if (!enabled) {
        enableVoiceListening();
        toggleBtn.textContent = 'Disable';
        document.getElementById('riches-voice-substatus')!.textContent = 'Listening for wake word...';
      } else {
        disableVoiceListening();
        toggleBtn.textContent = 'Enable';
        document.getElementById('riches-voice-substatus')!.textContent = 'Voice disabled';
      }
    });

    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.textContent = muted ? 'Unmute' : 'Mute';
    });

    langSelect.addEventListener('change', () => {
      currentLang = langSelect.value;
      if (recognition) recognition.lang = currentLang;
    });

    sensInput.addEventListener('input', () => {
      sensitivity = Number(sensInput.value);
      // map sensitivity to capture window: higher sensitivity = longer capture window
      COMMAND_CAPTURE_MS = 3000 + Math.round(sensitivity * 7000); // 3s - 10s
    });

    hotwordBtn.addEventListener('click', async () => {
      if (!hotwordEngineAvailable) {
        alert('On-device hotword engine not found. Optionally include Picovoice Porcupine Web integration.');
        return;
      }
      useOnDeviceHotword = !useOnDeviceHotword;
      hotwordBtn.textContent = `Hotword: ${useOnDeviceHotword ? 'Enabled' : 'Disabled'}`;

      if (useOnDeviceHotword) {
        // Start porcupine stream if available
        try {
          await startPorcupineHotword();
        } catch (e) {
          console.warn('Failed to start hotword engine', e);
        }
      } else {
        stopPorcupineHotword();
      }
    });
  }

  function updateTranscript(text: string, sub = '') {
    const tEl = document.getElementById('riches-voice-transcript');
    const statusEl = document.getElementById('riches-voice-status');
    const subEl = document.getElementById('riches-voice-substatus');
    if (tEl) tEl.textContent = text || '...';
    if (statusEl) statusEl.textContent = sub || (enabled ? (capturingCommand ? 'Recording' : 'Listening') : 'Idle');
    if (subEl && enabled) subEl.textContent = capturingCommand ? 'Recording command...' : 'Waiting for wake word';
  }

  async function startPorcupineHotword() {
    const AnyWindow: any = window as any;
    const pv = AnyWindow.PvPorcupine || AnyWindow.pvPorcupine;
    if (!pv) throw new Error('Porcupine runtime not available');

    // This is a lightweight integration placeholder. The user/deployer must include the Porcupine Web SDK
    // and provide a keyword model for "riches". See Picovoice docs for details.
    log('Starting porcupine hotword (placeholder)');

    try {
      hotwordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The actual porcupine processing loop would go here, calling pv.process on audio frames
      // For safety we only show placeholder hooks. Real integration requires SDK and model binaries.
      // We'll simulate detection if porcupineInstance reports a callback-based API.

      if (pv && pv.create) {
        porcupineInstance = await pv.create({ /* model params */ });
        porcupineInstance.on('keyword', (keyword: string) => {
          log('Porcupine detected keyword:', keyword);
          // directly start capture on hotword
          onHotwordDetected();
        });
      }
    } catch (e) {
      console.warn('Porcupine start failed (placeholder).', e);
    }
  }

  function stopPorcupineHotword() {
    try {
      if (porcupineInstance && porcupineInstance.release) porcupineInstance.release();
    } catch {}
    try { hotwordStream?.getTracks().forEach(t => t.stop()); } catch {}
    porcupineInstance = null;
    hotwordStream = null;
  }

  function onHotwordDetected() {
    // behave same as wake-word via SpeechRecognition
    capturingCommand = true;
    commandBuffer = '';
    lastInterim = '';
    updateTranscript('Hotword detected — recording...','Hotword');
    try { speak('Riches. I am listening.', currentLang, muted); } catch {}
    if (captureTimer) clearTimeout(captureTimer);
    captureTimer = setTimeout(() => finishCaptureAndSend(), COMMAND_CAPTURE_MS);
  }

  function startRecognition() {
    if (recognition) return;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not available');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLang;

    recognition.onresult = (ev: any) => {
      let interim = '';
      let final = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interim += r[0].transcript + ' ';
      }

      const probe = (final + interim).trim();
      updateTranscript(probe, enabled ? (capturingCommand ? 'Recording' : 'Listening') : 'Idle');

      if (!capturingCommand && !useOnDeviceHotword) {
        if (WAKE_WORD_REGEX.test(probe)) {
          log('Wake word detected (ASR):', probe);
          capturingCommand = true;
          commandBuffer = '';
          lastInterim = '';
          updateTranscript('', 'Wake');
          try { speak('Riches. I am listening.', currentLang, muted); } catch (e) { console.warn(e); }
          if (captureTimer) clearTimeout(captureTimer);
          captureTimer = setTimeout(() => finishCaptureAndSend(), COMMAND_CAPTURE_MS);
        }
      } else if (capturingCommand) {
        if (final && final.trim()) {
          commandBuffer += final + ' ';
          if (captureTimer) clearTimeout(captureTimer);
          captureTimer = setTimeout(() => finishCaptureAndSend(), COMMAND_CAPTURE_MS);
        } else {
          lastInterim = interim;
        }
      }
    };

    recognition.onerror = (ev: any) => {
      console.warn('recognition error', ev);
      updateTranscript('', 'Error');
      if (enabled) {
        try { recognition.stop(); } catch {}
        recognition = null;
        setTimeout(startRecognition, 700);
      }
    };

    recognition.onend = () => {
      recognition = null;
      if (enabled) setTimeout(startRecognition, 300);
    };

    try {
      recognition.start();
      log('SpeechRecognition started');
      updateTranscript('', 'Listening');
    } catch (e) {
      console.warn('Failed to start recognition', e);
    }
  }

  async function finishCaptureAndSend() {
    if (!capturingCommand) return;
    capturingCommand = false;
    if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }

    const finalCommand = (commandBuffer + ' ' + lastInterim).trim();
    commandBuffer = '';
    lastInterim = '';

    if (!finalCommand) {
      log('No command captured after wake.');
      updateTranscript('', 'No command');
      try { speak('I did not hear a command.', currentLang, muted); } catch {}
      return;
    }

    updateTranscript(finalCommand, 'Processing');
    log('Captured command:', finalCommand);

    try {
      const json = await fetchWithRetry('/api/voice/conversational-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalCommand, history: [], personality: 'conversational' })
      }, 3);

      log('Server response:', safeJson(json));
      const spoken = json?.spokenText || json?.displayText || 'Okay. Done.';
      updateTranscript(spoken, 'Responding');
      try { speak(spoken, currentLang, muted); } catch (e) { console.warn('TTS play failed', e); }
    } catch (err) {
      console.error('Failed to send command to server', err);
      updateTranscript('', 'Error');
      try { speak('Sorry, I could not process your request.', currentLang, muted); } catch {}
    }
  }

  function enableVoiceListening() {
    if (enabled) return;
    enabled = true;
    // request permission for microphone by creating an audio context and getUserMedia
    try {
      navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(t => t.stop());
      }).catch(() => {});
    } catch {}

    // adjust wake regex sensitivity if needed
    if (sensitivity < 0.3) {
      // be strict: require exact "hey riches" phrase
      WAKE_WORD_REGEX = /\bhey\s+riches\b/i;
    } else {
      WAKE_WORD_REGEX = DEFAULT_WAKE_WORD_REGEX;
    }

    if (useOnDeviceHotword && hotwordEngineAvailable) {
      startPorcupineHotword().catch(e => log('Porcupine start error', e));
    }

    startRecognition();
    updateTranscript('', 'Listening');
  }

  function disableVoiceListening() {
    enabled = false;
    try { recognition?.stop(); } catch {}
    recognition = null;
    stopPorcupineHotword();
    updateTranscript('', 'Idle');
  }

  // Allow first user click to enable automatically (browser requirement for mic prompt)
  function onFirstInteraction() {
    document.removeEventListener('click', onFirstInteraction);
    // do nothing automatic — user can press Enable UI
  }
  document.addEventListener('click', onFirstInteraction);

  // Expose dev controls
  (window as any).__richesVoice = {
    enable: enableVoiceListening,
    disable: disableVoiceListening,
    finish: finishCaptureAndSend,
    setMuted: (m: boolean) => { muted = m; },
    isHotwordAvailable: hotwordEngineAvailable,
  };

  log('Enhanced Riches Voice initialized (UI injected).');
}
