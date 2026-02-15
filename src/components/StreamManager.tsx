import { useState, useEffect, useRef } from 'react';
import { X, Copy, Eye, EyeOff, Radio, Settings, MessageCircle, Mic, Video, VideoOff, MicOff, Share2, Activity, CreditCard, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Event, getStreamMessages, sendStreamMessage, subscribeToStreamMessages, StreamMessage, updateEventStreamingStatus } from '../utils/supabase/api';
import { ImageWithFallback } from './figma/ImageWithFallback';
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../utils/agora';

interface StreamManagerProps {
  event: Event;
  onClose: () => void;
  onUpdateStatus: (isLive: boolean) => void;
}

export function StreamManager({ event, onClose, onUpdateStatus }: StreamManagerProps) {
  const [isLive, setIsLive] = useState(event.streaming?.isLive || false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [streamHealth, setStreamHealth] = useState<'good' | 'poor' | 'offline'>(isLive ? 'good' : 'offline');
  
  // Chat State
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Agora State
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const client = useRef(AgoraRTC.createClient({ mode: 'live', codec: 'vp8' }));
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Streaming method and legacy RTMP settings (for OBS mode UI)
  const [streamMethod, setStreamMethod] = useState<'webcam' | 'obs'>('webcam');
  const [rtmpUrl, setRtmpUrl] = useState<string>(event.streaming?.ingest_url || '');
  const [streamKey, setStreamKey] = useState<string>(event.streaming?.stream_key || '');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'chat' | 'monetization' | 'analytics'>('settings');
  const [streamTitle, setStreamTitle] = useState<string>(event.title || '');
  const [streamCategory, setStreamCategory] = useState<string>('General');
  const [visibility, setVisibility] = useState<'public' | 'ticket' | 'followers'>('public');
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const settingsOverlayRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsDocked, setIsSettingsDocked] = useState(false);
  const noMirrorObserverRef = useRef<MutationObserver | null>(null);
  const [isMirrored, setIsMirrored] = useState(false);
  const isMirroredRef = useRef(false);

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

  // Initialize Agora Local Tracks (Webcam/Mic)
  useEffect(() => {
    let mounted = true;

    const initLocalTracks = async () => {
      try {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        if (!mounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        videoTrack.play('local-player');

        const applyMirror = () => {
          const container = document.getElementById('local-player');
          if (!container) return;
          const value = isMirroredRef.current ? 'scaleX(-1)' : 'none';
          (container as HTMLElement).style.setProperty('transform', value, 'important');
        };

        applyMirror();
        const container = document.getElementById('local-player');
        if (container) {
          const obs = new MutationObserver(() => applyMirror());
          obs.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
          noMirrorObserverRef.current = obs;
        }

        setCameraEnabled(true);
        setMicEnabled(true);
      } catch (error) {
        console.error("Error accessing webcam/mic:", error);
        toast.error("Could not access camera/microphone");
      }
    };

    initLocalTracks();

    return () => {
      mounted = false;
      localAudioTrack?.close();
      localVideoTrack?.close();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    isMirroredRef.current = isMirrored;
    const container = document.getElementById('local-player');
    if (container) {
      const value = isMirrored ? 'scaleX(-1)' : 'none';
      (container as HTMLElement).style.setProperty('transform', value, 'important');
    }
  }, [isMirrored]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localAudioTrack?.close();
      localVideoTrack?.close();
      if (client.current) {
        client.current.leave();
      }
      if (noMirrorObserverRef.current) {
        noMirrorObserverRef.current.disconnect();
        noMirrorObserverRef.current = null;
      }
    };
  }, []);

  // Handle Camera Toggle
  const toggleCamera = async () => {
    if (localVideoTrack) {
      const newState = !cameraEnabled;
      await localVideoTrack.setEnabled(newState);
      setCameraEnabled(newState);
    }
  };

  const toggleMirror = () => {
    setIsMirrored(prev => !prev);
  };

  // Handle Mic Toggle
  const toggleMic = async () => {
    if (localAudioTrack) {
      const newState = !micEnabled;
      await localAudioTrack.setEnabled(newState);
      setMicEnabled(newState);
    }
  };

  // Load and Subscribe to Chat
  useEffect(() => {
    const loadChat = async () => {
      try {
        const msgs = await getStreamMessages(event.id);
        if (msgs) setMessages(msgs);
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    };
    loadChat();

    const subscription = subscribeToStreamMessages(event.id, (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [event.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendStreamMessage(event.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const toggleLive = async () => {
    const newState = !isLive;
    const channelName = `event-${event.id}`;
    const uid = event.organizer_id; // Use organizer ID as UID (needs to be string or number)

    if (newState) {
      if (countdown === 0) {
        setCountdown(3);
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimeout(async () => {
          try {
            const token = await getAgoraToken(channelName, uid, 'publisher');
            if (!token) {
              toast.error("Failed to start stream: missing Agora token");
              console.error("Agora token retrieval returned null for channel:", channelName, "uid:", uid);
              return;
            }
            await client.current.setClientRole('host');
            await client.current.join(AGORA_APP_ID, channelName, token, uid);
            if (localAudioTrack && localVideoTrack) {
              await client.current.publish([localAudioTrack, localVideoTrack]);
            } else {
              toast.error("Camera/Mic not ready. Check permissions.");
              return;
            }
            await updateEventStreamingStatus(event.id, true);
            setIsLive(true);
            setStreamHealth('good');
            onUpdateStatus(true);
            toast.success("You are now LIVE! 🔴");
          } catch (error: any) {
            console.error("Error starting stream:", error);
            toast.error(`Failed to start stream: ${error.message}`);
          }
        }, 3000);
      }
    } else {
      // Stop Streaming (Leave)
      try {
        await client.current.leave();
        
        // Update DB status
        await updateEventStreamingStatus(event.id, false);
        
        setIsLive(false);
        setStreamHealth('offline');
        onUpdateStatus(false);
        toast.info("Stream ended");
      } catch (error) {
         console.error("Error stopping stream:", error);
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleOverlayScroll = () => {
    if (!settingsOverlayRef.current) return;
    const { scrollTop, clientHeight } = settingsOverlayRef.current;
    const threshold = clientHeight * 0.2;
    const shouldDock = scrollTop > threshold;
    setIsSettingsDocked(prev => (prev !== shouldDock ? shouldDock : prev));
  };

  const openSettingsPanel = () => {
    setActiveTab('settings');
    if (!settingsOverlayRef.current) return;
    const { scrollTop, clientHeight } = settingsOverlayRef.current;
    const threshold = clientHeight * 0.2;
    const targetTop = scrollTop <= threshold ? clientHeight : 0;
    settingsOverlayRef.current.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Fullscreen video layer */}
      <div className="absolute inset-0">
        <div
          id="local-player"
          className={`w-full h-full ${!cameraEnabled ? 'hidden' : ''}`}
        />
        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center text-white/70">
              <VideoOff className="w-12 h-12 mb-3" />
              <span>Camera is off</span>
            </div>
          </div>
        )}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-6xl font-bold">{countdown}</div>
          </div>
        )}
      </div>

      {/* On-top HUD: header + controls */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
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
              <span className="text-white text-sm font-medium">
                {isLive ? (event.streaming?.liveViewers || 0).toLocaleString() : 0}
              </span>
            </div>
            <button
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-900/20 transition-colors"
              title="Share stream"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          className={`absolute bottom-8 left-0 right-0 flex items-center pointer-events-auto transition-all duration-300 ${
            isSettingsDocked ? 'justify-end pr-6' : 'justify-center'
          }`}
        >
          <div
            className={`bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-3 transition-all duration-300 ${
              isSettingsDocked ? 'px-3 py-2' : 'px-4 py-3'
            }`}
          >
            {!isSettingsDocked && (
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full ${
                  micEnabled ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
            )}
            {!isSettingsDocked && (
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-full ${
                  cameraEnabled ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {cameraEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
            )}
            {!isSettingsDocked && (
              <button
                onClick={toggleMirror}
                className={`p-2 rounded-full ${isMirrored ? 'bg-purple-600 text-white' : 'bg-black/30 text-white'}`}
                title="Flip preview"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            <button onClick={openSettingsPanel} className="p-2 rounded-full bg-black/30 text-white">
              <Settings className="w-6 h-6" />
            </button>
            {!isSettingsDocked && (
              <button
                onClick={toggleLive}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'
                }`}
                title={countdown > 0 ? `Going live in ${countdown}` : isLive ? 'End stream' : 'Go live'}
              >
                <Radio className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scroll overlay for settings/chat/monetization panel */}
      <div
        ref={settingsOverlayRef}
        onScroll={handleOverlayScroll}
        className="absolute inset-0 overflow-y-auto pt-[100vh] px-6 pb-6 z-0"
      >
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 px-4 pt-4">
            <button title="Stream Settings" onClick={() => setActiveTab('settings')} className={`p-2 rounded-full ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'}`}>
              <Settings className="w-5 h-5" />
            </button>
            <button title="Chat" onClick={() => setActiveTab('chat')} className={`p-2 rounded-full ${activeTab === 'chat' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'}`}>
              <MessageCircle className="w-5 h-5" />
            </button>
            <button title="Monetization" onClick={() => setActiveTab('monetization')} className={`p-2 rounded-full ${activeTab === 'monetization' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'}`}>
              <CreditCard className="w-5 h-5" />
            </button>
            <button title="Analytics" disabled={!isLive} onClick={() => setActiveTab('analytics')} className={`p-2 rounded-full ${activeTab === 'analytics' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'} ${!isLive ? 'opacity-50' : ''}`}>
              <Activity className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="relative w-64 bg-white/10 rounded-full p-1">
                  <div className={`absolute top-1 bottom-1 w-1/2 bg-purple-600 rounded-full transition-transform ${streamMethod === 'webcam' ? 'translate-x-0' : 'translate-x-full'}`}></div>
                  <div className="relative z-10 flex">
                    <button onClick={() => setStreamMethod('webcam')} className={`w-1/2 py-2 rounded-full ${streamMethod === 'webcam' ? 'text-white' : 'text-white/70'}`}>Webcam</button>
                    <button onClick={() => setStreamMethod('obs')} className={`w-1/2 py-2 rounded-full ${streamMethod === 'obs' ? 'text-white' : 'text-white/70'}`}>OBS / RTMP</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Stream Title</div>
                    <input value={streamTitle} onChange={e => setStreamTitle(e.target.value)} className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Category</div>
                    <select value={streamCategory} onChange={e => setStreamCategory(e.target.value)} className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none">
                      <option>General</option>
                      <option>Music</option>
                      <option>Sports</option>
                      <option>Gaming</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Visibility</div>
                    <select value={visibility} onChange={e => setVisibility(e.target.value as any)} className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none">
                      <option value="public">Public</option>
                      <option value="ticket">Ticket holders only</option>
                      <option value="followers">Followers only</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Monetization</div>
                    <button onClick={() => setMonetizationEnabled(m => !m)} className={`px-3 py-2 rounded-lg ${monetizationEnabled ? 'bg-green-600 text-white' : 'bg-white/10 text-white'}`}>
                      {monetizationEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
                {streamMethod === 'obs' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-white/70 text-xs">Stream URL</div>
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 border border-white/10">
                        <input type="text" value={rtmpUrl} readOnly className="bg-transparent text-gray-300 text-sm flex-1 outline-none font-mono" />
                        <button onClick={() => handleCopy(rtmpUrl, "Stream URL")} className="text-gray-300 hover:text-white">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/70 text-xs">Stream Key</div>
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 border border-white/10">
                        <input type={showKey ? "text" : "password"} value={streamKey} readOnly className="bg-transparent text-gray-300 text-sm flex-1 outline-none font-mono" />
                        <button onClick={() => setShowKey(!showKey)} className="text-gray-300 hover:text-white">
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleCopy(streamKey, "Stream Key")} className="text-gray-300 hover:text-white">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-32 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                  Say hello to your audience
                </div>
                <form onSubmit={handleSendMessage} className="relative">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message as host..." className="w-full bg-white/10 text-white rounded-full py-3 pl-4 pr-12 outline-none" />
                  <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-full text-white disabled:opacity-50">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
            {activeTab === 'monetization' && (
              <div className="text-white/70">Monetization settings coming soon</div>
            )}
            {activeTab === 'analytics' && (
              <div className="text-white/70">Live analytics</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
