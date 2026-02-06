import { useState, useEffect, useRef } from 'react';
import { X, Copy, Eye, EyeOff, Radio, Settings, MessageCircle, Mic, Video, VideoOff, MicOff, Share2, Activity, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Event, generateStreamKeys } from '../utils/supabase/api';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StreamManagerProps {
  event: Event;
  onClose: () => void;
  onUpdateStatus: (isLive: boolean) => void;
}

export function StreamManager({ event, onClose, onUpdateStatus }: StreamManagerProps) {
  const [isLive, setIsLive] = useState(event.streaming?.isLive || false);
  const [showKey, setShowKey] = useState(false);
  const [streamMethod, setStreamMethod] = useState<'obs' | 'webcam'>('webcam');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [streamHealth, setStreamHealth] = useState<'good' | 'poor' | 'offline'>(isLive ? 'good' : 'offline');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stream Credentials State
  const [streamKey, setStreamKey] = useState(event.streaming?.stream_key || '');
  const [rtmpUrl, setRtmpUrl] = useState(event.streaming?.ingest_url || "rtmp://global-live.mux.com:5222/app");

  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch/Generate keys on mount if missing
  useEffect(() => {
    const fetchKeys = async () => {
      if (!event.streaming?.stream_key) {
        try {
          const keys = await generateStreamKeys(event.id);
          setStreamKey(keys.streamKey);
          setRtmpUrl(keys.ingestUrl);
        } catch (error) {
          console.error('Failed to generate stream keys', error);
          // Fallback mock
          setStreamKey(`live_${event.id}_${Math.random().toString(36).substr(2, 9)}`);
        }
      }
    };
    fetchKeys();
  }, [event.id, event.streaming?.stream_key]);

  useEffect(() => {
    if (streamMethod === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => stopWebcam();
  }, [streamMethod]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (error) {
      console.error("Error accessing webcam:", error);
      toast.error("Could not access camera/microphone");
      setStreamMethod('obs'); // Fallback to OBS instructions
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleLive = () => {
    const newState = !isLive;
    setIsLive(newState);
    setStreamHealth(newState ? 'good' : 'offline');
    onUpdateStatus(newState);
    
    if (newState) {
      toast.success("You are now LIVE! 🔴", {
        description: "Your followers have been notified."
      });
    } else {
      toast.info("Stream ended", {
        description: "The broadcast has stopped."
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row overflow-hidden">
      {/* LEFT COLUMN: Preview & Controls */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-white font-bold text-lg">{event.title}</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span className="text-white/80 text-xs uppercase tracking-wider">{isLive ? 'LIVE' : 'OFFLINE'}</span>
                {isLive && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded ml-2 border border-red-500/30">
                    {formatTime(elapsedTime)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
              <Eye className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm font-medium">{isLive ? (event.streaming?.liveViewers || 0).toLocaleString() : 0}</span>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors shadow-lg shadow-purple-900/20">
              Share Stream
            </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
          {streamMethod === 'webcam' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover ${!cameraEnabled ? 'hidden' : ''}`}
            />
          ) : (
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto mb-6 border border-purple-500/30 animate-pulse">
                <Wifi className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Connect via OBS</h3>
              <p className="text-gray-400 mb-6">Use the stream key settings to connect your broadcasting software.</p>
              <div className="flex flex-col gap-2 text-sm text-gray-500">
                <p>Status: <span className="text-yellow-500">Waiting for signal...</span></p>
                <p>Bitrate: 0 kbps</p>
              </div>
            </div>
          )}
          
          {!cameraEnabled && streamMethod === 'webcam' && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
               <div className="flex flex-col items-center text-gray-500">
                 <VideoOff className="w-12 h-12 mb-3" />
                 <p>Camera is off</p>
               </div>
             </div>
          )}

          {/* Bottom Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
              
              {streamMethod === 'webcam' && (
                <>
                  <button 
                    onClick={toggleMic}
                    className={`p-4 rounded-full transition-all ${micEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                  >
                    {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                  
                  <button 
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-all ${cameraEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                  >
                    {cameraEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                </>
              )}

              <button 
                onClick={toggleLive}
                className={`px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-all transform hover:scale-105 flex items-center gap-2 min-w-[180px] justify-center ${
                  isLive 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <Radio className="w-5 h-5" />
                {isLive ? 'END STREAM' : 'GO LIVE'}
              </button>
              
              <button 
                onClick={() => setStreamMethod(prev => prev === 'obs' ? 'webcam' : 'obs')}
                className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all"
                title={streamMethod === 'obs' ? "Switch to Webcam" : "Switch to OBS"}
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Settings & Chat */}
      <div className="w-full md:w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
        
        {/* Stream Settings Panel */}
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            Stream Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold mb-1.5 block">Stream URL</label>
              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-gray-800">
                <input 
                  type="text" 
                  value={rtmpUrl} 
                  readOnly 
                  className="bg-transparent text-gray-300 text-sm flex-1 outline-none font-mono"
                />
                <button onClick={() => handleCopy(rtmpUrl, "Stream URL")} className="text-gray-500 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold mb-1.5 block">Stream Key</label>
              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-gray-800">
                <input 
                  type={showKey ? "text" : "password"} 
                  value={streamKey} 
                  readOnly 
                  className="bg-transparent text-gray-300 text-sm flex-1 outline-none font-mono"
                />
                <button onClick={() => setShowKey(!showKey)} className="text-gray-500 hover:text-white transition-colors">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => handleCopy(streamKey, "Stream Key")} className="text-gray-500 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-yellow-600/80 mt-1.5">
                ⚠️ Never share your stream key with anyone.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-800 bg-gray-900/50">
            <h3 className="text-white font-bold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              Live Chat
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mock Chat Messages */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-bold">JD</div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">John Doe • 2m ago</p>
                <p className="text-gray-200 text-sm">Can't wait for this to start! 🔥</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs text-white font-bold">SA</div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Sarah A. • 1m ago</p>
                <p className="text-gray-200 text-sm">Is the audio working? I can hear background noise.</p>
              </div>
            </div>

             <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs text-white font-bold">MK</div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Mike K. • Just now</p>
                <p className="text-gray-200 text-sm">Lets goooo! 🚀🚀</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-900 border-t border-gray-800">
             <input 
               type="text" 
               placeholder="Send a message as host..." 
               className="w-full bg-black/30 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
             />
          </div>
        </div>
      </div>
    </div>
  );
}
