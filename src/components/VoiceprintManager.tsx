import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Volume2,
  Info,
  Sliders,
  Award,
  Check,
  FileAudio,
  Radio,
  Lock,
  Unlock,
  ChevronRight
} from 'lucide-react';
import {
  VoiceprintFeature,
  EnrolledVoiceSample,
  OwnerVoiceProfile,
  VoiceMatchResult,
  analyzeAudioFile,
  analyzeAudioBlob,
  matchVoiceAgainstProfile,
  computeAggregateProfile,
  loadOwnerVoiceProfileFromStorage,
  saveOwnerVoiceProfileToStorage,
  clearOwnerVoiceProfileFromStorage,
  estimatePitch,
  extractAcousticFeaturesFromBuffer
} from '../services/voiceprintEngine';
import { saveOwnerVoiceProfile, deleteOwnerVoiceProfile } from '../services/api';

interface VoiceprintManagerProps {
  ownerProfile: OwnerVoiceProfile | null;
  onProfileUpdated: (profile: OwnerVoiceProfile | null) => void;
  onClose?: () => void;
}

const GUIDED_PHRASES = [
  {
    step: 1,
    title: 'Wake Phrase Calibration',
    phrase: 'Hey Riches, wake up and stand by',
    description: 'Speak in your natural speaking tone and normal distance from your microphone.'
  },
  {
    step: 2,
    title: 'Command Cadence Calibration',
    phrase: 'Hey Riches, show my active system tasks and builder status',
    description: 'Helps Riches learn your vocal cadence and inflection during compound commands.'
  },
  {
    step: 3,
    title: 'Biometric Timbre Enrollment',
    phrase: 'Hey Riches, this is my verified voice biometric identity',
    description: 'Locks in your fundamental pitch harmonics, formant resonance, and vocal timbre.'
  }
];

export const VoiceprintManager: React.FC<VoiceprintManagerProps> = ({
  ownerProfile,
  onProfileUpdated,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'guided' | 'upload' | 'test' | 'samples' | 'settings'>('guided');
  const [ownerName, setOwnerName] = useState<string>(ownerProfile?.ownerName || 'Alex');
  const [enforcementMode, setEnforcementMode] = useState<'strict_owner_only' | 'priority_match' | 'open_pass'>(
    ownerProfile?.enforcementMode || 'priority_match'
  );
  const [threshold, setThreshold] = useState<number>(ownerProfile?.verificationThreshold || 0.72);

  // Guided Live Recording States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isRecordingStep, setIsRecordingStep] = useState<boolean>(false);
  const [recordingCountdown, setRecordingCountdown] = useState<number>(4);
  const [stepRecordedSamples, setStepRecordedSamples] = useState<Record<number, EnrolledVoiceSample>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Test Bench States
  const [isTestBenchListening, setIsTestBenchListening] = useState<boolean>(false);
  const [liveTestMatch, setLiveTestMatch] = useState<VoiceMatchResult | null>(null);
  const [livePitch, setLivePitch] = useState<number>(0);
  const [liveSpectralLevel, setLiveSpectralLevel] = useState<number>(0);
  const [testAudioLevels, setTestAudioLevels] = useState<number[]>(new Array(24).fill(6));

  // Audio Playback
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder & AudioContext Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAudioCtxRef = useRef<AudioContext | null>(null);
  const testAnalyserRef = useRef<AnalyserNode | null>(null);
  const testAnimFrameRef = useRef<number | null>(null);

  // Load existing profile name & settings
  useEffect(() => {
    if (ownerProfile) {
      setOwnerName(ownerProfile.ownerName || 'Alex');
      setEnforcementMode(ownerProfile.enforcementMode || 'priority_match');
      setThreshold(ownerProfile.verificationThreshold || 0.72);
    }
  }, [ownerProfile]);

  // Clean up audio & streams on unmount
  useEffect(() => {
    return () => {
      stopTestBench();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // ----------------------------------------------------
  // Guided Live Recording Logic
  // ----------------------------------------------------
  const startRecordingStep = async (stepNumber: number) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeAudioBlob(audioBlob);
          const sample: EnrolledVoiceSample = {
            id: `sample-step-${stepNumber}-${Date.now()}`,
            phrase: GUIDED_PHRASES[stepNumber - 1].phrase,
            recordedAt: new Date().toISOString(),
            audioDataUrl: analysis.audioDataUrl,
            features: analysis.features,
            sourceType: 'live_recording',
            durationMs: analysis.durationMs
          };

          setStepRecordedSamples(prev => ({ ...prev, [stepNumber]: sample }));
          setSuccessMessage(`Step ${stepNumber} sample recorded successfully (Pitch: ${analysis.features.meanPitchHz} Hz)!`);
          
          if (stepNumber < 3) {
            setCurrentStep(stepNumber + 1);
          }
        } catch (err: any) {
          setErrorMessage(`Audio analysis error: ${err.message || 'Could not parse voice features.'}`);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingStep(true);
      setRecordingCountdown(4);

      let timeLeft = 4;
      const timer = setInterval(() => {
        timeLeft--;
        setRecordingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          setIsRecordingStep(false);
        }
      }, 1000);

    } catch (err: any) {
      setErrorMessage(`Microphone access error: ${err.message || 'Permission denied'}`);
      setIsRecordingStep(false);
    }
  };

  // Finalize Guided Enrollment and Build Owner Profile
  const finalizeGuidedEnrollment = async () => {
    const samples: EnrolledVoiceSample[] = Object.values(stepRecordedSamples) as EnrolledVoiceSample[];
    if (samples.length === 0) {
      setErrorMessage('Please record at least one calibration phrase.');
      return;
    }

    const aggFeatures = computeAggregateProfile(samples);
    const newProfile: OwnerVoiceProfile = {
      id: ownerProfile?.id || `vp-${Date.now()}`,
      ownerName: ownerName.trim() || 'Alex',
      enrolledAt: ownerProfile?.enrolledAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      samples,
      aggregateFeatures: aggFeatures,
      verificationThreshold: threshold,
      enforcementMode,
      isActive: true
    };

    saveOwnerVoiceProfileToStorage(newProfile);
    await saveOwnerVoiceProfile(newProfile);
    onProfileUpdated(newProfile);

    setSuccessMessage(`🎉 Voiceprint Profile enrolled successfully for ${newProfile.ownerName}!`);
    setActiveTab('test');
  };

  // ----------------------------------------------------
  // File Upload Logic (Pre-recorded Audio Files)
  // ----------------------------------------------------
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAnalyzing(true);

    try {
      const newSamples: EnrolledVoiceSample[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|ogg|webm|flac|aac)$/i)) {
          continue;
        }

        const analysis = await analyzeAudioFile(file);
        newSamples.push({
          id: `sample-file-${Date.now()}-${i}`,
          phrase: `Pre-recorded Voice Sample (${file.name})`,
          recordedAt: new Date().toISOString(),
          audioDataUrl: analysis.audioDataUrl,
          features: analysis.features,
          sourceType: 'file_upload',
          filename: file.name,
          durationMs: analysis.durationMs
        });
      }

      if (newSamples.length === 0) {
        setErrorMessage('No valid audio files found. Please upload .wav, .mp3, .m4a, or .webm files.');
        return;
      }

      const existingSamples = ownerProfile?.samples || [];
      const combinedSamples = [...existingSamples, ...newSamples];
      const aggFeatures = computeAggregateProfile(combinedSamples);

      const updatedProfile: OwnerVoiceProfile = {
        id: ownerProfile?.id || `vp-${Date.now()}`,
        ownerName: ownerName.trim() || 'Alex',
        enrolledAt: ownerProfile?.enrolledAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        samples: combinedSamples,
        aggregateFeatures: aggFeatures,
        verificationThreshold: threshold,
        enforcementMode,
        isActive: true
      };

      saveOwnerVoiceProfileToStorage(updatedProfile);
      await saveOwnerVoiceProfile(updatedProfile);
      onProfileUpdated(updatedProfile);

      setSuccessMessage(`Added ${newSamples.length} pre-recorded sample(s) to ${updatedProfile.ownerName}'s voice profile!`);
      setActiveTab('samples');
    } catch (err: any) {
      setErrorMessage(`Failed to decode audio file: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ----------------------------------------------------
  // Live Test Bench Logic
  // ----------------------------------------------------
  const startTestBench = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      testStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      testAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      testAnalyserRef.current = analyser;

      setIsTestBenchListening(true);

      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      // Buffer accumulator for real-time acoustic feature extraction
      let sampleHistoryBuffer: number[] = [];
      const targetSampleRate = audioCtx.sampleRate;

      const runTestAnalysisLoop = () => {
        if (!testAnalyserRef.current) return;
        analyser.getFloatTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // Compute energy
        let rms = 0;
        for (let i = 0; i < timeData.length; i++) rms += timeData[i] * timeData[i];
        rms = Math.sqrt(rms / timeData.length);
        setLiveSpectralLevel(Math.min(100, Math.round(rms * 400)));

        // Meter bars
        const bars: number[] = [];
        const step = Math.floor(freqData.length / 24);
        for (let i = 0; i < 24; i++) {
          bars.push(Math.max(4, Math.min(60, Math.round(freqData[i * step] / 4.2))));
        }
        setTestAudioLevels(bars);

        // Detect Pitch
        const pitch = estimatePitch(timeData, targetSampleRate);
        if (pitch > 65 && pitch < 500) {
          setLivePitch(Math.round(pitch));
        }

        // Voice matching when voice activity is detected
        if (rms > 0.02) {
          // Push to history
          for (let i = 0; i < timeData.length; i += 2) sampleHistoryBuffer.push(timeData[i]);
          if (sampleHistoryBuffer.length > targetSampleRate * 1.5) {
            // Create temporary AudioBuffer to extract full voiceprint
            try {
              const tempAudioBuffer = audioCtx.createBuffer(1, sampleHistoryBuffer.length, targetSampleRate);
              tempAudioBuffer.copyToChannel(new Float32Array(sampleHistoryBuffer), 0);
              const liveFeatures = extractAcousticFeaturesFromBuffer(tempAudioBuffer);
              const matchResult = matchVoiceAgainstProfile(liveFeatures, ownerProfile);
              setLiveTestMatch(matchResult);
            } catch (_) {}
            sampleHistoryBuffer = sampleHistoryBuffer.slice(sampleHistoryBuffer.length - 2048);
          }
        }

        testAnimFrameRef.current = requestAnimationFrame(runTestAnalysisLoop);
      };

      runTestAnalysisLoop();
    } catch (err: any) {
      setErrorMessage(`Microphone test error: ${err.message}`);
      setIsTestBenchListening(false);
    }
  };

  const stopTestBench = () => {
    if (testAnimFrameRef.current) cancelAnimationFrame(testAnimFrameRef.current);
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(t => t.stop());
      testStreamRef.current = null;
    }
    if (testAudioCtxRef.current && testAudioCtxRef.current.state !== 'closed') {
      testAudioCtxRef.current.close().catch(() => {});
      testAudioCtxRef.current = null;
    }
    setIsTestBenchListening(false);
    setLiveSpectralLevel(0);
    setTestAudioLevels(new Array(24).fill(6));
  };

  // ----------------------------------------------------
  // Audio Playback Helper
  // ----------------------------------------------------
  const playSampleAudio = (sample: EnrolledVoiceSample) => {
    if (!sample.audioDataUrl) return;
    if (playingSampleId === sample.id) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setPlayingSampleId(null);
      return;
    }

    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    const audio = new Audio(sample.audioDataUrl);
    audioPlayerRef.current = audio;
    setPlayingSampleId(sample.id);

    audio.onended = () => setPlayingSampleId(null);
    audio.onerror = () => setPlayingSampleId(null);
    audio.play().catch(() => setPlayingSampleId(null));
  };

  // ----------------------------------------------------
  // Delete / Reset Sample Actions
  // ----------------------------------------------------
  const deleteSample = async (sampleId: string) => {
    if (!ownerProfile) return;
    const remaining = ownerProfile.samples.filter(s => s.id !== sampleId);
    if (remaining.length === 0) {
      await resetFullProfile();
      return;
    }

    const aggFeatures = computeAggregateProfile(remaining);
    const updatedProfile: OwnerVoiceProfile = {
      ...ownerProfile,
      samples: remaining,
      aggregateFeatures: aggFeatures,
      updatedAt: new Date().toISOString()
    };

    saveOwnerVoiceProfileToStorage(updatedProfile);
    await saveOwnerVoiceProfile(updatedProfile);
    onProfileUpdated(updatedProfile);
    setSuccessMessage('Sample removed and profile recalculated.');
  };

  const resetFullProfile = async () => {
    if (!confirm('Are you sure you want to reset and delete your enrolled voiceprint profile?')) return;
    clearOwnerVoiceProfileFromStorage();
    await deleteOwnerVoiceProfile();
    onProfileUpdated(null);
    setStepRecordedSamples({});
    setLiveTestMatch(null);
    setSuccessMessage('Owner Voice Profile reset to open pass mode.');
  };

  const saveSettings = async () => {
    if (!ownerProfile) return;
    const updatedProfile: OwnerVoiceProfile = {
      ...ownerProfile,
      ownerName: ownerName.trim() || 'Alex',
      enforcementMode,
      verificationThreshold: threshold,
      updatedAt: new Date().toISOString()
    };
    saveOwnerVoiceProfileToStorage(updatedProfile);
    await saveOwnerVoiceProfile(updatedProfile);
    onProfileUpdated(updatedProfile);
    setSuccessMessage('Voiceprint security settings saved successfully.');
  };

  const isEnrolled = !!(ownerProfile && ownerProfile.samples && ownerProfile.samples.length > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                Voiceprint Biometrics & Voice Match
              </h2>
              {isEnrolled ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enrolled: {ownerProfile.ownerName}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Uncalibrated (Open Pass)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized acoustic speaker identification — always detects and verifies your voice for wake words & commands.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEnrolled && (
            <button
              onClick={resetFullProfile}
              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset Profile
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('guided')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'guided'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" /> Guided Live Enrollment (3-Step)
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'upload'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Upload Pre-recorded Audio
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'test'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Live Voice Match Test Bench
        </button>

        <button
          onClick={() => setActiveTab('samples')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'samples'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileAudio className="w-3.5 h-3.5" /> Enrolled Samples ({ownerProfile?.samples?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Biometric Security Settings
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: GUIDED LIVE ENROLLMENT                        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'guided' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                3-Step Live Voice Calibration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Calibrates pitch ($F_0$), vocal tract formant resonance ($F_1/F_2$), and timbre embedding vectors across 3 natural phrases.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Owner Name:</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Alex"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 3 Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GUIDED_PHRASES.map((item) => {
              const sample = stepRecordedSamples[item.step];
              const isCurrent = currentStep === item.step;
              const isRecorded = !!sample;

              return (
                <div
                  key={item.step}
                  className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                    isRecorded
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : isCurrent
                      ? 'bg-amber-950/20 border-amber-500/60 ring-2 ring-amber-500/20'
                      : 'bg-slate-800/30 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-400">
                        Step {item.step} of 3
                      </span>
                      {isRecorded && (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled ({sample.features.meanPitchHz} Hz)
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                    
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono text-amber-300">
                      "{item.phrase}"
                    </div>

                    <p className="text-[11px] text-slate-400">{item.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {isRecorded ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <button
                          onClick={() => playSampleAudio(sample)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5"
                        >
                          {playingSampleId === sample.id ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-amber-400" />}
                          Play Sample
                        </button>
                        <button
                          onClick={() => startRecordingStep(item.step)}
                          disabled={isRecordingStep}
                          className="text-[11px] text-amber-400/80 hover:text-amber-300 underline"
                        >
                          Re-record
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startRecordingStep(item.step)}
                        disabled={isRecordingStep}
                        className={`w-full py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                          isRecordingStep && currentStep === item.step
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        {isRecordingStep && currentStep === item.step
                          ? `Recording... (${recordingCountdown}s)`
                          : `Record Step ${item.step}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finalize Button */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Completed {Object.keys(stepRecordedSamples).length} of 3 Calibration Steps
                </div>
                <p className="text-[11px] text-slate-400">
                  Once completed, RICHES builds a composite biometric signature locked to your acoustic voiceprint.
                </p>
              </div>
            </div>

            <button
              onClick={finalizeGuidedEnrollment}
              disabled={Object.keys(stepRecordedSamples).length === 0 || isAnalyzing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Voiceprint...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save & Activate Owner Profile
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: AUDIO FILE UPLOAD (Pre-recorded Voice)        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              Upload Pre-recorded Audio Files
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Have existing voice recordings, podcasts, voice memos, or audio files? Upload them here. The engine will decode the audio waveforms, extract pitch harmonics ($F_0$) and 32-band spectral envelopes, and add them to your biometric profile.
            </p>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700/80 hover:border-amber-500/50 bg-slate-800/20 hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <FileAudio className="w-7 h-7" />
            </div>

            <div>
              <div className="text-sm font-semibold text-white">
                Drag and drop your audio files here, or <span className="text-amber-400 underline">browse</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Supports WAV, MP3, M4A, OGG, FLAC, and WebM audio formats (Up to 50MB per file)
              </p>
            </div>

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mt-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Decoding and extracting acoustic biometric vectors...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: LIVE TEST BENCH (Speaker Verification Test)   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Real-Time Voice Match Testing Bench
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Speak into your microphone. The engine analyzes incoming audio in real-time and computes the biometric similarity score against your enrolled profile.
              </p>
            </div>

            <button
              onClick={isTestBenchListening ? stopTestBench : startTestBench}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                isTestBenchListening
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isTestBenchListening ? (
                <>
                  <MicOff className="w-4 h-4" /> Stop Live Test
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Start Voice Match Test
                </>
              )}
            </button>
          </div>

          {/* Test Gauges & Spectrum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Match Meter Card */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Speaker Verification Match
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-white">
                    {liveTestMatch ? `${liveTestMatch.matchPercentage}%` : '0%'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Threshold: {Math.round((ownerProfile?.verificationThreshold || threshold) * 100)}%
                  </span>
                </div>
              </div>

              {/* Match Badge */}
              <div className="mt-4">
                {liveTestMatch ? (
                  liveTestMatch.isMatch ? (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div>
                        <div>{liveTestMatch.speakerLabel}</div>
                        <div className="text-[10px] text-emerald-400/80 font-normal">
                          Timbre Match: {liveTestMatch.timbreMatchScore}% | Pitch: {liveTestMatch.pitchMatchScore}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                      <div>
                        <div>{liveTestMatch.speakerLabel}</div>
                        <div className="text-[10px] text-amber-400/80 font-normal">
                          Below threshold of {Math.round((ownerProfile?.verificationThreshold || threshold) * 100)}%
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                    {isTestBenchListening ? 'Awaiting spoken voice...' : 'Start test to see verification'}
                  </div>
                )}
              </div>
            </div>

            {/* Pitch & Acoustic Telemetry Card */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Acoustic Pitch ($F_0$) Tracking
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-400">{livePitch || '--'} Hz</div>
                  <div className="text-[11px] text-slate-400">Live Detected Pitch</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-300">
                    {ownerProfile?.aggregateFeatures?.meanPitchHz || '--'} Hz
                  </div>
                  <div className="text-[11px] text-slate-400">Owner Baseline Pitch</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Signal RMS Level:</span>
                <span className="font-mono text-amber-400">{liveSpectralLevel}%</span>
              </div>
            </div>

            {/* Frequency Visualizer Bars */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Live 24-Band Spectrum
              </div>

              <div className="h-20 flex items-end justify-between gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                {testAudioLevels.map((val, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-sm transition-all duration-75 bg-gradient-to-t from-amber-500 to-yellow-300"
                    style={{ height: `${val}%` }}
                  />
                ))}
              </div>

              <div className="text-[10px] text-slate-500 text-center mt-2">
                65 Hz --------------------------------- 12 kHz
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: ENROLLED SAMPLES LIST                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'samples' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-amber-400" />
              Enrolled Voice Samples ({ownerProfile?.samples?.length || 0})
            </h3>
          </div>

          {!ownerProfile || ownerProfile.samples.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/20 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              No voice samples enrolled yet. Complete the 3-step live enrollment or upload an audio file.
            </div>
          ) : (
            <div className="space-y-2">
              {ownerProfile.samples.map((sample, idx) => (
                <div
                  key={sample.id}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => playSampleAudio(sample)}
                      className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center hover:bg-amber-500 hover:text-slate-950 transition-all"
                    >
                      {playingSampleId === sample.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Sample #{idx + 1}: {sample.phrase}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {sample.sourceType === 'live_recording' ? 'Live Mic' : 'File Upload'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>Pitch: {sample.features.meanPitchHz} Hz</span>
                        <span>Centroid: {sample.features.spectralCentroidHz} Hz</span>
                        <span>Duration: {(sample.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteSample(sample.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove sample"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: BIOMETRIC SECURITY & SENSITIVITY SETTINGS    */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Voice Match Enforcement Policies
            </h3>

            {/* Mode Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setEnforcementMode('priority_match')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  enforcementMode === 'priority_match'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-white">
                  <ShieldCheck className="w-4 h-4 text-amber-400" /> Priority Owner Detection (Recommended)
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Boosts wake-word recognition for the owner's voice and badges commands as Verified Owner.
                </p>
              </div>

              <div
                onClick={() => setEnforcementMode('strict_owner_only')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  enforcementMode === 'strict_owner_only'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-white">
                  <Lock className="w-4 h-4 text-emerald-400" /> Strict Owner Only
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rejects wake words from any unverified or guest speaker below the match threshold.
                </p>
              </div>

              <div
                onClick={() => setEnforcementMode('open_pass')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  enforcementMode === 'open_pass'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-white">
                  <Unlock className="w-4 h-4 text-sky-400" /> Open Pass Mode
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Responds to any speaker while logging speaker match telemetry in the background.
                </p>
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="pt-4 border-t border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Biometric Verification Threshold: {Math.round(threshold * 100)}%
                </span>
                <span className="text-slate-400">
                  {threshold > 0.85 ? 'Very Strict' : threshold > 0.70 ? 'Balanced' : 'Permissive'}
                </span>
              </div>
              <input
                type="range"
                min="0.55"
                max="0.95"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>55% (Permissive)</span>
                <span>72% (Default)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Save Settings Button */}
            <div className="pt-3 flex justify-end">
              <button
                onClick={saveSettings}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
