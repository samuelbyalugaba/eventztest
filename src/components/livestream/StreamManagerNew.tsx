import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { type Event, getEventAnalytics, generateStreamKeys, supabase, subscribeToStreamPresence } from '../../utils/supabase/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useIsMobile } from '../ui/use-mobile';
import { useAgoraBroadcast } from '../../hooks/useAgoraBroadcast';
import { useStreamPhase } from '../../hooks/useStreamPhase';
import { useStreamChat } from '../../hooks/useStreamChat';
import { StreamEndedPanel } from './StreamEndedPanel';
import { StreamSetupPanel } from './StreamSetupPanel';
import { StreamActiveOverlay } from './StreamActiveOverlay';
import { StreamSettingsModal } from './StreamSettingsModal';
import type { StreamStats } from './types';

interface StreamManagerProps {
  event: Event;
  onClose: () => void;
  onUpdateStatus: (isLive: boolean) => Promise<void> | void;
}

export function StreamManager({ event, onClose, onUpdateStatus }: StreamManagerProps) {
  const isMobile = useIsMobile();

  // ── Agora / broadcast ──
  const {
    client,
    localAudioTrack,
    localVideoTrack,
    cameraEnabled,
    micEnabled,
    streamHealth,
    isClientReady,
    setStreamHealth,
    toggleCamera,
    toggleMic,
    toggleCameraDevice,
  } = useAgoraBroadcast(event.streaming?.isLive || false);

  // ── Metrics (viewer count, revenue, timer) ──
  const [viewerCount, setViewerCount] = useState(event.streaming?.liveViewers || 0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const peakViewersRef = useRef(0);
  const totalGiftsRef = useRef(0);
  const newFollowersRef = useRef(0);
  const revenueRef = useRef(0);

  useEffect(() => { revenueRef.current = totalRevenue; }, [totalRevenue]);

  // ── Refs for final stats capture ──
  const likesRef = useRef(0);
  const messagesCountRef = useRef(0);

  const getEndStats = useCallback((): StreamStats => ({
    peakViewers: peakViewersRef.current,
    totalLikes: likesRef.current,
    totalGifts: totalGiftsRef.current,
    totalRevenue: revenueRef.current,
    duration: elapsedTime,
    newFollowers: newFollowersRef.current,
    chatMessages: messagesCountRef.current,
  }), [elapsedTime]);

  // ── Stream phase ──
  const {
    phase,
    isLive,
    isStarting,
    countdown,
    endStats,
    exitConfirmOpen,
    isInstantStream,
    setExitConfirmOpen,
    toggleLive,
    handleRequestClose,
    handleConfirmClose,
  } = useStreamPhase(event, onUpdateStatus, onClose, {
    client,
    localAudioTrack,
    localVideoTrack,
    elapsedTime,
    getEndStats,
    setStreamHealth,
  });

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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
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
    return () => { giftSub.unsubscribe(); };
  }, [event.id]);

  // ── Chat ──
  const {
    messages,
    chatMessage,
    setChatMessage,
    likes,
    likesAnimation,
    chatMessages,
    handleSendMessage,
    handleReportStreamMessage,
  } = useStreamChat(event.id, isLive);

  useEffect(() => { likesRef.current = likes; }, [likes]);
  useEffect(() => { messagesCountRef.current = messages.length; }, [messages.length]);

  // ── UI state ──
  const [showSettings, setShowSettings] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'settings' | 'monetization' | 'analytics'>('settings');
  const [streamMethod, setStreamMethod] = useState<'webcam' | 'obs'>('webcam');
  const [streamTitle, setStreamTitle] = useState(event.title || '');
  const [streamCategory, setStreamCategory] = useState(event.category || 'General');
  const [visibility, setVisibility] = useState<'public' | 'ticket' | 'followers'>((event.streaming as any)?.visibility || 'public');
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [_analytics, setAnalytics] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState(event.streaming?.ingest_url || '');
  const [streamKey, setStreamKey] = useState(event.streaming?.stream_key || '');
  const [showKey, setShowKey] = useState(false);

  const virtualTicket = event.ticket_tiers?.find((tier) => tier.name.toLowerCase().includes('virtual'));
  const virtualPrice = (event.streaming as any)?.virtualPrice || virtualTicket?.price || null;

  // ── Analytics ──
  useEffect(() => {
    if (activeSettingsTab !== 'analytics' || !isLive) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingAnalytics(true);
      try {
        const data = await getEventAnalytics(event.id);
        if (!cancelled) setAnalytics(data);
      } catch (error) {
        console.warn('Failed to load analytics', error);
      } finally { if (!cancelled) setIsLoadingAnalytics(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [activeSettingsTab, isLive, event.id]);

  // ── OBS keys ──
  useEffect(() => {
    if (streamMethod !== 'obs') return;
    let cancelled = false;
    const load = async () => {
      try {
        const { ingestUrl: ingest, streamKey: key } = await generateStreamKeys(event.id);
        if (!cancelled) { setRtmpUrl(ingest || ''); setStreamKey(key || ''); }
      } catch { toast.error('Failed to generate RTMP keys'); }
    };
    load();
    return () => { cancelled = true; };
  }, [streamMethod, event.id]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // ── Render ──
  if (phase === 'ended' && endStats) {
    return <StreamEndedPanel endStats={endStats} onClose={onClose} />;
  }

  if (phase === 'setup' && !isLive) {
    return (
      <>
        <StreamSetupPanel
          cameraEnabled={cameraEnabled}
          micEnabled={micEnabled}
          isClientReady={isClientReady}
          isStarting={isStarting}
          countdown={countdown}
          streamTitle={streamTitle}
          streamCategory={streamCategory}
          visibility={visibility}
          onToggleCamera={toggleCamera}
          onToggleCameraDevice={toggleCameraDevice}
          onToggleMic={toggleMic}
          onGoLive={toggleLive}
          onRequestClose={handleRequestClose}
          onOpenSettings={() => setShowSettings(true)}
          onStreamTitleChange={setStreamTitle}
        />
        <StreamSettingsModal
          showSettings={showSettings}
          onClose={() => setShowSettings(false)}
          activeSettingsTab={activeSettingsTab}
          onTabChange={setActiveSettingsTab}
          streamMethod={streamMethod}
          onStreamMethodChange={setStreamMethod}
          streamTitle={streamTitle}
          onStreamTitleChange={setStreamTitle}
          streamCategory={streamCategory}
          onStreamCategoryChange={setStreamCategory}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          monetizationEnabled={monetizationEnabled}
          onMonetizationChange={setMonetizationEnabled}
          virtualPrice={virtualPrice}
          rtmpUrl={rtmpUrl}
          streamKey={streamKey}
          showKey={showKey}
          onToggleShowKey={() => setShowKey((v) => !v)}
          onCopy={handleCopy}
          isLoadingAnalytics={isLoadingAnalytics}
          viewerCount={viewerCount}
          peakViewersRef={peakViewersRef}
          likes={likes}
          totalRevenue={totalRevenue}
        />
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
      </>
    );
  }

  return (
    <>
      <StreamActiveOverlay
        cameraEnabled={cameraEnabled}
        micEnabled={micEnabled}
        streamHealth={streamHealth}
        isMobile={isMobile}
        countdown={countdown}
        streamTitle={streamTitle}
        totalRevenue={totalRevenue}
        elapsedTime={elapsedTime}
        viewerCount={viewerCount}
        likes={likes}
        chatMessages={chatMessages}
        chatMessage={chatMessage}
        likesAnimation={likesAnimation}
        isChatVisible={isChatVisible}
        onToggleCamera={toggleCamera}
        onToggleCameraDevice={toggleCameraDevice}
        onToggleMic={toggleMic}
        onToggleLive={toggleLive}
        onChatMessageChange={setChatMessage}
        onSendChatMessage={handleSendMessage}
        onReportMessage={handleReportStreamMessage}
        onToggleChatVisibility={() => setIsChatVisible((v) => !v)}
        onRequestClose={handleRequestClose}
        onOpenSettings={() => setShowSettings(true)}
      />
      <StreamSettingsModal
        showSettings={showSettings}
        onClose={() => setShowSettings(false)}
        activeSettingsTab={activeSettingsTab}
        onTabChange={setActiveSettingsTab}
        streamMethod={streamMethod}
        onStreamMethodChange={setStreamMethod}
        streamTitle={streamTitle}
        onStreamTitleChange={setStreamTitle}
        streamCategory={streamCategory}
        onStreamCategoryChange={setStreamCategory}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        monetizationEnabled={monetizationEnabled}
        onMonetizationChange={setMonetizationEnabled}
        virtualPrice={virtualPrice}
        rtmpUrl={rtmpUrl}
        streamKey={streamKey}
        showKey={showKey}
        onToggleShowKey={() => setShowKey((v) => !v)}
        onCopy={handleCopy}
        isLoadingAnalytics={isLoadingAnalytics}
        viewerCount={viewerCount}
        peakViewersRef={peakViewersRef}
        likes={likes}
        totalRevenue={totalRevenue}
      />
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
    </>
  );
}
