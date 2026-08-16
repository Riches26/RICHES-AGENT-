import { useEffect } from 'react';

// Voice wake-word and command capture using Web Speech API
// Listens for "hey riches" or "riches" and then captures the following spoken command
// Sends the captured command to the server endpoint /api/voice/conversational-turn
// Plays acknowledgement and response via browser TTS (speechSynthesis)

const WAKE_WORD_REGEX = /\b(hey\s+riches|riches)\b/i;
const COMMAND_CAPTURE_MS = 5500; // capture window after wake

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
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

export default function initRichesVoice() {
  // This file may be imported from main.tsx — run as a side-effect initializer
  // If the browser doesn't support recognition, log and exit
  const AnyWindow: any = window as any;
  const SpeechRecognition = AnyWindow.webkitSpeechRecognition || AnyWindow.SpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API SpeechRecognition not supported in this browser.');
    return;
  }

  let recognition: any = null;
  let capturingCommand = false;
  let commandBuffer = '';
  let captureTimer: any = null;
  let lastInterim = '';
  let enabled = false;

  function startRecognition() {
    if (recognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (ev: any) => {
      let interim = '';
      let final = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interim += r[0].transcript + ' ';
      }

      const transcript = (commandBuffer + final + interim).trim();

      if (!capturingCommand) {
        // Look for wake word in the incoming transcript
        const probe = (final + interim).trim();
        if (WAKE_WORD_REGEX.test(probe)) {
          console.log('[Riches Voice] Wake word detected:', probe);
          capturingCommand = true;
          commandBuffer = '';
          lastInterim = '';

          // immediate acknowledgement using TTS
          try {
            speak('Riches. I am listening.');
          } catch (e) {
            console.warn('TTS ack failed', e);
          }

          // set a capture timer — collect user's command for COMMAND_CAPTURE_MS
          if (captureTimer) clearTimeout(captureTimer);
          captureTimer = setTimeout(() => {
            finishCaptureAndSend();
          }, COMMAND_CAPTURE_MS);
        }
      } else {
        // we are in capture mode
        // append final results to buffer
        if (final && final.trim()) {
          commandBuffer += final + ' ';
          // refresh timer on new final
          if (captureTimer) clearTimeout(captureTimer);
          captureTimer = setTimeout(() => finishCaptureAndSend(), COMMAND_CAPTURE_MS);
        } else {
          // interim updates — keep lastInterim in case no final arrives
          lastInterim = interim;
        }
      }
    };

    recognition.onerror = (ev: any) => {
      console.warn('[Riches Voice] recognition error', ev);
      // try to restart on transient errors
      if (enabled) {
        try { recognition.stop(); } catch {}
        recognition = null;
        setTimeout(startRecognition, 500);
      }
    };

    recognition.onend = () => {
      // If enabled, restart recognition loop so it's always listening
      recognition = null;
      if (enabled) {
        setTimeout(startRecognition, 300);
      }
    };

    try {
      recognition.start();
      console.log('[Riches Voice] SpeechRecognition started');
    } catch (e) {
      console.warn('[Riches Voice] Failed to start recognition', e);
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
      console.log('[Riches Voice] No command captured after wake.');
      try { speak('I did not hear a command.'); } catch {}
      return;
    }

    console.log('[Riches Voice] Captured command:', finalCommand);

    // Send to backend conversational-turn endpoint
    try {
      const resp = await fetch('/api/voice/conversational-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalCommand, history: [], personality: 'conversational' })
      });

      const json = await resp.json();
      console.log('[Riches Voice] Server response:', safeJson(json));

      const spoken = json?.spokenText || json?.displayText || 'Okay. Done.';
      try { speak(spoken); } catch (e) { console.warn('TTS play failed', e); }

    } catch (err) {
      console.error('[Riches Voice] Failed to send command to server', err);
      try { speak('Sorry, I could not process your request.'); } catch {}
    }
  }

  function enableVoiceListening() {
    if (enabled) return;
    enabled = true;
    startRecognition();
    // request permission for microphone by creating an audio context (best-effort)
    try {
      navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(t => t.stop());
      }).catch(() => {});
    } catch {}
  }

  // Attach an easy-to-trigger user gesture: start listening on first user click/tap if not already started.
  function onFirstInteraction() {
    document.removeEventListener('click', onFirstInteraction);
    enableVoiceListening();
  }

  document.addEventListener('click', onFirstInteraction);

  // Expose a small window listener for manual enable via console for dev
  (window as any).__richesVoice = {
    enable: enableVoiceListening,
    disable: () => { enabled = false; if (recognition) try { recognition.stop(); } catch {}; recognition = null; },
    finish: finishCaptureAndSend
  };

  console.log('[Riches Voice] Initialized. Click anywhere on the page to enable microphone permission and voice wake listening.');
}
