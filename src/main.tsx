import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import initRichesVoice from './lib/voiceWake';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Initialize Riches voice features (UI + wake-word listener)
try {
  initRichesVoice();
} catch (e) {
  // Fail gracefully in environments without browser APIs (SSR/tests)
  // eslint-disable-next-line no-console
  console.warn('Failed to initialize Riches voice module', e);
}
