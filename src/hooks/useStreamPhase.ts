import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import type { Event } from '../utils/supabase/api';
import { deleteEvent } from '../utils/supabase/api';
import { AGORA_APP_ID, getAgoraToken } from '../utils/agora';
import { startAgoraRecording, stopAgoraRecording } from '../utils/agoraRecording';
import type { StreamStats } from '../components/livestream/types';

type StreamPhase = 'setup' | 'live' | 'ended';
type StreamMethod = 'webcam' | 'obs';

export function useStreamPhase(event: Event, onUpdateStatus: (isLive: boolean) => Promise<void> | void, onClose: () => void, deps: {
  client: React.MutableRefObject<IAgoraRTCClient | null>;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  elapsedTime: number;
  getEndStats: () => StreamStats;
  setStreamHealth: (health: 'good' | 'poor' | 'offline') => void;
  streamMethod: StreamMethod;
}) {
  const [phase, setPhase] = useState<StreamPhase>(event.streaming?.isLive ? 'live' : 'setup');
  const [isLive, setIsLive] = useState(event.streaming?.isLive || false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [endStats, setEndStats] = useState<StreamStats | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<number | null>(null);

  const isInstantStream = Boolean((event.streaming as any)?.isInstant);

  const detectOrientation = (): 'portrait' | 'landscape' => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
  };

  const clearStartTimers = () => {
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (startTimeoutRef.current) { window.clearTimeout(startTimeoutRef.current); startTimeoutRef.current = null; }
    setIsStarting(false);
    setCountdown(0);
  };

  const stopStream = async (opts?: { showToast?: boolean; deleteInstant?: boolean }) => {
    clearStartTimers();
    if (deps.client.current) { try { await deps.client.current.leave(); } catch { /* ignore */ } }
    if (isLive) {
      const recordingDone = stopAgoraRecording(event.id);
      setEndStats(deps.getEndStats());
      setIsLive(false);
      setPhase('ended');
      deps.setStreamHealth('offline');
      try { await Promise.resolve(onUpdateStatus(false)); } catch { /* ignore */ }
      if (opts?.showToast) toast.info('Stream ended');
      if (isInstantStream && opts?.deleteInstant) {
        // Give the recording a head start before the event is deleted so the
        // replay row survives in cloudflare_streams even after the event row goes.
        try {
          await Promise.race([recordingDone, new Promise((resolve) => setTimeout(resolve, 10_000))]);
        } catch { /* ignore */ }
      }
    }
    if (isInstantStream && opts?.deleteInstant) {
      try { await deleteEvent(event.id); } catch { /* ignore */ }
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
    const isObsMode = deps.streamMethod === 'obs';

    if (newState) {
      if (isObsMode) {
        // OBS mode: Skip Agora, just mark as live
        // The actual stream detection is done by polling/webhook
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
            // Mark event as live (OBS mode - no Agora)
            setIsLive(true);
            setIsStarting(false);
            setPhase('live');
            deps.setStreamHealth('good');
            await Promise.resolve(onUpdateStatus(true));
            toast.success("Stream marked as LIVE - Start OBS now");
          } catch (e: any) { toast.error(`Failed: ${e.message}`); setIsStarting(false); }
        }, 3000);
      } else {
        // Webcam (Agora) mode
        const channelName = `event-${event.id}`;
        const uid = event.organizer_id;
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
              if (!deps.client.current) { toast.error('Agora client not ready'); setIsStarting(false); return; }
              await deps.client.current.setClientRole('host');
              await deps.client.current.join(AGORA_APP_ID, channelName, token, uid);
              if (deps.localAudioTrack && deps.localVideoTrack) {
                if (!deps.localAudioTrack.enabled) await deps.localAudioTrack.setEnabled(true);
                if (!deps.localVideoTrack.enabled) await deps.localVideoTrack.setEnabled(true);
                await deps.client.current.publish([deps.localAudioTrack, deps.localVideoTrack]);
              } else { toast.error('Camera/Mic not ready'); setIsStarting(false); return; }
              setIsLive(true);
              setIsStarting(false);
              setPhase('live');
              deps.setStreamHealth('good');
              await Promise.resolve(onUpdateStatus(true));
              startAgoraRecording(event.id, detectOrientation());
              toast.success("You are now LIVE");
            } catch (e: any) { toast.error(`Failed: ${e.message}`); setIsStarting(false); }
          }, 3000);
        }
      }
    } else {
      await stopStream({ showToast: true });
    }
  };

  return {
    phase,
    isLive,
    isStarting,
    countdown,
    endStats,
    exitConfirmOpen,
    isInstantStream,
    setExitConfirmOpen,
    toggleLive,
    stopStream,
    handleRequestClose,
    handleConfirmClose,
    clearStartTimers,
  };
}
