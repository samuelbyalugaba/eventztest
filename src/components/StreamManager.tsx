import { useState, useEffect, useRef } from 'react';
import { X, Copy, Eye, EyeOff, Radio, Settings, MessageCircle, Mic, Video, VideoOff, MicOff, Share2, Activity, CreditCard, RotateCcw, Heart, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { type Event, getStreamMessages, sendStreamMessage, subscribeToStreamMessages, StreamMessage, updateEventStreamingStatus, getEventAnalytics, generateStreamKeys, getEventLikes, supabase } from '../utils/supabase/api';
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
  const [likes, setLikes] = useState(0);

  // Network Quality Monitoring
  useEffect(() => {
    if (!client.current) return;
    
    const handleNetworkQuality = (quality: any) => {
        // Agora quality: 0: unknown, 1: excellent, 2: good, 3: poor, 4: bad, 5: vbad, 6: down
        const uplink = quality.uplinkNetworkQuality;
        if (uplink <= 2) setStreamHealth('good');
        else if (uplink <= 4) setStreamHealth('poor');
        else setStreamHealth('offline'); // or 'bad'
    };

    client.current.on('network-quality', handleNetworkQuality);
    return () => {
        client.current?.off('network-quality', handleNetworkQuality);
    };
  }, []);

  // Chat State
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [likesAnimation, setLikesAnimation] = useState<number[]>([]);
  const [showChat, setShowChat] = useState(true);

  // Agora State
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const tracksRef = useRef<{ audio: IMicrophoneAudioTrack | null, video: ICameraVideoTrack | null }>({ audio: null, video: null });
  const client = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Initialize Agora Client Lazy
  if (!client.current) {
    client.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  }

  // Keep tracksRef in sync with state
  useEffect(() => {
    tracksRef.current = { audio: localAudioTrack, video: localVideoTrack };
  }, [localAudioTrack, localVideoTrack]);
  
  // Streaming method and legacy RTMP settings (for OBS mode UI)
  const [streamMethod, setStreamMethod] = useState<'webcam' | 'obs'>('webcam');
  const [rtmpUrl, setRtmpUrl] = useState<string>(event.streaming?.ingest_url || '');
  const [streamKey, setStreamKey] = useState<string>(event.streaming?.stream_key || '');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'chat' | 'monetization' | 'analytics'>('settings');
  const [isSettingsDocked, setIsSettingsDocked] = useState(false);
  const settingsOverlayRef = useRef<HTMLDivElement>(null);

  // Monitor scroll to handle docking and pointer events
  const handleOverlayScroll = () => {
    if (!settingsOverlayRef.current) return;
    const { scrollTop, clientHeight } = settingsOverlayRef.current;
    
    // Logic:
    // Spacer is 100vh.
    // Open position target is scrollTop = 100vh (Spacer scrolled out).
    // Closed position is scrollTop = 0.
    
    // We consider it "Docked/Open" if we are significantly scrolled down.
    // Let's say if we are past 10vh.
    const isOpen = scrollTop > clientHeight * 0.1;
    
    if (isOpen !== isSettingsDocked) {
        setIsSettingsDocked(isOpen);
    }
  };

  const openSettingsPanel = () => {
    if (!settingsOverlayRef.current) return;
    
    // Enable pointer events before scrolling
    setIsSettingsDocked(true);
    
    // We want the panel to snap to its natural position.
    // The panel has `scroll-mt-[40vh]`.
    // The Spacer is 100vh.
    // If we scroll to 100vh, the Panel (snap-start) will try to align.
    // With `scroll-mt-[40vh]`, it will align to 40vh from top.
    // So we target scrolling to the Panel's offset.
    // The Panel starts at 100vh.
    // Let's just scroll "enough" and let Snap take over?
    // Better: Smooth scroll to the exact target.
    // Target: We want Panel top to be at 40vh.
    // ScrollTop = PanelOffset (100vh) - DesiredScreenPosition (40vh) = 60vh.
    // Wait, `scroll-margin` affects SNAP, not absolute coordinates.
    // If we rely on snap, we just scroll to the element.
    // But for smooth programmatic animation, explicit calculation is safer.
    
    const targetScroll = window.innerHeight * 0.6; // Scroll 60vh down. Panel moves up 60vh.
    // Panel starts at 100vh.
    // Panel Top relative to viewport = 100vh - 60vh = 40vh.
    // Correct.
    
    settingsOverlayRef.current.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
    
    setActiveTab('settings');
  };
  const [streamTitle, setStreamTitle] = useState<string>(event.title || '');
  const [streamCategory, setStreamCategory] = useState<string>(event.category || 'General');
  const [visibility, setVisibility] = useState<'public' | 'ticket' | 'followers'>(
    (event.streaming as any)?.visibility || 'public'
  );
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const virtualTicket = event.ticket_tiers?.find((tier) =>
    tier.name.toLowerCase().includes('virtual')
  );
  const virtualPrice =
    (event.streaming as any)?.virtualPrice || virtualTicket?.price || null;
  const virtualAvailable =
    virtualTicket && typeof virtualTicket.available === 'number'
      ? virtualTicket.available
      : null;

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
        const cameras = await AgoraRTC.getCameras();
        if (!mounted) return;

        setAvailableCameras(cameras);
        const initialIndex = 0;
        setCurrentCameraIndex(initialIndex);

        const cameraId = cameras[initialIndex]?.deviceId;

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {},
          cameraId ? { cameraId } : {}
        );
        
        if (!mounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }

        // Update ref immediately to ensure cleanup works even if unmount happens before state update
        tracksRef.current = { audio: audioTrack, video: videoTrack };
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        videoTrack.play('local-player');

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
      // Tracks are cleaned up in the main cleanup effect using tracksRef
    };
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tracksRef.current.audio?.close();
      tracksRef.current.video?.close();
      if (client.current) {
        client.current.leave();
        client.current.removeAllListeners();
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

  const toggleCameraDevice = async () => {
    if (!localVideoTrack) return;
    try {
      const cameras = availableCameras.length
        ? availableCameras
        : await AgoraRTC.getCameras();

      if (cameras.length < 2) {
        toast.error('No secondary camera available');
        return;
      }

      if (!availableCameras.length) {
        setAvailableCameras(cameras);
      }

      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];

      await localVideoTrack.setDevice(nextCamera.deviceId);
      setCurrentCameraIndex(nextIndex);
    } catch (error) {
      console.error('Failed to switch camera device:', error);
      toast.error('Failed to switch camera');
    }
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
    // Only fetch historical messages if they belong to the current active session
    // Since we don't have a "session_id" in messages, we rely on the backend cleaning up old messages when stream ends.
    // However, if the page is refreshed during a stream, we want to see history.
    // If the stream was offline and we just started it, the backend clean-up might have already run (or will run on end).
    // To ensure "session-only" feel, we can just clear local state when isLive toggles to true? 
    // No, isLive toggles true when we click "Go Live".
    
    // Better approach: When mounting, if stream is NOT live, do NOT fetch history.
    // If stream IS live, fetch history (it's the current session).
    
    const loadChat = async () => {
      if (!isLive) {
          setMessages([]);
          return;
      }

      try {
        const msgs = await getStreamMessages(event.id);
        if (msgs) setMessages(msgs);
        
        // Load initial likes
        const initialLikes = await getEventLikes(event.id);
        setLikes(initialLikes);
      } catch (error) {
        console.error('Failed to load chat/likes:', error);
      }
    };
    loadChat();

    const subscription = subscribeToStreamMessages(event.id, (message) => {
      // Only append if we are live or monitoring
      setMessages(prev => [...prev, message]);
    });
    
    // Subscribe to likes (Real-time)
    const likesSubscription = supabase
      .channel(`likes:${event.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_likes',
        filter: `event_id=eq.${event.id}`
      }, (payload) => {
         if (payload.eventType === 'INSERT') {
           setLikes(prev => prev + 1);
           setLikesAnimation(prev => [...prev, Date.now()]);
         }
         if (payload.eventType === 'DELETE') setLikes(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [event.id, isLive]); // Add isLive dependency to re-run when status changes

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup likes animation
  useEffect(() => {
    if (likesAnimation.length === 0) return;
    const timer = setTimeout(() => {
      setLikesAnimation(prev => prev.filter(r => Date.now() - r < 1200));
    }, 1200);
    return () => clearTimeout(timer);
  }, [likesAnimation]);

  useEffect(() => {
    if (activeTab !== 'analytics' || !isLive) return;

    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        setIsLoadingAnalytics(true);
        const data = await getEventAnalytics(event.id);
        if (!cancelled) {
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to load event analytics:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingAnalytics(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [activeTab, isLive, event.id]);

  useEffect(() => {
    if (streamMethod !== 'obs') return;
    let cancelled = false;
    const loadKeys = async () => {
      try {
        const { ingestUrl, streamKey } = await generateStreamKeys(event.id);
        if (!cancelled) {
          setRtmpUrl(ingestUrl || '');
          setStreamKey(streamKey || '');
        }
      } catch (error) {
        console.error('Failed to generate RTMP keys:', error);
        toast.error('Failed to generate RTMP keys');
      }
    };
    loadKeys();
    return () => {
      cancelled = true;
    };
  }, [streamMethod, event.id]);

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

  const handleShare = async () => {
    const shareData = {
      title: streamTitle,
      text: `Watch "${streamTitle}" live on Eventz`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Stream link copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
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
      <div className="absolute inset-0 pointer-events-none z-40">
        <div className="px-4 pt-12 pb-2 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/90 via-black/40 to-transparent">
          
          {/* LEFT: Exit & Basic Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              title="Exit Stream"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <h2 className="text-white font-bold text-sm leading-tight max-w-[120px] truncate drop-shadow-md">
                {streamTitle}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isLive ? 'bg-red-500/20 border border-red-500/50' : 'bg-white/10 border border-white/10'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className={`text-[10px] font-bold tracking-wider ${isLive ? 'text-red-200' : 'text-gray-300'}`}>
                    {isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Operational Intelligence */}
          {isLive && (
            <div className="absolute left-1/2 -translate-x-1/2 top-24 flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg z-50">
              <span className="text-white font-mono text-xs font-medium min-w-[40px] text-center">
                {formatTime(elapsedTime)}
              </span>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-white/70" />
                <span className="text-white text-xs font-medium">
                  {(event.streaming?.liveViewers || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className={`flex items-center gap-1 text-[10px] font-bold ${
                streamHealth === 'good' ? 'text-green-400' : streamHealth === 'poor' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                <Activity className="w-3 h-3" />
                <span>{streamHealth === 'good' ? 'EXCELLENT' : streamHealth === 'poor' ? 'POOR' : 'BAD'}</span>
              </div>
            </div>
          )}

          {/* RIGHT: Earnings & Network */}
          <div className="flex items-center gap-2">
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 px-2 py-1 rounded-lg backdrop-blur-md">
                   <span className="text-yellow-400 font-bold text-xs">{(likes * 10).toLocaleString()}</span>
                   <span className="text-[9px] text-yellow-200/80 font-medium uppercase tracking-wide">TKN</span>
                </div>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10" title="Network Strength">
                <Activity className={`w-4 h-4 ${streamHealth === 'good' ? 'text-green-400' : 'text-yellow-400'}`} />
             </div>
          </div>

        </div>

        <div
        className={`absolute bottom-8 right-4 flex flex-col items-center gap-4 pointer-events-auto transition-all duration-300 ${
          isSettingsDocked ? 'translate-x-20 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <button
          onClick={toggleCameraDevice}
          className={`p-2.5 rounded-full backdrop-blur-md shadow-lg border border-white/10 ${
            currentCameraIndex > 0 ? 'bg-purple-600 text-white' : 'bg-black/40 text-white'
          }`}
          title="Switch camera"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={toggleCamera}
          className={`p-2.5 rounded-full backdrop-blur-md shadow-lg border border-white/10 ${
            cameraEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'
          }`}
        >
          {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleMic}
          className={`p-2.5 rounded-full backdrop-blur-md shadow-lg border border-white/10 ${
            micEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'
          }`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button 
          onClick={openSettingsPanel} 
          className="p-2.5 rounded-full bg-black/40 text-white backdrop-blur-md shadow-lg border border-white/10"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={toggleLive}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-white/10 transition-all active:scale-95 ${
            isLive ? 'bg-white text-red-600' : 'bg-red-600 text-white'
          }`}
          title={countdown > 0 ? `Going live in ${countdown}` : isLive ? 'End stream' : 'Go live'}
        >
          <Radio className={`w-6 h-6 ${isLive ? 'animate-pulse' : ''}`} />
        </button>
      </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="absolute bottom-28 left-4 w-64 max-h-48 overflow-y-auto scrollbar-hide space-y-2 pointer-events-auto z-20">
            {messages.slice(-2).map((m, i) => (
                <div key={i} className="flex items-start gap-2 bg-black/40 backdrop-blur-md rounded-2xl px-2 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] shrink-0">
                        <span>{(m.user?.full_name || (m.user as any)?.username || 'G').charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-white/70 truncate">{m.user?.full_name || (m.user as any)?.username || 'Guest'}</div>
                        <div className="text-[12px] text-white leading-snug break-words">{m.message}</div>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
      )}

      {/* Chat Input Removed */}

      {/* Floating Hearts Animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {likesAnimation.map(r => (
          <div
            key={r}
            className="absolute bottom-24 right-6 animate-[floatUp_1.2s_ease-out_forwards]"
            style={{ animationDelay: '0s' }}
          >
            <span className="text-yellow-400 font-bold text-sm drop-shadow-md">+10 TKN</span>
          </div>
        ))}
      </div>

      {/* Scroll overlay for settings/chat/monetization panel */}
      {/* 
        Senior Dev Implementation:
        - Uses CSS Scroll Snap for robust physics.
        - Container is pointer-events-none by default to allow pass-through.
        - Toggles to pointer-events-auto when "Docked" (scrolled down) to allow swipe interactions.
        - Uses a 100vh Spacer to push content initially off-screen.
      */}
      <div
        ref={settingsOverlayRef}
        onScroll={handleOverlayScroll}
        className={`absolute inset-0 overflow-y-auto z-50 snap-y snap-mandatory scroll-smooth scrollbar-hide ${
            isSettingsDocked ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Snap Point 1: Closed State (Top of Spacer) */}
        <div className="h-[100vh] w-full snap-start pointer-events-none shrink-0" />
        
        {/* Snap Point 2: Open State (Panel) */}
        {/* scroll-mt-[40vh] ensures that when this snaps to start, it leaves 40vh gap at top */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl max-w-xl mx-auto pointer-events-auto min-h-[50vh] mb-[100vh] snap-start scroll-mt-[40vh]">
          <div className="flex items-center gap-1 px-4 pt-3">
            <button
              title="Stream Settings"
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/80'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              title="Monetization"
              onClick={() => setActiveTab('monetization')}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'monetization'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/80'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </button>
            <button
              title="Analytics"
              disabled={!isLive}
              onClick={() => setActiveTab('analytics')}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/80'
              } ${!isLive ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="relative w-full max-w-xs bg-white/10 rounded-full p-1 mx-auto">
                  <div className={`absolute top-1 bottom-1 w-1/2 bg-purple-600 rounded-full transition-transform ${streamMethod === 'webcam' ? 'translate-x-0' : 'translate-x-full'}`}></div>
                  <div className="relative z-10 flex">
                    <button onClick={() => setStreamMethod('webcam')} className={`w-1/2 py-2 rounded-full ${streamMethod === 'webcam' ? 'text-white' : 'text-white/70'}`}>Webcam</button>
                    <button onClick={() => setStreamMethod('obs')} className={`w-1/2 py-2 rounded-full ${streamMethod === 'obs' ? 'text-white' : 'text-white/70'}`}>OBS / RTMP</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Stream Title</div>
                    <input
                      value={streamTitle}
                      onChange={e => setStreamTitle(e.target.value)}
                      className="w-full bg-black/60 text-white rounded-lg px-3 py-2 outline-none border border-white/15 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Category</div>
                    <select
                      value={streamCategory}
                      onChange={e => setStreamCategory(e.target.value)}
                      className="w-full bg-black/60 text-white rounded-lg px-3 py-2 outline-none border border-white/15 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60"
                    >
                      <option>General</option>
                      <option>Music</option>
                      <option>Sports</option>
                      <option>Gaming</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Visibility</div>
                    <select
                      value={visibility}
                      onChange={e => setVisibility(e.target.value as any)}
                      className="w-full bg-black/60 text-white rounded-lg px-3 py-2 outline-none border border-white/15 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60"
                    >
                      <option value="public">Public</option>
                      <option value="ticket">Ticket holders only</option>
                      <option value="followers">Followers only</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/70 text-xs">Monetization</div>
                    <button
                      onClick={() => setMonetizationEnabled(m => !m)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        monetizationEnabled ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          monetizationEnabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
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
            {activeTab === 'chat' && null}
            {activeTab === 'monetization' && (
              <div className="space-y-4 text-white/80">
                <div className="text-sm">
                  Monetization is{' '}
                  <span className={monetizationEnabled ? 'text-green-400' : 'text-red-400'}>
                    {monetizationEnabled ? 'enabled' : 'disabled'}
                  </span>{' '}
                  for this stream.
                </div>
                {virtualPrice ? (
                  <div className="space-y-2">
                    <div className="text-xs text-white/60">Virtual ticket</div>
                    <div className="bg-white/10 rounded-lg p-3 inline-block">
                      <div className="font-semibold">Virtual</div>
                      <div className="text-sm text-white/70">{virtualPrice}</div>
                      {virtualAvailable !== null && (
                        <div className="text-xs text-white/60">
                          {virtualAvailable} available
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-white/60 text-sm">
                    No virtual ticket configured for this event.
                  </div>
                )}
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="space-y-4 text-white/80">
                {isLoadingAnalytics && (
                  <div className="text-white/70 text-sm">Loading analytics...</div>
                )}
                {!isLoadingAnalytics && analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Live viewers</div>
                      <div className="text-xl font-semibold">
                        {(event.streaming?.liveViewers || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Total views</div>
                      <div className="text-xl font-semibold">
                        {analytics.views?.total ?? 0}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Tickets sold</div>
                      <div className="text-xl font-semibold">
                        {analytics.ticketsSold?.total ?? 0}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Interested</div>
                      <div className="text-xl font-semibold">
                        {analytics.interested?.total ?? 0}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Shares</div>
                      <div className="text-xl font-semibold">
                        {analytics.shares?.total ?? 0}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60">Revenue</div>
                      <div className="text-xl font-semibold">
                        {analytics.revenue?.total ?? 'TSh 0'}
                      </div>
                    </div>
                  </div>
                )}
                {!isLoadingAnalytics && !analytics && (
                  <div className="text-white/60 text-sm">No analytics data yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
