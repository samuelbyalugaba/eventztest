import { useState, useEffect, useRef } from 'react';
import { Users, Activity, Mic, MicOff, Video, VideoOff, Radio, Settings, RotateCcw, X, Copy, Eye, EyeOff, TrendingUp, MessageCircle, MessageCircleOff, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';
import { type Event, getStreamMessages, subscribeToStreamMessages, StreamMessage, getEventAnalytics, generateStreamKeys, getEventLikes, supabase, deleteEvent, subscribeToStreamPresence, sendStreamMessage } from '../../utils/supabase/api';
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../../utils/agora';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FloatingChat } from './FloatingChat';
import { SidebarChat } from './SidebarChat';
import { HeartAnimations, generateHeart } from './HeartAnimations';
import { useIsMobile } from '../ui/use-mobile';
import type { FloatingHeart, StreamStats } from './types';
import { createStreamClient, formatStreamElapsedTime, initializeLocalTracks, playLocalPreview, switchLocalCamera } from './sessionUtils';

interface StreamManagerProps {
  event: Event;
  onClose: () => void;
  onUpdateStatus: (isLive: boolean) => Promise<void> | void;
}

type StreamPhase = 'setup' | 'live' | 'ended';

export function StreamManager({ event, onClose, onUpdateStatus }: StreamManagerProps) {
  const isMobile = useIsMobile();

  // Core state
  const [phase, setPhase] = useState<StreamPhase>(event.streaming?.isLive ? 'live' : 'setup');
  const [isLive, setIsLive] = useState(event.streaming?.isLive || false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<number | null>(null);

  // Media state
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [streamHealth, setStreamHealth] = useState<'good' | 'poor' | 'offline'>(isLive ? 'good' : 'offline');

  // Real-time metrics — use refs for accurate final capture
  const [viewerCount, setViewerCount] = useState(event.streaming?.liveViewers || 0);
  const [likes, setLikes] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const peakViewersRef = useRef(0);
  const totalGiftsRef = useRef(0);
  const newFollowersRef = useRef(0);
  const likesRef = useRef(0);
  const revenueRef = useRef(0);
  const messagesCountRef = useRef(0);

  // Chat state
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [likesAnimation, setLikesAnimation] = useState<FloatingHeart[]>([]);

  // Agora state
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const tracksRef = useRef<{ audio: IMicrophoneAudioTrack | null; video: ICameraVideoTrack | null }>({ audio: null, video: null });
  const client = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'settings' | 'monetization' | 'analytics'>('settings');
  const [streamMethod, setStreamMethod] = useState<'webcam' | 'obs'>('webcam');
  const [streamTitle, setStreamTitle] = useState(event.title || '');
  const [streamCategory, setStreamCategory] = useState(event.category || 'General');
  const [visibility, setVisibility] = useState<'public' | 'ticket' | 'followers'>((event.streaming as any)?.visibility || 'public');
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [_analytics, setAnalytics] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState(event.streaming?.ingest_url || '');
  const [streamKey, setStreamKey] = useState(event.streaming?.stream_key || '');
  const [showKey, setShowKey] = useState(false);

  // Post-stream stats
  const [endStats, setEndStats] = useState<StreamStats | null>(null);

  const virtualTicket = event.ticket_tiers?.find((tier) => tier.name.toLowerCase().includes('virtual'));
  const virtualPrice = (event.streaming as any)?.virtualPrice || virtualTicket?.price || null;
  const isInstantStream = Boolean((event.streaming as any)?.isInstant);

  // Initialize Agora
  if (!client.current) {
    client.current = createStreamClient();
  }

  // Keep refs in sync
  useEffect(() => { tracksRef.current = { audio: localAudioTrack, video: localVideoTrack }; }, [localAudioTrack, localVideoTrack]);
  useEffect(() => { likesRef.current = likes; }, [likes]);
  useEffect(() => { revenueRef.current = totalRevenue; }, [totalRevenue]);
  useEffect(() => { messagesCountRef.current = messages.length; }, [messages.length]);

  // Network quality
  useEffect(() => {
    if (!client.current) return;
    const handleQuality = (quality: any) => {
      const uplink = quality.uplinkNetworkQuality;
      if (uplink <= 2) setStreamHealth('good');
      else if (uplink <= 4) setStreamHealth('poor');
      else setStreamHealth('offline');
    };
    client.current.on('network-quality', handleQuality);
    return () => { client.current?.off('network-quality', handleQuality); };
  }, []);

  // Real-time viewer count via Supabase Presence (instant + accurate)
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof subscribeToStreamPresence> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const userId = user?.id || event.organizer_id;
      channel = subscribeToStreamPresence(event.id, { userId, role: 'host' }, (count) => {
        setViewerCount(count);
        if (count > peakViewersRef.current) peakViewersRef.current = count;
      });
    })();
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [event.id, event.organizer_id]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = formatStreamElapsedTime;

  // Init local tracks
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { cameras, audioTrack, videoTrack, initialCamera } = await initializeLocalTracks();
        if (!mounted) return;
        setAvailableCameras(cameras);
        if (!mounted) { audioTrack.close(); videoTrack.close(); return; }
        tracksRef.current = { audio: audioTrack, video: videoTrack };
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        playLocalPreview(videoTrack, initialCamera, 'local-player');
      } catch {
        toast.error('Could not access camera/microphone');
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      tracksRef.current.audio?.close();
      tracksRef.current.video?.close();
      if (client.current) { client.current.leave(); client.current.removeAllListeners(); }
    };
  }, []);

  // Chat & likes
  useEffect(() => {
    const loadChat = async () => {
      if (!isLive) { setMessages([]); return; }
      try {
        const msgs = await getStreamMessages(event.id);
        if (msgs) setMessages(msgs);
        const initialLikes = await getEventLikes(event.id);
        setLikes(initialLikes);
      } catch {}
    };
    loadChat();

    const sub = subscribeToStreamMessages(event.id, (msg) => {
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > 200 ? next.slice(-200) : next;
      });
    });

    const likesSub = supabase
      .channel(`likes:${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_likes', filter: `event_id=eq.${event.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLikes((p) => p + 1);
          setLikesAnimation((p) => [...p, generateHeart()]);
        }
        if (payload.eventType === 'DELETE') setLikes((p) => Math.max(0, p - 1));
      })
      .subscribe();

    // Gift revenue tracking
    const giftSub = supabase
      .channel(`gifts:${event.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `event_id=eq.${event.id}` }, (payload: any) => {
        if (payload.new?.metadata?.type === 'gift') {
          const amount = payload.new.amount || 0;
          setTotalRevenue((p) => p + amount);
          totalGiftsRef.current += 1;
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); likesSub.unsubscribe(); giftSub.unsubscribe(); };
  }, [event.id, isLive]);

  // Cleanup hearts
  useEffect(() => {
    if (likesAnimation.length === 0) return;
    const timer = setTimeout(() => {
      setLikesAnimation((p) => p.filter((h) => Date.now() - h.id < 2000));
    }, 2000);
    return () => clearTimeout(timer);
  }, [likesAnimation]);

  // Analytics
  useEffect(() => {
    if (activeSettingsTab !== 'analytics' || !isLive) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingAnalytics(true);
      try {
        const data = await getEventAnalytics(event.id);
        if (!cancelled) setAnalytics(data);
      } catch {} finally { if (!cancelled) setIsLoadingAnalytics(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [activeSettingsTab, isLive, event.id]);

  // OBS keys
  useEffect(() => {
    if (streamMethod !== 'obs') return;
    let cancelled = false;
    const load = async () => {
      try {
        const { ingestUrl, streamKey } = await generateStreamKeys(event.id);
        if (!cancelled) { setRtmpUrl(ingestUrl || ''); setStreamKey(streamKey || ''); }
      } catch { toast.error('Failed to generate RTMP keys'); }
    };
    load();
    return () => { cancelled = true; };
  }, [streamMethod, event.id]);

  const toggleCamera = async () => {
    if (localVideoTrack) { await localVideoTrack.setEnabled(!cameraEnabled); setCameraEnabled(!cameraEnabled); }
  };

  const toggleCameraDevice = async () => {
    if (!localVideoTrack) return;
    try {
      const { cameras, nextIndex } = await switchLocalCamera({
        localVideoTrack,
        availableCameras,
        currentCameraIndex,
        elementId: 'local-player',
      });
      if (!availableCameras.length) setAvailableCameras(cameras);
      setCurrentCameraIndex(nextIndex);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to switch camera');
    }
  };

  const toggleMic = async () => {
    if (localAudioTrack) { await localAudioTrack.setEnabled(!micEnabled); setMicEnabled(!micEnabled); }
  };

  const clearStartTimers = () => {
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (startTimeoutRef.current) { window.clearTimeout(startTimeoutRef.current); startTimeoutRef.current = null; }
    setIsStarting(false);
    setCountdown(0);
  };

  const stopStream = async (opts?: { showToast?: boolean; deleteInstant?: boolean }) => {
    clearStartTimers();
    if (client.current) { try { await client.current.leave(); } catch {} }
    if (isLive) {
      // Use refs for accurate final values
      setEndStats({
        peakViewers: peakViewersRef.current,
        totalLikes: likesRef.current,
        totalGifts: totalGiftsRef.current,
        totalRevenue: revenueRef.current,
        duration: elapsedTime,
        newFollowers: newFollowersRef.current,
        chatMessages: messagesCountRef.current,
      });
      setIsLive(false);
      setStreamHealth('offline');
      setPhase('ended');
      try { await Promise.resolve(onUpdateStatus(false)); } catch (e: any) { toast.error(e?.message || 'Failed to update status'); }
      if (opts?.showToast) toast.info('Stream ended');
    }
    if (isInstantStream && opts?.deleteInstant) {
      try { await deleteEvent(event.id); } catch (e: any) { toast.error(e?.message || 'Failed to remove stream'); }
    }
  };

  const handleRequestClose = () => {
    if (isInstantStream || isLive || isStarting || countdown > 0) { setExitConfirmOpen(true); return; }
    onClose();
  };

  const handleConfirmClose = async () => {
    setExitConfirmOpen(false);
    await stopStream({ deleteInstant: true });
    onClose();
  };

  const toggleLive = async () => {
    const newState = !isLive;
    const channelName = `event-${event.id}`;
    const uid = event.organizer_id;

    if (newState) {
      if (countdown === 0) {
        setIsStarting(true);
        setCountdown(3);
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = window.setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) { if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; } return 0; }
            return prev - 1;
          });
        }, 1000);
        if (startTimeoutRef.current) window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = window.setTimeout(async () => {
          try {
            const token = await getAgoraToken(channelName, uid, 'publisher');
            if (!token) { toast.error('Failed to start: missing token'); setIsStarting(false); return; }
            if (!client.current) { toast.error('Agora client not ready'); setIsStarting(false); return; }
            await client.current.setClientRole('host');
            await client.current.join(AGORA_APP_ID, channelName, token, uid);
            if (localAudioTrack && localVideoTrack) {
              if (!localAudioTrack.enabled) await localAudioTrack.setEnabled(true);
              if (!localVideoTrack.enabled) await localVideoTrack.setEnabled(true);
              await client.current.publish([localAudioTrack, localVideoTrack]);
            } else { toast.error('Camera/Mic not ready'); setIsStarting(false); return; }
            setIsLive(true);
            setStreamHealth('good');
            setIsStarting(false);
            setPhase('live');
            await Promise.resolve(onUpdateStatus(true));
            toast.success("You are now LIVE");
          } catch (e: any) { toast.error(`Failed: ${e.message}`); setIsStarting(false); }
        }, 3000);
      }
    } else {
      await stopStream({ showToast: true });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await sendStreamMessage(event.id, chatMessage);
      setChatMessage('');
    } catch { toast.error('Failed to send message'); }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const chatMessages = messages.map((m) => ({
    user: m.user?.full_name || (m.user as any)?.username || 'Guest',
    text: m.message,
    avatar: m.user?.avatar_url,
    isGift: m.message.startsWith('🎁'),
  }));

  // ===== RENDER =====

  // Post-stream summary screen
  if (phase === 'ended' && endStats) {
    return (
      <div className="fixed inset-0 bg-black z-[80] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-white text-xl font-bold">Stream Ended</h2>
              <p className="text-white/60 text-sm mt-1">Here's how your stream performed</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">Duration</span>
                </div>
                <span className="text-white text-lg font-bold">{formatTime(endStats.duration)}</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">Peak viewers</span>
                </div>
                <span className="text-white text-lg font-bold">{endStats.peakViewers.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">Revenue</span>
                </div>
                <span className="text-white text-lg font-bold">TZS {endStats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">Messages</span>
                </div>
                <span className="text-white text-lg font-bold">{endStats.chatMessages.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3 border border-white/5 mb-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="text-pink-400 text-lg font-bold">{endStats.totalLikes}</span>
                  <p className="text-white/40 text-[9px] uppercase">Likes</p>
                </div>
                <div className="text-center">
                  <span className="text-yellow-400 text-lg font-bold">{endStats.totalGifts}</span>
                  <p className="text-white/40 text-[9px] uppercase">Gifts</p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              Close Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-stream setup screen
  if (phase === 'setup' && !isLive) {
    return (
      <div className="fixed inset-0 bg-black z-[80] overflow-hidden">
        {/* Camera preview */}
        <div className="absolute inset-0">
          <div id="local-player" className={`w-full h-full ${!cameraEnabled ? 'hidden' : ''}`} />
          {!cameraEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="flex flex-col items-center text-white/50">
                <VideoOff className="w-16 h-16 mb-3" />
                <span className="text-sm">Camera is off</span>
              </div>
            </div>
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <button onClick={handleRequestClose} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xl text-white border border-white/10">
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
              <span className="text-white text-sm font-bold">Studio</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xl text-white border border-white/10">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center controls */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-6 pointer-events-auto">
            <button onClick={toggleCameraDevice} className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl text-white border border-white/10 active:scale-90 transition-transform">
              <RotateCcw className="w-6 h-6" />
            </button>
            <button onClick={toggleCamera} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 active:scale-90 transition-all ${cameraEnabled ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
              {cameraEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button onClick={toggleMic} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 active:scale-90 transition-all ${micEnabled ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
              {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Bottom: Stream info & Go Live */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-4">
            <input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Stream title..."
              className="w-full bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/30 mb-2"
            />
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs px-2 py-1 rounded-lg bg-white/5">{streamCategory}</span>
              <span className="text-white/50 text-xs px-2 py-1 rounded-lg bg-white/5 capitalize">{visibility}</span>
            </div>
          </div>

          <button
            onClick={toggleLive}
            disabled={isStarting}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-base shadow-2xl shadow-red-600/30 hover:shadow-red-600/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Radio className="w-5 h-5" />
            {isStarting ? `Going live in ${countdown}...` : 'Go Live'}
          </button>
        </div>

        {/* Settings Modal */}
        {renderSettingsModal()}

        <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <AlertDialogContent className="z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle>{isInstantStream ? 'Close livestream?' : 'Leave studio?'}</AlertDialogTitle>
              <AlertDialogDescription>{isInstantStream ? 'This will remove the livestream.' : 'Are you sure you want to leave?'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmClose}>Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Settings modal (shared between setup and live)
  function renderSettingsModal() {
    if (!showSettings) return null;
    return (
      <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-end md:items-center justify-center" onClick={() => setShowSettings(false)}>
        <div className="w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-t-3xl md:rounded-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {(['settings', 'monetization', 'analytics'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveSettingsTab(tab)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeSettingsTab === tab ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                  {tab === 'settings' ? 'Settings' : tab === 'monetization' ? 'Monetize' : 'Analytics'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl bg-white/10 text-white/70"><X className="w-4 h-4" /></button>
          </div>

          {activeSettingsTab === 'settings' && (
            <div className="space-y-4">
              <div className="relative w-full bg-white/10 rounded-full p-1">
                <div className={`absolute top-1 bottom-1 w-1/2 bg-primary rounded-full transition-transform ${streamMethod === 'webcam' ? 'translate-x-0' : 'translate-x-full'}`} />
                <div className="relative z-10 flex">
                  <button onClick={() => setStreamMethod('webcam')} className={`w-1/2 py-2 rounded-full text-sm ${streamMethod === 'webcam' ? 'text-white font-bold' : 'text-white/50'}`}>Webcam</button>
                  <button onClick={() => setStreamMethod('obs')} className={`w-1/2 py-2 rounded-full text-sm ${streamMethod === 'obs' ? 'text-white font-bold' : 'text-white/50'}`}>OBS / RTMP</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Title</label>
                <input value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Category</label>
                <select value={streamCategory} onChange={(e) => setStreamCategory(e.target.value)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm">
                  <option>General</option><option>Music</option><option>Sports</option><option>Gaming</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Visibility</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm">
                  <option value="public">Public</option><option value="ticket">Ticket holders</option><option value="followers">Followers</option>
                </select>
              </div>
              {streamMethod === 'obs' && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs">Stream URL</label>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <input type="text" value={rtmpUrl} readOnly className="bg-transparent text-white/70 text-xs flex-1 outline-none font-mono" />
                      <button onClick={() => handleCopy(rtmpUrl, 'URL')} className="text-white/50 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs">Stream Key</label>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <input type={showKey ? 'text' : 'password'} value={streamKey} readOnly className="bg-transparent text-white/70 text-xs flex-1 outline-none font-mono" />
                      <button onClick={() => setShowKey(!showKey)} className="text-white/50 hover:text-white">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => handleCopy(streamKey, 'Key')} className="text-white/50 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  
                </div>
              )}
            </div>
          )}

          {activeSettingsTab === 'monetization' && (
            <div className="space-y-4 text-white/80">
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable monetization</span>
                <button onClick={() => setMonetizationEnabled((m) => !m)} className={`relative w-11 h-6 rounded-full transition-colors ${monetizationEnabled ? 'bg-green-500' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${monetizationEnabled ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              {virtualPrice && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-sm font-semibold">Virtual Ticket: {virtualPrice}</span>
                </div>
              )}
            </div>
          )}

          {activeSettingsTab === 'analytics' && (
            <div className="space-y-4">
              {isLoadingAnalytics ? (
                <p className="text-white/50 text-sm">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-white/50 text-[10px] uppercase">Viewers</span>
                    <p className="text-white text-lg font-bold">{viewerCount.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-white/50 text-[10px] uppercase">Peak</span>
                    <p className="text-white text-lg font-bold">{peakViewersRef.current}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-white/50 text-[10px] uppercase">Likes</span>
                    <p className="text-white text-lg font-bold">{likes}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-white/50 text-[10px] uppercase">Revenue</span>
                    <p className="text-white text-lg font-bold">TZS {totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== LIVE PHASE =====
  // Desktop: side-by-side with sidebar chat
  // Mobile: fullscreen with floating chat
  return (
    <div className="fixed inset-0 bg-black z-[80] overflow-hidden flex">
      {/* Video + HUD area */}
      <div className="flex-1 relative min-h-0">
        {/* Video — fill entire area, no extra wrapper */}
        <div id="local-player" className={`absolute inset-0 w-full h-full [&>div]:!w-full [&>div]:!h-full [&>div]:!position-relative [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover ${!cameraEnabled ? 'invisible' : ''}`} />
        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center text-white/50">
              <VideoOff className="w-12 h-12 mb-3" />
              <span>Camera off</span>
            </div>
          </div>
        )}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="text-white text-7xl font-black animate-pulse">{countdown}</div>
          </div>
        )}

        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Top gradient */}
          <div className="bg-gradient-to-b from-black/80 via-black/30 to-transparent h-32 pointer-events-auto">
            <div className="px-4 pt-12 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleRequestClose} className="p-2 rounded-xl bg-white/10 backdrop-blur-xl text-white border border-white/10">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-white font-bold text-sm max-w-[140px] truncate">{streamTitle}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-200 text-[9px] font-black tracking-[0.15em]">LIVE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/15 border border-yellow-500/25 px-3 py-1.5 rounded-xl backdrop-blur-xl">
                  <span className="text-yellow-400 font-bold text-sm">TZS {totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating HUD pill */}
          <div className="absolute left-1/2 -translate-x-1/2 top-28 flex items-center gap-3 bg-black/50 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
            <span className="text-white font-mono text-xs font-bold">{formatTime(elapsedTime)}</span>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-white/60" />
              <span className="text-white text-xs font-bold">{viewerCount.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className={`flex items-center gap-1 text-[10px] font-bold ${streamHealth === 'good' ? 'text-green-400' : streamHealth === 'poor' ? 'text-yellow-400' : 'text-red-400'}`}>
              <Activity className="w-3.5 h-3.5" />
              <span>{streamHealth === 'good' ? 'GOOD' : streamHealth === 'poor' ? 'POOR' : 'BAD'}</span>
            </div>
          </div>

          {/* Right action rail */}
          <div className="absolute bottom-32 right-4 flex flex-col items-center gap-3 pointer-events-auto">
            <button onClick={toggleCameraDevice} className="p-2.5 rounded-xl bg-black/40 backdrop-blur-xl text-white border border-white/10 active:scale-90 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={toggleCamera} className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 active:scale-90 transition-all ${cameraEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'}`}>
              {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleMic} className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 active:scale-90 transition-all ${micEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'}`}>
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsChatVisible((v) => !v)}
              title={isChatVisible ? 'Hide chat' : 'Show chat'}
              className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 active:scale-90 transition-all ${isChatVisible ? 'bg-black/40 text-white' : 'bg-white text-black'}`}
            >
              {isChatVisible ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-black/40 backdrop-blur-xl text-white border border-white/10">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={toggleLive} className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 bg-white text-red-600 active:scale-90 transition-all">
              <Radio className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile: Floating chat overlay */}
        {isMobile && isChatVisible && (
          <div className="absolute bottom-28 left-4 w-64 z-20 pointer-events-auto">
            <FloatingChat messages={chatMessages} maxVisible={3} />
          </div>
        )}

        {/* Hearts */}
        <HeartAnimations hearts={likesAnimation} />

        {/* Settings panel */}
        {renderSettingsModal()}

        <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <AlertDialogContent className="z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle>End livestream?</AlertDialogTitle>
              <AlertDialogDescription>{isInstantStream ? 'This will end and remove the livestream.' : 'This will end the livestream for all viewers.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep streaming</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmClose}>End stream</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Desktop: Sidebar chat */}
      {!isMobile && isChatVisible && (
        <div className="w-[340px] flex-shrink-0">
          <SidebarChat
            messages={chatMessages}
            message={chatMessage}
            onMessageChange={setChatMessage}
            onSendMessage={handleSendMessage}
            viewerCount={viewerCount}
          />
        </div>
      )}
    </div>
  );
}
