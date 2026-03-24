import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Camera, UploadCloud, ImageIcon, RefreshCw, AlertCircle, Maximize, Zap, Coffee, Mic, Layers, Music, Database } from 'lucide-react';

const EMOJI_MAP = {
  sad: '😢',
  angry: '😠',
  surprise: '😲',
  fear: '😨',
  happy: '😊',
  disgust: '🤢',
  neutral: '😐',
};

const SCORE_MAP = {
  happy: 100,
  surprise: 80,
  neutral: 50,
  fear: 30,
  sad: 20,
  angry: 10,
  disgust: 0,
};

const INSIGHT_MAP = {
  angry: 'Frustrated',
  sad: 'Depressed',
  happy: 'Joyful',
  fear: 'Anxious',
  surprise: 'Shocked',
  disgust: 'Disgusted',
  neutral: 'Calm',
};

export default function App() {
  const [activeMode, setActiveMode] = useState('live'); // 'live' | 'image' | 'voice' | 'fusion'
  
  // LIVE MODE
  const webcamRef = useRef(null);
  const ws = useRef(null);
  const [emotion, setEmotion] = useState('neutral');
  const [insight, setInsight] = useState('Initializing...');
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // IMAGE MODE
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

  // VOICE MODE
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioResult, setAudioResult] = useState(null);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState(null);

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
            time: new Date(d.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
            score: SCORE_MAP[d.emotion] || 50,
            emotion: d.emotion,
            confidence: d.confidence
        }));
        setSessionGraphData(mapped);
      }
    } catch { console.error("Session load failed"); }
  };

  // --- LIVE SOCKET ---
  const connectWebSocket = useCallback(() => {
    ws.current = new WebSocket('ws://127.0.0.1:8080/api/v1/stream');
    ws.current.onopen = () => { setIsConnected(true); setError(null); };
    ws.current.onclose = () => { setIsConnected(false); if (activeMode === 'live') setTimeout(connectWebSocket, 3000); };
    ws.current.onerror = () => setError('WebSocket connection error.');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.warning) return;
      
      setEmotion(data.emotion);
      setInsight(data.insight);
      setConfidence(data.confidence);
      
      setHistory(prev => {
        const score = SCORE_MAP[data.emotion] || 50;
        const newHistory = [...prev, { time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }), score: score }];
        return newHistory.slice(-20);
      });
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
      if (ws.current?.readyState === WebSocket.OPEN && webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot({width: 640, height: 480});
        if (imageSrc) ws.current.send(imageSrc);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeMode]);

  // --- HANDLERS ---
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null); setImagePreview(URL.createObjectURL(file)); setSelectedImage(file); setImageResult(null); setIsUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/v1/detect/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) setImageError(data.error); else setImageResult(data);
    } catch { setImageError("Server detached."); } finally { setIsUploading(false); }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const ResultCard = ({ result, title }) => {
    if (!result) return null;
    return (
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center">
        <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-4">{title}</p>
        <div className="w-20 h-20 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-4xl mb-4">
          {EMOJI_MAP[result.emotion] || EMOJI_MAP.neutral}
        </div>
        <h3 className="text-3xl font-black capitalize bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">{result.emotion}</h3>
        <div className="w-full bg-black/40 rounded-xl p-3 border border-white/5 flex justify-between items-center">
          <span className="text-xs text-slate-400 uppercase tracking-widest">Confidence</span>
          <span className="font-bold text-emerald-400">{(result.confidence * 100).toFixed(1)}%</span>
        </div>
        {result.fusion_mode && (
          <div className="mt-3 w-full bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20 text-center text-xs text-indigo-300 font-bold uppercase tracking-widest">
            Mode: {result.fusion_mode.replace('_', ' ')}
          </div>
        )}
      </div>
    );
  }

  // --- RENDERS ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-400 w-8 h-8" />
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">MEIP</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 pt-10">
        <div className="flex bg-slate-900/50 p-1.5 rounded-3xl border border-white/5 flex-wrap md:flex-nowrap">
          <button onClick={() => setActiveMode('live')} className={`flex-1 py-3 px-2 md:px-6 rounded-[20px] font-bold transition-all flex items-center justify-center gap-2 ${activeMode === 'live' ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}><Camera size={18}/> Live</button>
          <button onClick={() => setActiveMode('image')} className={`flex-1 py-3 px-2 md:px-6 rounded-[20px] font-bold transition-all flex items-center justify-center gap-2 ${activeMode === 'image' ? 'bg-purple-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}><ImageIcon size={18}/> Face</button>
          <button onClick={() => setActiveMode('voice')} className={`flex-1 py-3 px-2 md:px-6 rounded-[20px] font-bold transition-all flex items-center justify-center gap-2 ${activeMode === 'voice' ? 'bg-pink-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}><Mic size={18}/> Voice</button>
          <button onClick={() => setActiveMode('fusion')} className={`flex-1 py-3 px-2 md:px-6 rounded-[20px] font-bold transition-all flex items-center justify-center gap-2 ${activeMode === 'fusion' ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}><Layers size={18}/> Fusion</button>
          <button onClick={() => setActiveMode('analytics')} className={`flex-1 py-3 px-2 md:px-6 rounded-[20px] font-bold transition-all flex items-center justify-center gap-2 ${activeMode === 'analytics' ? 'bg-slate-700 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}><Database size={18}/> Logs</button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LIVE MODE */}
        {activeMode === 'live' && (
          <>
            <section className="col-span-1 lg:col-span-2 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="rounded-3xl overflow-hidden border border-white/10 bg-black aspect-video relative group">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                    <h2 className="text-4xl font-black text-white">{insight}</h2>
                  </div>
                  <div className="text-6xl drop-shadow-2xl animate-bounce">{EMOJI_MAP[emotion]}</div>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 h-64 hidden md:block">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <YAxis domain={[0, 100]} hide /><Line type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={4} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="space-y-6">
               <ResultCard result={{emotion, confidence}} title="Facial Telemetry" />
            </section>
          </>
        )}

        {/* IMAGE MODE */}
        {activeMode === 'image' && (
          <section className="col-span-1 lg:col-span-3 min-h-[50vh] flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 w-full bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-3xl p-10 text-center relative overflow-hidden group">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleImageUpload} />
               {imagePreview ? <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-30" /> : <UploadCloud size={64} className="mx-auto text-purple-400 mb-6" />}
               <h3 className="text-2xl font-bold relative z-10">{isUploading ? "Processing..." : "Drop Face Portrait Here"}</h3>
            </div>
            {imageResult && <div className="flex-1 w-full"><ResultCard result={imageResult} title="Face Extraction" /></div>}
            {imageError && <div className="flex-1 text-rose-500 text-center">{imageError}</div>}
          </section>
        )}

        {/* VOICE MODE */}
        {activeMode === 'voice' && (
          <section className="col-span-1 lg:col-span-3 min-h-[50vh] flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 w-full bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-3xl p-10 text-center relative overflow-hidden group">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="audio/*" onChange={handleAudioUpload} />
               <Music size={64} className="mx-auto text-pink-400 mb-6" />
               <h3 className="text-2xl font-bold relative z-10">{isAudioUploading ? "Analyzing Acoustics..." : "Drop Audio (.wav/.mp3)"}</h3>
               {selectedAudio && <p className="text-slate-400 mt-2 relative z-10">{selectedAudio.name}</p>}
            </div>
            {audioResult && <div className="flex-1 w-full"><ResultCard result={audioResult} title="Acoustic Voice Extraction" /></div>}
            {audioError && <div className="flex-1 text-rose-500 text-center">{audioError}</div>}
          </section>
        )}

        {/* FUSION MODE */}
        {activeMode === 'fusion' && (
          <section className="col-span-1 lg:col-span-3 min-h-[60vh] flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <div className="bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-3xl p-8 text-center relative">
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={(e) => { setFusionImage(e.target.files[0]); setFusionImagePreview(URL.createObjectURL(e.target.files[0])); }} />
                   {fusionImagePreview ? <img src={fusionImagePreview} className="absolute inset-0 w-full h-full object-cover opacity-30 rounded-3xl" /> : <ImageIcon size={48} className="mx-auto text-purple-400 mb-4" />}
                   <h3 className="text-xl font-bold relative z-10">Select Face Image</h3>
                </div>
                <div className="bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-3xl p-8 text-center relative">
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="audio/*" onChange={(e) => setFusionAudio(e.target.files[0])} />
                   <Music size={48} className="mx-auto text-pink-400 mb-4" />
                   <h3 className="text-xl font-bold relative z-10">Select Voice Audio</h3>
                   {fusionAudio && <p className="text-slate-400 mt-2">{fusionAudio.name}</p>}
                </div>
            </div>
            <button 
              onClick={handleFusionSubmit} 
              disabled={isFusionUploading || (!fusionImage && !fusionAudio)}
              className="w-full max-w-sm mx-auto p-4 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold tracking-widest uppercase hover:scale-105 transition-transform disabled:opacity-50"
            >
              {isFusionUploading ? "Fusing Modalities..." : "Execute Multimodal Fusion"}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 w-full">
               {fusionResult?.raw_face && <div className="opacity-80"><ResultCard result={fusionResult.raw_face} title="Raw Face Vector" /></div>}
               {fusionResult?.fused_result && <div className="scale-105 z-10 shadow-2xl"><ResultCard result={fusionResult.fused_result} title="Final Fusion State" /></div>}
               {fusionResult?.raw_voice && <div className="opacity-80"><ResultCard result={fusionResult.raw_voice} title="Raw Audio Vector" /></div>}
            </div>
            {fusionError && <div className="text-rose-500 text-center">{fusionError}</div>}
          </section>
        )}

        {/* ANALYTICS MODE */}
        {activeMode === 'analytics' && (
          <section className="col-span-1 lg:col-span-3 min-h-[60vh] flex flex-col lg:flex-row gap-8">
             <div className="w-full lg:w-1/3 bg-slate-900/60 border border-white/5 rounded-3xl p-6 h-[600px] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Database className="text-indigo-400"/> Session Vault</h3>
                <div className="space-y-3">
                  {sessionsList.length === 0 ? <p className="text-slate-500 text-sm">No sessions recorded yet.</p> : sessionsList.map(s => (
                     <button key={s.id} onClick={() => fetchSession(s.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedSession === s.id ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                         <p className="font-bold text-sm text-slate-200">{s.timestamp}</p>
                         <p className="text-xs text-slate-500 mt-1">{s.size_kb} KB tracking footprint</p>
                     </button>
                  ))}
                </div>
             </div>
             <div className="w-full lg:w-2/3 bg-slate-900/40 border border-white/5 rounded-3xl p-6 h-[600px] flex flex-col">
                {selectedSession ? (
                   <>
                     <h3 className="text-xl font-bold mb-6 text-slate-300">Session Telemetry</h3>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sessionGraphData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickMargin={10} minTickGap={30} />
                            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={11} tickCount={5} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />
                            <Line type="stepAfter" dataKey="score" stroke="#818cf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#c084fc', strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                     </div>
                   </>
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                      <Database size={48} className="opacity-20" />
                      Select a session from the vault to render the temporal blueprint.
                   </div>
                )}
             </div>
          </section>
        )}

      </main>
    </div>
  );
}
