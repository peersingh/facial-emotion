import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Smile, Frown, Zap, Coffee, Maximize, AlertCircle, Camera, UploadCloud, ImageIcon, RefreshCw } from 'lucide-react';

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
  const [activeMode, setActiveMode] = useState('live'); // 'live' | 'image'
  
  // LIVE MODE STATE
  const webcamRef = useRef(null);
  const ws = useRef(null);
  const [emotion, setEmotion] = useState('neutral');
  const [insight, setInsight] = useState('Initializing...');
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // IMAGE MODE STATE
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

  // --- LIVE MODE LOGIC ---
  const connectWebSocket = useCallback(() => {
    ws.current = new WebSocket('ws://127.0.0.1:8080/stream');
    
    ws.current.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    ws.current.onclose = () => {
      setIsConnected(false);
      if (activeMode === 'live') {
        setTimeout(connectWebSocket, 3000);
      }
    };

    ws.current.onerror = (err) => {
      setError('WebSocket connection error. Backend not reachable.');
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.warning) return;
      
      setEmotion(data.emotion);
      setInsight(data.insight);
      setConfidence(data.confidence);
      
      setHistory(prev => {
        const score = SCORE_MAP[data.emotion] || 50;
        const newHistory = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }), 
          score: score,
          emotion: data.emotion
        }];
        return newHistory.slice(-20);
      });
    };
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === 'live') {
      connectWebSocket();
    } else {
      if (ws.current) ws.current.close();
    }
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [activeMode, connectWebSocket]);

  useEffect(() => {
    if (activeMode !== 'live') return;
    
    const interval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN && webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot({width: 640, height: 480});
        if (imageSrc) {
          try {
            ws.current.send(imageSrc);
          } catch (e) {
            console.error("Frame sending error:", e);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeMode]);

  // --- IMAGE MODE LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageError(null);
    setImagePreview(URL.createObjectURL(file));
    setSelectedImage(file);
    setImageResult(null);
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://127.0.0.1:8080/detect-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.error) {
        setImageError(data.error);
      } else {
        setImageResult(data);
      }
    } catch (err) {
      setImageError("Failed to reach the backend server.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageResult(null);
    setImageError(null);
  };

  // --- RENDERERS ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-400 w-8 h-8" />
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            MEIP
          </h1>
        </div>
        {activeMode === 'live' && (
          <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
            {error && <span className="text-red-400 text-sm flex items-center gap-1"><AlertCircle size={16}/> {error}</span>}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium tracking-wide uppercase">Stream</span>
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
            </div>
          </div>
        )}
      </header>

      {/* Dynamic Mode Switcher */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-10">
        <div className="flex bg-slate-900/50 p-1.5 rounded-3xl border border-white/5 backdrop-blur-sm">
          <button 
            onClick={() => setActiveMode('live')} 
            className={`flex-1 py-3 px-6 rounded-[20px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeMode === 'live' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            <Camera size={20} /> Live Intelligence
          </button>
          <button 
            onClick={() => setActiveMode('image')} 
            className={`flex-1 py-3 px-6 rounded-[20px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeMode === 'image' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            <ImageIcon size={20} /> Static Analysis
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {activeMode === 'live' ? (
          <>
            {/* Left Column: Camera Feed */}
            <section className="col-span-1 lg:col-span-2 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl relative aspect-video flex items-center justify-center group ring-1 ring-white/5">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                />
                
                {/* Overlay Insight */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-95 transition-opacity">
                  <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:px-8 md:py-6 shadow-2xl">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em] mb-1 opacity-80">Emotional Insight</p>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
                      {insight}
                    </h2>
                  </div>
                  <div className="text-6xl md:text-7xl drop-shadow-2xl animate-bounce">
                    {EMOJI_MAP[emotion] || EMOJI_MAP.neutral}
                  </div>
                </div>
              </div>
              
              {/* Timeline Chart */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-72 hidden md:block shadow-xl">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Maximize size={16} className="text-indigo-400" />
                  Temporal Trajectory
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickMargin={10} />
                    <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={11} tickCount={5} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="url(#colorGradient)" 
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: '#c084fc', strokeWidth: 2, stroke: '#fff' }}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Right Column: Live Metrics */}
            <section className="space-y-6 animate-in slide-in-from-right-8 duration-500 delay-100">
              <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent border border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-5 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 blur-3xl rounded-full" />
                 
                 <div className="w-28 h-28 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-6xl shadow-inner border border-white/10 z-10 relative">
                   {EMOJI_MAP[emotion] || EMOJI_MAP.neutral}
                 </div>
                 <div className="z-10">
                   <p className="text-xs text-indigo-300 font-bold uppercase tracking-[0.2em]">Detected Emotion</p>
                   <h3 className="text-4xl font-black capitalize mt-2 tracking-tight">{emotion}</h3>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-lg hover:bg-slate-800/80 transition-colors cursor-default">
                  <Zap className="text-emerald-400 mb-4" size={26} />
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Confidence</p>
                  <p className="text-3xl font-black mt-1 text-white">{(confidence * 100).toFixed(0)}<span className="text-xl text-slate-500">%</span></p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-lg hover:bg-slate-800/80 transition-colors cursor-default">
                  <Coffee className="text-amber-400 mb-4" size={26} />
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Session</p>
                  <p className="text-3xl font-black mt-1 text-white">Active</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* IMAGE MODE OVEVIEW */}
            <section className="col-span-1 lg:col-span-3 min-h-[60vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
              
              {!imagePreview ? (
                <label className="w-full max-w-3xl h-96 rounded-[2rem] border-2 border-dashed border-slate-700 hover:border-purple-500/50 bg-slate-900/40 backdrop-blur-md hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-purple-400 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <UploadCloud size={48} />
                  </div>
                  <div className="text-center space-y-2 relative z-10">
                    <h3 className="text-2xl font-bold text-white">Upload a Portrait</h3>
                    <p className="text-slate-400 max-w-md mx-auto">Drop a high-quality JPG or PNG of a human face to extract profound emotional insights via DeepFace analysis.</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              ) : (
                <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Input Image */}
                  <div className="relative group">
                     <div className="rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black aspect-square flex items-center justify-center relative">
                        <img src={imagePreview} alt="Preview" className={`w-full h-full object-cover transition-all duration-700 ${isUploading ? 'opacity-40 grayscale blur-sm' : 'opacity-100'}`} />
                        {isUploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                            <Activity className="animate-spin text-purple-400" size={48} />
                            <p className="font-bold tracking-widest uppercase text-sm animate-pulse">Analyzing Neural Map...</p>
                          </div>
                        )}
                        {/* Render Face Bounding Box if detected */}
                        {!isUploading && imageResult?.region && (
                           <div 
                             className="absolute border-4 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] rounded-lg transition-all duration-1000 ease-out"
                             style={{
                               left: `${(imageResult.region.x / imageResult.region.w) * 100}%`,
                             }}
                           />
                        )}
                        
                        {/* Overlay Insight matching Phase 2 */}
                        {!isUploading && imageResult && !imageError && (
                           <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-95 animate-in slide-in-from-bottom-8 duration-700">
                             <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:px-6 shadow-2xl">
                               <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em] mb-1 opacity-80">Extracted Insight</p>
                               <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                                 {INSIGHT_MAP[imageResult.emotion] || imageResult.emotion}
                               </h2>
                             </div>
                             <div className="hidden sm:block text-5xl md:text-6xl drop-shadow-2xl animate-bounce">
                               {EMOJI_MAP[imageResult.emotion] || EMOJI_MAP.neutral}
                             </div>
                           </div>
                        )}
                     </div>
                     <button onClick={clearImage} className="absolute -bottom-4 right-8 bg-slate-800 hover:bg-slate-700 text-white rounded-full px-6 py-2.5 shadow-xl border border-white/10 flex items-center gap-2 font-bold transition-transform hover:scale-105 uppercase text-xs tracking-widest z-20">
                       <RefreshCw size={14} /> Analyze Another
                     </button>
                  </div>
                  
                  {/* Right: Results */}
                  <div className="flex flex-col justify-center gap-6">
                     {imageError ? (
                       <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center text-rose-400">
                         <AlertCircle size={48} className="mx-auto mb-4" />
                         <h3 className="text-xl font-bold">{imageError}</h3>
                       </div>
                     ) : imageResult ? (
                       <div className="space-y-6">
                         <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Extraction Complete</p>
                            
                            <div className="flex items-end gap-6 mb-8">
                               <div className="w-24 h-24 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-5xl shadow-inner relative z-10 backdrop-blur-md">
                                 {EMOJI_MAP[imageResult.emotion] || EMOJI_MAP.neutral}
                               </div>
                               <div className="relative z-10 mb-2">
                                 <h2 className="text-5xl font-black capitalize tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                   {imageResult.emotion}
                                 </h2>
                               </div>
                            </div>
                            
                            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 relative z-10">
                               <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Calculated Confidence</span>
                                 <span className="font-bold text-emerald-400">{(imageResult.confidence * 100).toFixed(1)}%</span>
                               </div>
                               <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-400 transition-all duration-1000 ease-out" style={{width: `${imageResult.confidence * 100}%`}} />
                               </div>
                            </div>
                         </div>
                       </div>
                     ) : (
                       <div className="h-full border border-dashed border-white/10 rounded-[2rem] flex items-center justify-center text-slate-500 p-8 text-center bg-slate-900/20">
                         Select an image to render artificial intelligence telemetry.
                       </div>
                     )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
