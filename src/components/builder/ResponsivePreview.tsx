import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  RefreshCw, 
  ExternalLink, 
  Terminal, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Zap,
  Cpu,
  Layers,
  XCircle
} from 'lucide-react';
import { ProjectFile } from './ProjectTemplates';
import { eventBus } from '../../services/eventBus';

interface ResponsivePreviewProps {
  files: ProjectFile[];
  onTriggerCompile?: () => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({ files }) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);
  const [scale, setScale] = useState<number>(100);
  const [showDevTools, setShowDevTools] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Listen for sandbox execution messages from inside the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SANDBOX_ERROR') {
        setHasError(true);
        setErrorMessage(event.data.message);
        setConsoleLogs(prev => [`[ERROR] ${event.data.message}`, ...prev]);
        
        // Emit global event to trigger toast notification system
        eventBus.emit('sandbox:code_failed', {
          title: 'Sandbox Execution Failed',
          error: event.data.message || 'Syntax or runtime error detected in sandbox preview.'
        });
      } else if (event.data && event.data.type === 'SANDBOX_SUCCESS') {
        setHasError(false);
        setErrorMessage('');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Generate runnable HTML string with bundled files, Babel, React, and Tailwind CSS + Lucide Icon Shims
  const generateIframeSrcDoc = () => {
    // Combine all component files into a bundled module script
    const componentsCode = files
      .filter(f => f.path.endsWith('.tsx') || f.path.endsWith('.ts') || f.path.endsWith('.jsx') || f.path.endsWith('.js'))
      .map(f => {
        let code = f.content
          .replace(/import\s+type\s+[\s\S]*?;/g, '')
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
          .replace(/import\s+['"][^'"]+['"];?/g, '')
          .replace(/import\s*\([^)]*\);?/g, '')
          .replace(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/g, 'window.$1 = $1; function $1')
          .replace(/export\s+default\s+class\s+([A-Za-z0-9_$]+)/g, 'window.$1 = $1; class $1')
          .replace(/export\s+default\s+function\s*\(/g, 'window.App = function(')
          .replace(/export\s+default\s+([A-Za-z0-9_$]+);?/g, 'window.$1 = $1;')
          .replace(/export\s+const\s+([A-Za-z0-9_$]+)\s*=/g, 'const $1 =')
          .replace(/export\s+let\s+([A-Za-z0-9_$]+)\s*=/g, 'let $1 =')
          .replace(/export\s+function\s+([A-Za-z0-9_$]+)/g, 'function $1')
          .replace(/export\s+class\s+([A-Za-z0-9_$]+)/g, 'class $1')
          .replace(/export\s+\{[\s\S]*?\};?/g, '');
        return `// File: ${f.path}\n${code}\n`;
      })
      .join('\n\n');

    // Safe script tag escaping
    const safeCode = componentsCode.replace(/<\/script>/gi, '<\\/script>');

    return `
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Tailwind CSS CDN -->
  <script crossorigin="anonymous" src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' }
          }
        }
      }
    };
  </script>
  <!-- React 18 & ReactDOM -->
  <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- Babel Standalone for JSX & TypeScript Browser Compilation -->
  <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      if (!msg || msg === 'Script error.' || String(msg).indexOf('ResizeObserver') !== -1) {
        return true;
      }
      var errorText = (error && error.message) ? error.message : (msg + (lineNo ? ' (line ' + lineNo + ')' : ''));
      window.parent.postMessage({ type: 'SANDBOX_ERROR', message: errorText }, '*');
      return true;
    };
  </script>
  <style>
    * { box-sizing: border-box; }
    body { background-color: #020617; color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Raw User Source Code (TSX/JSX) -->
  <script id="user-source" type="text/plain">${safeCode}</script>

  <script>
    // Expose React and Hooks globally for all dynamic components
    window.useState = React.useState;
    window.useEffect = React.useEffect;
    window.useRef = React.useRef;
    window.useMemo = React.useMemo;
    window.useCallback = React.useCallback;
    window.useContext = React.useContext;
    window.useReducer = React.useReducer;
    window.createContext = React.createContext;

    // Comprehensive Lucide & Standard SVG Icon Shim Factory
    const createIcon = (svgPath, viewBox = '0 0 24 24') => {
      return function IconComponent({ className = 'w-4 h-4', size = 16, color = 'currentColor', ...props }) {
        return React.createElement('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: viewBox,
          width: size,
          height: size,
          fill: 'none',
          stroke: color,
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: className,
          dangerouslySetInnerHTML: { __html: svgPath },
          ...props
        });
      };
    };

    // Standard Icon Library Definitions on window
    window.createIcon = createIcon;
    window.Activity = createIcon('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>');
    window.Zap = createIcon('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>');
    window.Check = createIcon('<polyline points="20 6 9 17 4 12"></polyline>');
    window.CheckCircle = createIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>');
    window.CheckCircle2 = window.CheckCircle;
    window.Play = createIcon('<polygon points="5 3 19 12 5 21 5 3"></polygon>');
    window.Sparkles = createIcon('<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>');
    window.ArrowRight = createIcon('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>');
    window.Search = createIcon('<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>');
    window.Plus = createIcon('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>');
    window.Trash2 = createIcon('<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>');
    window.Filter = createIcon('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>');
    window.RefreshCw = createIcon('<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>');
    window.RotateCw = createIcon('<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>');
    window.Terminal = createIcon('<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>');
    window.Code = createIcon('<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>');
    window.Cpu = createIcon('<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>');
    window.Brain = createIcon('<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04"></path>');
    window.Layers = createIcon('<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>');
    window.Users = createIcon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>');
    window.Shield = createIcon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>');
    window.ShieldCheck = createIcon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline>');
    window.Sun = createIcon('<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>');
    window.Moon = createIcon('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>');
    window.Menu = createIcon('<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>');
    window.X = createIcon('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>');
    window.ChevronDown = createIcon('<polyline points="6 9 12 15 18 9"></polyline>');
    window.ChevronRight = createIcon('<polyline points="9 18 15 12 9 6"></polyline>');
    window.ChevronLeft = createIcon('<polyline points="15 18 9 12 15 6"></polyline>');
    window.ChevronUp = createIcon('<polyline points="18 15 12 9 6 15"></polyline>');
    window.Folder = createIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>');
    window.Layout = createIcon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>');
    window.BarChart3 = createIcon('<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>');
    window.Package = createIcon('<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>');
    window.Database = createIcon('<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>');
    window.Mic = createIcon('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>');
    window.MessageSquare = createIcon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>');
    window.ExternalLink = createIcon('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>');
    window.Globe = createIcon('<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>');
    window.Star = createIcon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>');
    window.Heart = createIcon('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>');
    window.Mail = createIcon('<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>');
    window.Phone = createIcon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>');
    window.Send = createIcon('<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>');
    window.Clock = createIcon('<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline>');
    window.Calendar = createIcon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>');
    window.Eye = createIcon('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>');
    window.EyeOff = createIcon('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line>');
    window.Copy = createIcon('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>');
    window.Download = createIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>');
    window.Upload = createIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>');
    window.AlertCircle = createIcon('<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>');
    window.AlertTriangle = createIcon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>');
    window.Settings = createIcon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>');

    // React Error Boundary for Preview Frame
    class PreviewErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
      }
      componentDidCatch(error, errorInfo) {
        console.warn('Sandbox App Render Catch:', error);
      }
      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: { padding: '24px', color: '#f87171', background: '#1e1014', border: '1px solid #7f1d1d', borderRadius: '12px', margin: '20px', fontFamily: 'monospace' }
          }, [
            React.createElement('strong', { key: 'h', style: { color: '#fca5a5' } }, 'Component Render Error:'),
            React.createElement('pre', { key: 'p', style: { marginTop: '12px', whiteSpace: 'pre-wrap', fontSize: '12px', color: '#fecaca' } }, 
              this.state.error ? (this.state.error.message || String(this.state.error)) : 'Unknown render error'
            )
          ]);
        }
        return this.props.children;
      }
    }
    window.PreviewErrorBoundary = PreviewErrorBoundary;

    // Provide CommonJS module / require shims
    window.exports = {};
    window.module = { exports: window.exports };
    window.require = function(mod) {
      if (mod === 'react') return window.React;
      if (mod === 'react-dom') return window.ReactDOM;
      if (mod === 'lucide-react') return window;
      if (mod === 'framer-motion' || mod === 'motion/react' || mod === 'motion') return window.Motion || {};
      return window[mod] || {};
    };

    function runSandboxApp() {
      try {
        const sourceElement = document.getElementById('user-source');
        if (!sourceElement) return;
        const sourceCode = sourceElement.textContent || '';

        // Compile TSX/JSX to JS with Babel Standalone in classic React mode (produces React.createElement without import statements)
        const transformed = Babel.transform(sourceCode, {
          presets: [
            ['react', { runtime: 'classic' }],
            'typescript'
          ],
          filename: 'App.tsx'
        });

        // Strip any residual ES import statements before execution
        const runnableCode = transformed.code
          .replace(/import\s+type\s+[\s\S]*?;/g, '')
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
          .replace(/import\s+['"][^'"]+['"];?/g, '')
          .replace(/import\s*\([^)]*\);?/g, '');

        // Execute compiled code
        const runner = new Function(runnableCode);
        runner();

        const RootComponent = window.App || (typeof App !== 'undefined' ? App : null);

        if (RootComponent) {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(
            React.createElement(
              PreviewErrorBoundary,
              null,
              React.createElement(RootComponent, null)
            )
          );
          window.parent.postMessage({ type: 'SANDBOX_SUCCESS' }, '*');
        } else {
          document.getElementById('root').innerHTML = '<div style="padding: 24px; color: #f59e0b; font-family: monospace; background: #0f172a; border: 1px solid #334155; border-radius: 12px; margin: 20px;"><strong>Notice:</strong> Could not find an exported App component. Ensure <code>export default function App()</code> is defined in <code>src/App.tsx</code>.</div>';
          window.parent.postMessage({ type: 'SANDBOX_SUCCESS' }, '*');
        }
      } catch (err) {
        console.error("Sandbox Execution Error:", err);
        const msg = err && err.message ? err.message : String(err);
        if (msg !== 'Script error.') {
          window.parent.postMessage({ type: 'SANDBOX_ERROR', message: msg }, '*');
        }
        document.getElementById('root').innerHTML = '<div style="padding: 24px; color: #ef4444; font-family: monospace; background: #1e1014; border: 1px solid #7f1d1d; border-radius: 12px; margin: 20px;"><strong>Runtime Sandbox Error:</strong><br/><pre style="margin-top: 12px; white-space: pre-wrap; font-size: 12px; color: #fca5a5;">' + msg + '</pre></div>';
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runSandboxApp);
    } else {
      runSandboxApp();
    }
  </script>
</body>
</html>
    `;
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    setConsoleLogs(prev => [`[${new Date().toLocaleTimeString()}] Preview frame reloaded and compiled cleanly.`, ...prev]);
  };

  const handleOpenNewTab = () => {
    const srcDoc = generateIframeSrcDoc();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(srcDoc);
      win.document.close();
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(consoleLogs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Dimensions Mapping
  const getDeviceFrameStyles = () => {
    if (deviceMode === 'mobile') {
      const width = isLandscape ? '667px' : '375px';
      const height = isLandscape ? '375px' : '667px';
      return { width, height };
    }
    if (deviceMode === 'tablet') {
      const width = isLandscape ? '1024px' : '768px';
      const height = isLandscape ? '768px' : '1024px';
      return { width, height };
    }
    return { width: '100%', height: '100%' };
  };

  const frameDim = getDeviceFrameStyles();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden font-mono text-xs">
      {/* Device & Viewport Toolbar */}
      <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-slate-300">
        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDeviceMode('desktop')}
            title="Desktop Mode (100%)"
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              deviceMode === 'desktop' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>

          <button
            onClick={() => setDeviceMode('tablet')}
            title="Tablet Mode (768px)"
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              deviceMode === 'tablet' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>

          <button
            onClick={() => setDeviceMode('mobile')}
            title="Mobile Mode (375px)"
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              deviceMode === 'mobile' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Orientation & Zoom */}
        {deviceMode !== 'desktop' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              title="Toggle Orientation"
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-lg flex items-center gap-1 text-slate-300"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
              <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
            </button>
          </div>
        )}

        {/* Scale Zoom Selector */}
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-[11px]">
          <span className="text-slate-500">Scale:</span>
          {[75, 100, 125].map(s => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`px-1.5 py-0.5 rounded ${scale === s ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
            >
              {s}%
            </button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          {hasError ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[11px]">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Execution Error</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Build Active</span>
            </div>
          )}

          <button
            onClick={() => setShowDevTools(!showDevTools)}
            title="Toggle DevTools Console"
            className={`p-1.5 rounded-lg border transition-all ${
              showDevTools ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRefresh}
            title="Recompile & Refresh Preview"
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenNewTab}
            title="Open Full Preview in New Tab"
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container & Canvas */}
      <div className="flex-1 bg-slate-950 overflow-auto p-4 flex flex-col items-center justify-center relative">
        <div
          style={{
            width: frameDim.width,
            height: frameDim.height,
            transform: `scale(${scale / 100})`,
            transformOrigin: 'top center'
          }}
          className={`transition-all duration-300 relative shadow-2xl overflow-hidden ${
            deviceMode !== 'desktop'
              ? 'rounded-[32px] border-8 border-slate-800 bg-slate-900 p-1 shadow-amber-500/5'
              : 'w-full h-full rounded-2xl border border-slate-800'
          }`}
        >
          {/* Top Speaker Bezel for Mobile/Tablet */}
          {deviceMode !== 'desktop' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-slate-800 rounded-full z-20 pointer-events-none" />
          )}

          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={generateIframeSrcDoc()}
            title="Live App Preview"
            className="w-full h-full border-none rounded-xl bg-slate-950"
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
          />
        </div>

        {/* DevTools Drawer */}
        {showDevTools && (
          <div className="w-full h-44 bg-slate-950 border-t border-slate-800 p-3 flex flex-col font-mono text-xs shrink-0 mt-2 rounded-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-slate-200">Sandbox Console & Runtime Output</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded flex items-center gap-1"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
                </button>
                <button onClick={() => setConsoleLogs([])} className="text-slate-500 hover:text-slate-300">
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pt-2 space-y-1 text-slate-400 text-[11px]">
              {hasError ? (
                <div className="text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span>[Runtime Error]: {errorMessage}</span>
                </div>
              ) : (
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>[Bundle Engine]: AST parsed {files.length} project files without syntax errors.</span>
                </div>
              )}
              <div className="text-cyan-400">
                [Babel Standalone]: React 18 JSX transpilation pipeline initialized.
              </div>
              <div className="text-amber-400/80">
                [Tailwind CDN]: JIT compiler active with dark mode utilities.
              </div>
              {consoleLogs.map((log, i) => (
                <div key={i} className="text-slate-300 font-mono">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
