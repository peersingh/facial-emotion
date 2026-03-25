import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Camera, UploadCloud, ImageIcon, RefreshCw, AlertCircle, Zap, Coffee, Mic, Layers, Music, Database, LayoutDashboard, Settings, User, Sun, Moon, Square, Video, Columns, Play } from 'lucide-react';

const EMOJI_MAP = { sad: '😢', angry: '😠', surprise: '😲', fear: '😨', happy: '😊', disgust: '🤢', neutral: '😐' };
const INSIGHT_MAP = { angry: 'Frustrated', sad: 'Depressed', happy: 'Joyful', fear: 'Anxious', surprise: 'Shocked', disgust: 'Disgusted', neutral: 'Calm' };

export default function App() {
  const [activeMode, setActiveMode] = useState('live');
  const [theme, setTheme] = useState('dark');

  // LIVE MODE
  const webcamRef = useRef(null);
  const ws = useRef(null);
  const isProcessingFrame = useRef(false);
  const [emotion, setEmotion] = useState('neutral');
  const [insight, setInsight] = useState('Initializing...');
  const [confidence, setConfidence] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // IMAGE MODE
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [isFaceCameraActive, setIsFaceCameraActive] = useState(false);
  const faceWebcamRef = useRef(null);

  // VOICE MODE
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioResult, setAudioResult] = useState(null);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const pcmBuffersRef = useRef([]);
  const mediaStreamRef = useRef(null);

  // FUSION MODE
  const [fusionImage, setFusionImage] = useState(null);
  const [fusionImagePreview, setFusionImagePreview] = useState(null);
  const [fusionAudio, setFusionAudio] = useState(null);
  const [fusionResult, setFusionResult] = useState(null);
  const [isFusionUploading, setIsFusionUploading] = useState(false);
  const [fusionError, setFusionError] = useState(null);

  // ANALYTICS MODE
  const [sessionsList, setSessionsList] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionGraphData, setSessionGraphData] = useState([]);

  // --- THEME ---
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // --- HOOKS ---
  useEffect(() => {
    if (activeMode === 'analytics') {
      fetch('http://127.0.0.1:8080/api/v1/analytics/sessions')
        .then(res => res.json())
        .then(data => setSessionsList(data.sessions || []))
        .catch(err => console.error(err));
    }
  }, [activeMode]);

  const fetchSession = async (id) => {
    setSelectedSession(id);
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/v1/analytics/sessions/${id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          score: d.confidence * 100,
          emotion: d.emotion,
          confidence: d.confidence
        }));
        setSessionGraphData(mapped);
      }
    } catch { console.error("Session load failed"); }
  };

  const connectWebSocket = useCallback(() => {
    ws.current = new WebSocket('ws://127.0.0.1:8080/api/v1/stream');
    ws.current.onopen = () => { setIsConnected(true); setError(null); };
    ws.current.onclose = () => { setIsConnected(false); if (activeMode === 'live') setTimeout(connectWebSocket, 3000); };
    ws.current.onerror = () => setError('WebSocket connection error.');
    ws.current.onmessage = (event) => {
      isProcessingFrame.current = false; // Dynamic Unlock: allow the next frame!
      const data = JSON.parse(event.data);
      if (data.warning) return;
      setEmotion(data.emotion); setInsight(data.insight); setConfidence(data.confidence);
    };
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === 'live') connectWebSocket();
    else if (ws.current) ws.current.close();
    return () => { if (ws.current) ws.current.close(); };
  }, [activeMode, connectWebSocket]);

  useEffect(() => {
    if (activeMode !== 'live') return;
    const interval = setInterval(() => {
      // Synchronized Frame Lock: Only execute inference once the backend acknowledges completion of the prior frame!
      if (ws.current?.readyState === WebSocket.OPEN && webcamRef.current && !isProcessingFrame.current) {
        isProcessingFrame.current = true; // Lock stream
        const imageSrc = webcamRef.current.getScreenshot({ width: 640, height: 480 });
        if (imageSrc) ws.current.send(imageSrc);
        else isProcessingFrame.current = false; // safety fallback
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activeMode]);




  // --- HARDWARE AUGMENTATION API ---
  const captureFacePhoto = () => {
    const imageSrc = faceWebcamRef.current.getScreenshot({ width: 640, height: 480 });
    if (imageSrc) {
      fetch(imageSrc).then(res => res.blob()).then(blob => {
        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
        setIsFaceCameraActive(false);
        processImageFile(file);
      });
    }
  };

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      pcmBuffersRef.current = [];
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        pcmBuffersRef.current.push(new Float32Array(inputData));
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      setIsRecordingVoice(true);
      // Store stream to stop it later
      mediaStreamRef.current = stream;
    } catch (err) {
      setAudioError("Microphone access denied.");
    }
  };

  const stopVoiceRecording = () => {
    if (processorRef.current && isRecordingVoice) {
      processorRef.current.disconnect();
      audioContextRef.current.close();

      const flatBuffer = new Float32Array(pcmBuffersRef.current.reduce((acc, b) => acc + b.length, 0));
      let offset = 0;
      for (let b of pcmBuffersRef.current) { flatBuffer.set(b, offset); offset += b.length; }

      const wavBlob = encodeWAV(flatBuffer, audioContextRef.current.sampleRate);
      const file = new File([wavBlob], "live-recording.wav", { type: "audio/wav" });
      processAudioFile(file);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecordingVoice(false);
    }
  };




  // --- HANDLERS ---
  const processImageFile = async (file) => {
    setImageError(null); setImagePreview(URL.createObjectURL(file)); setSelectedImage(file); setImageResult(null); setIsUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/v1/detect/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) setImageError(data.error); else setImageResult(data);
    } catch { setImageError("Server detached."); } finally { setIsUploading(false); }
  };

  const processAudioFile = async (file) => {
    setAudioError(null); setSelectedAudio(file); setAudioResult(null); setIsAudioUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/v1/detect/audio', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) setAudioError(data.error); else setAudioResult(data);
    } catch { setAudioError("Server detached."); } finally { setIsAudioUploading(false); }
  };

  const handleFusionSubmit = async () => {
    if (!fusionImage && !fusionAudio) return;
    setFusionError(null); setFusionResult(null); setIsFusionUploading(true);
    const formData = new FormData();
    if (fusionImage) formData.append('image', fusionImage);
    if (fusionAudio) formData.append('audio', fusionAudio);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/v1/detect/fusion', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) setFusionError(data.error); else setFusionResult(data);
    } catch { setFusionError("Server detached."); } finally { setIsFusionUploading(false); }
  };

  const clearImage = () => { setSelectedImage(null); setImagePreview(null); setImageResult(null); setImageError(null); setIsFaceCameraActive(false); };
  const clearAudio = () => { setSelectedAudio(null); setAudioResult(null); setAudioError(null); };

  const ResultCard = ({ result, title }) => {
    if (!result) return null;
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col items-center flex-1 w-full min-w-[250px]">
        <p className="text-[11px] uppercase font-black text-slate-500 tracking-widest mb-4">{title}</p>
        <div className="w-20 h-20 rounded-full bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center text-4xl mb-4 shadow-inner mt-2">
          {EMOJI_MAP[result.emotion] || EMOJI_MAP.neutral}
        </div>
        <h3 className="text-3xl font-black capitalize text-[var(--text-title)] mb-4">{result.emotion}</h3>
        <div className="w-full bg-[var(--bg-base)] rounded-lg p-3 border border-[var(--border-color)] flex justify-between items-center">
          <span className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Confidence</span>
          <span className="font-bold text-emerald-500">{(result.confidence * 100).toFixed(1)}%</span>
        </div>
        {result.fusion_mode && (
          <div className="mt-3 w-full bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20 text-center text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
            {result.fusion_mode.replace('_', ' ')}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER ---
  const TITLES = { live: 'Live Intelligence', image: 'Static Face Analysis', voice: 'Acoustic Analytics', fusion: 'Multimodal Fusion Generator', analytics: 'Session Data Vault' };

  const circum = 2 * Math.PI * 60;
  const strokeDashoffset = circum - (confidence * circum);

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-body)] font-sans overflow-hidden selection:bg-indigo-500/30 transition-colors duration-300">

      {/* SIDEBAR DASHBOARD */}
      <aside className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col z-20 shrink-0 shadow-lg">
        <div className="h-20 flex items-center px-6 border-b border-[var(--border-color)] justify-between">
          <div className="flex items-center">
            <Activity className="text-indigo-500 w-6 h-6 mr-3" />
            <h1 className="text-xl font-black text-[var(--text-title)] tracking-wide">MEIP</h1>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-slate-500 transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          <p className="px-3 text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">Core Engines</p>
          {[
            { id: 'live', icon: <Camera size={18} />, label: 'Live Detect' },
            { id: 'image', icon: <ImageIcon size={18} />, label: 'Face Analyzer' },
            { id: 'voice', icon: <Mic size={18} />, label: 'Voice Analytics' },
            { id: 'fusion', icon: <Layers size={18} />, label: 'Multimodal Fusion' },
            { id: 'analytics', icon: <Database size={18} />, label: 'Historical Vault' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveMode(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold transition-all text-sm ${activeMode === item.id ? 'bg-[var(--bg-active)] text-[var(--text-title)] shadow-sm' : 'text-[var(--text-body)] hover:bg-[var(--bg-hover)]'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT VUE */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
        <header className="h-20 flex items-center justify-between px-8 border-b border-[var(--border-color)] bg-[var(--bg-panel)]/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <h2 className="text-2xl font-black text-[var(--text-title)] tracking-tight">{TITLES[activeMode]}</h2>
        </header>

        <div className="flex-1 p-8 space-y-8 max-w-[1400px] mx-auto w-full pb-16">

          {/* === 1. LIVE === */}
          {activeMode === 'live' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-[var(--bg-panel)] border border-[var(--border-color)] p-4 rounded-3xl shadow-xl flex flex-col relative group">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-sm font-bold text-[var(--text-title)]">Neural Vision Array</h3>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
                <div className="flex-1 w-full bg-[var(--bg-frame)] rounded-2xl overflow-hidden relative border-2 border-[var(--border-color)] aspect-video shadow-inner flex items-center justify-center">
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
                    <div className="bg-[var(--bg-base)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-full px-8 py-3 flex items-center gap-4 shadow-2xl">
                      <span className="text-4xl drop-shadow-md">{EMOJI_MAP[emotion] || EMOJI_MAP.neutral}</span>
                      <div className="h-8 w-px bg-[var(--border-color)]"></div>
                      <h2 className="text-2xl font-black text-[var(--text-title)] tracking-widest uppercase">{insight}</h2>
                    </div>
                  </div>
                </div>
              </div>
              <div className="xl:col-span-1 flex flex-col gap-6">
                <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-6 rounded-3xl shadow-lg flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                  <p className="absolute top-6 left-6 text-[10px] uppercase font-black text-slate-400 tracking-widest">Confidence Index</p>
                  <div className="relative w-48 h-48 flex items-center justify-center mt-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-[var(--border-color)]" />
                      <circle cx="96" cy="96" r="60" stroke="currentColor" strokeWidth="12" fill="transparent"
                        strokeDasharray={circum} strokeDashoffset={strokeDashoffset}
                        className="text-indigo-500 transition-all duration-500 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-[var(--text-title)]">{(confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-8 text-center bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-6 py-4 shadow-inner w-full">
                    <h3 className="text-2xl font-black text-[var(--text-title)] capitalize">{emotion} {EMOJI_MAP[emotion]}</h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === 2. IMAGE === */}
          {activeMode === 'image' && (
            <div className="flex flex-col xl:flex-row gap-8 items-start h-full">
              <div className="w-full xl:w-2/3 bg-[var(--bg-panel)] border border-[var(--border-color)] p-6 rounded-3xl shadow-xl relative min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-sm font-bold text-[var(--text-title)]">Image Processing Engine</h3>
                  {imagePreview && <button onClick={clearImage} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-500">Reset Engine</button>}
                </div>

                {!imagePreview && !isFaceCameraActive && (
                  <div className="flex-1 flex flex-col gap-4">
                    <label className="flex-1 border-2 border-dashed border-[var(--border-color)] hover:border-indigo-500/50 bg-[var(--bg-base)] rounded-2xl cursor-pointer flex flex-col items-center justify-center p-8 transition-colors group">
                      <div className="w-20 h-20 rounded-full bg-[var(--bg-panel)] flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform mb-6"><UploadCloud size={40} /></div>
                      <h4 className="text-xl font-bold text-[var(--text-title)] mb-2">Drop Portrait File</h4>
                      <p className="text-[var(--text-body)] text-sm max-w-sm text-center">Scan a pre-existing image file via the DeepFace engine.</p>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => processImageFile(e.target.files[0])} />
                    </label>
                    <button onClick={() => setIsFaceCameraActive(true)} className="py-4 bg-[var(--bg-active)] hover:bg-indigo-500 hover:text-white text-[var(--text-title)] rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors border border-[var(--border-color)]">
                      <Camera size={20} /> Capture Live Portrait
                    </button>
                  </div>
                )}

                {!imagePreview && isFaceCameraActive && (
                  <div className="flex-1 relative rounded-2xl overflow-hidden bg-[var(--bg-frame)] border border-[var(--border-color)] flex items-center justify-center shadow-inner group">
                    <Webcam audio={false} ref={faceWebcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 inset-x-0 flex justify-center gap-4">
                      <button onClick={() => setIsFaceCameraActive(false)} className="px-6 py-3 bg-[var(--bg-base)] text-[var(--text-body)] rounded-full font-bold shadow-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)]">Cancel</button>
                      <button onClick={captureFacePhoto} className="px-8 py-3 bg-indigo-500 text-white rounded-full font-bold shadow-lg border border-indigo-400 hover:scale-105 transition-transform flex items-center gap-2"><Camera size={18} /> Snapshot</button>
                    </div>
                  </div>
                )}

                {imagePreview && (
                  <div className="flex-1 relative rounded-2xl overflow-hidden bg-[var(--bg-frame)] border border-[var(--border-color)] flex items-center justify-center group">
                    <img src={imagePreview} className={`w-full h-full object-cover transition-opacity duration-500 ${isUploading ? 'opacity-30' : 'opacity-100'}`} />
                    {isUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <Activity className="animate-spin text-indigo-500" size={40} />
                        <p className="font-bold tracking-widest uppercase text-xs text-white">Extracting Features...</p>
                      </div>
                    )}
                    {!isUploading && imageResult?.region && (
                      <div className="absolute border-[3px] border-emerald-500/80 shadow-[0_0_20px_rgba(52,211,153,0.3)] rounded-lg"
                        style={{
                          left: `${(imageResult.region.x / (imageResult.img_w || 1)) * 100}%`,
                          top: `${(imageResult.region.y / (imageResult.img_h || 1)) * 100}%`,
                          width: `${(imageResult.region.w / (imageResult.img_w || 1)) * 100}%`,
                          height: `${(imageResult.region.h / (imageResult.img_h || 1)) * 100}%`
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="w-full xl:w-1/3 flex flex-col gap-6">
                {imageError && <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-3xl text-rose-500 text-center font-bold">{imageError}</div>}
                {imageResult && <ResultCard result={imageResult} title="Extracted Emotional Node" />}
                {imageResult && (
                  <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-6 shadow-md">
                    <p className="text-[11px] uppercase font-black text-slate-500 tracking-widest mb-4">Deep Insight</p>
                    <h3 className="text-2xl font-black text-[var(--text-title)]">{INSIGHT_MAP[imageResult.emotion]}</h3>
                    <p className="text-sm text-[var(--text-body)] mt-2">The subject presents sustained neural markers aligning with this state.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === 3. VOICE === */}
          {activeMode === 'voice' && (
            <div className="flex flex-col xl:flex-row gap-8 items-start h-full">
              <div className="w-full xl:w-2/3 bg-[var(--bg-panel)] border border-[var(--border-color)] p-6 rounded-3xl shadow-xl relative min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-sm font-bold text-[var(--text-title)]">Acoustic Processing Engine</h3>
                  {selectedAudio && <button onClick={clearAudio} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-500">Reset Feed</button>}
                </div>

                {!selectedAudio && (
                  <div className="flex-1 flex flex-col gap-4">
                    <label className="flex-1 border-2 border-dashed border-[var(--border-color)] hover:border-pink-500/50 bg-[var(--bg-base)] rounded-2xl cursor-pointer flex flex-col items-center justify-center p-8 transition-colors group">
                      <div className="w-20 h-20 rounded-full bg-[var(--bg-panel)] flex items-center justify-center text-pink-500 shadow-inner group-hover:scale-110 transition-transform mb-6"><UploadCloud size={40} /></div>
                      <h4 className="text-xl font-bold text-[var(--text-title)] mb-2">Drop Audio Payload</h4>
                      <p className="text-[var(--text-body)] text-sm">WAV or MP3 format supported.</p>
                      <input type="file" className="hidden" accept="audio/*" onChange={(e) => processAudioFile(e.target.files[0])} />
                    </label>
                    {!isRecordingVoice ? (
                      <button onClick={startVoiceRecording} className="py-4 bg-[var(--bg-active)] text-[var(--text-title)] rounded-2xl flex items-center justify-center gap-2 font-black tracking-widest border border-[var(--border-color)] uppercase hover:bg-pink-500 hover:text-white transition-colors">
                        <Mic size={20} /> Record Live Audio
                      </button>
                    ) : (
                      <div className="py-6 bg-rose-500/10 border border-rose-500/50 rounded-2xl flex flex-col items-center justify-center gap-4 animate-pulse">
                        <h3 className="text-lg font-black text-rose-500 tracking-widest">LISTENING TO MICROPHONE...</h3>
                        <button onClick={stopVoiceRecording} className="p-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center gap-2 pr-6">
                          <Square size={16} fill="currentColor" /> <span className="text-sm font-bold uppercase tracking-widest">Stop & Submit</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedAudio && (
                  <div className="flex-1 border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-base)] rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
                    <Music size={48} className={isAudioUploading ? "text-emerald-500 mb-4 animate-ping" : "text-indigo-500 mb-4"} />
                    <h4 className="text-xl font-black text-[var(--text-title)] mb-2">Audio Secured</h4>
                    <p className="text-[var(--text-body)] font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] px-4 py-1.5 rounded-full text-sm inline-block">{selectedAudio.name}</p>
                    {isAudioUploading && <p className="mt-6 text-xs font-bold tracking-widest text-emerald-500 uppercase animate-pulse">Running Neural Algorithms...</p>}
                  </div>
                )}
              </div>
              <div className="w-full xl:w-1/3 flex flex-col gap-6">
                {audioError && <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-3xl text-rose-500 text-center font-bold">{audioError}</div>}
                {audioResult && <ResultCard result={audioResult} title="Acoustic Sentiment" />}
              </div>
            </div>
          )}

          {/* === 4. FUSION === */}
          {activeMode === 'fusion' && (
            <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto animate-in slide-in-from-bottom">
              {/* FUSION INTERFACE */}
              <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-8 rounded-3xl shadow-xl flex flex-col min-h-[500px]">
                <div className="flex flex-col h-full fade-in">
                  <div className="mb-8 border-b border-[var(--border-color)] pb-4 text-center">
                    <h3 className="text-xl font-black text-[var(--text-title)] flex items-center justify-center gap-2"><Columns className="text-emerald-500" /> Static Decoupled Payloads</h3>
                    <p className="text-xs font-bold text-slate-500 tracking-widest mt-2 uppercase">Provide a separate pre-extracted image and audio file to run them through the Synergistic Matrix</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-1 content-center">
                    <label className="h-72 border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500/50 bg-[var(--bg-base)] rounded-3xl cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={(e) => { setFusionImage(e.target.files[0]); setFusionImagePreview(URL.createObjectURL(e.target.files[0])); }} />
                      {fusionImagePreview ? <img src={fusionImagePreview} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" /> : <ImageIcon size={48} className="text-emerald-500 mb-4" />}
                      <h4 className="text-xl font-bold text-[var(--text-title)] relative z-10">{fusionImage ? 'Image Secured' : 'Select Face Image'}</h4>
                    </label>
                    <label className="h-72 border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500/50 bg-[var(--bg-base)] rounded-3xl cursor-pointer flex flex-col items-center justify-center relative group">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="audio/*" onChange={(e) => setFusionAudio(e.target.files[0])} />
                      <Music size={48} className={fusionAudio ? "text-emerald-500 mb-4" : "text-[var(--border-color)] mb-4"} />
                      <h4 className="text-xl font-bold text-[var(--text-title)] relative z-10">{fusionAudio ? 'Audio Secured' : 'Select Dialogue Audio'}</h4>
                      {fusionAudio && <p className="text-xs bg-[var(--bg-panel)] px-3 py-1 font-bold rounded mt-2 z-10 text-[var(--text-body)] border border-[var(--border-color)] truncate max-w-[80%]">{fusionAudio.name}</p>}
                    </label>
                  </div>
                  <button onClick={handleFusionSubmit} disabled={isFusionUploading || (!fusionImage && !fusionAudio)} className="w-full py-6 rounded-2xl bg-[var(--bg-active)] hover:bg-[var(--text-title)] hover:text-[var(--bg-base)] text-[var(--text-title)] font-black tracking-widest uppercase transition-colors disabled:opacity-50 border border-[var(--border-color)]">
                    {isFusionUploading ? 'Processing Synergy...' : 'Execute Static Matrix Fusion'}
                  </button>
                </div>
              </div>

              {fusionError && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl flex flex-col items-center text-center shadow-lg w-full">
                  <AlertCircle className="text-rose-500 mb-2" size={32} />
                  <p className="text-rose-500 font-bold uppercase tracking-widest">{fusionError}</p>
                </div>
              )}

              {fusionResult && (
                <div className="flex flex-wrap lg:flex-nowrap gap-6 justify-center animate-in slide-in-from-bottom-8">
                  <div className="opacity-70 scale-95 w-full"><ResultCard result={fusionResult.raw_face_average || fusionResult.raw_face} title="Visual Array (Temporal Avg)" /></div>
                  <div className="shadow-2xl z-10 bg-[var(--bg-base)] rounded-3xl rounded-t-lg p-1 w-full max-w-lg scale-105 border-2 border-indigo-500">
                    <ResultCard result={fusionResult.fused_result} title="Absolute Fusion State" />
                  </div>
                  <div className="opacity-70 scale-95 w-full"><ResultCard result={fusionResult.raw_voice} title="Acoustic Vector" /></div>
                </div>
              )}
            </div>
          )}

          {/* === 5. ANALYTICS === */}
          {activeMode === 'analytics' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              <div className="w-full lg:w-1/3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-6 h-[70vh] flex flex-col">
                <h3 className="text-lg font-black text-[var(--text-title)] mb-6 flex items-center gap-2"><Database className="text-indigo-500" /> Vault Directories</h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {sessionsList.map(s => (
                    <button key={s.id} onClick={() => fetchSession(s.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedSession === s.id ? 'bg-[var(--bg-active)] border-indigo-500/50 shadow-inner' : 'bg-[var(--bg-base)] border-transparent hover:border-[var(--border-color)]'}`}>
                      <p className="font-bold text-sm text-[var(--text-title)]">{s.timestamp}</p>
                      <p className="text-[10px] text-[var(--text-body)] mt-1 uppercase tracking-widest">{s.size_kb} KB</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-2/3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-8 h-[70vh] flex flex-col relative">
                {selectedSession ? (
                  <>
                    <div className="absolute top-8 left-8">
                      <h3 className="text-xl font-black text-[var(--text-title)]">Confidence Playback</h3>
                      <p className="text-xs text-slate-500 tracking-widest uppercase">{selectedSession}</p>
                    </div>
                    <div className="w-full h-full mt-16 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sessionGraphData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="time" stroke="var(--text-body)" fontSize={11} tickMargin={12} minTickGap={30} />
                          <YAxis domain={[0, 100]} stroke="var(--text-body)" fontSize={11} tickCount={5} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-title)' }} />
                          <Line type="stepAfter" dataKey="score" stroke="#818cf8" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <Database size={48} className="mb-4 opacity-20" />
                    <p>Select a session to instantiate dynamic graph playback.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
