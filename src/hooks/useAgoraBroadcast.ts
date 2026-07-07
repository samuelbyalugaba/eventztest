import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { createStreamClient, initializeLocalTracks, playLocalPreview, switchLocalCamera } from '../components/livestream/sessionUtils';

export function useAgoraBroadcast() {
  const client = useRef<IAgoraRTCClient | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const tracksRef = useRef<{ audio: IMicrophoneAudioTrack | null; video: ICameraVideoTrack | null }>({ audio: null, video: null });

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [streamHealth, setStreamHealth] = useState<'good' | 'poor' | 'offline'>('offline');

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadClient = async () => {
      try {
        if (!client.current) {
          client.current = await createStreamClient();
        }
        if (mounted) setIsClientReady(true);
      } catch {
        if (mounted) toast.error('Could not initialize livestream');
      }
    };
    void loadClient();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    tracksRef.current = { audio: localAudioTrack, video: localVideoTrack };
  }, [localAudioTrack, localVideoTrack]);

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
  }, [isClientReady]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { cameras, audioTrack, videoTrack, initialCamera } = await initializeLocalTracks();
        if (!mounted) { audioTrack.close(); videoTrack.close(); return; }
        setAvailableCameras(cameras);
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

  useEffect(() => {
    return () => {
      tracksRef.current.audio?.close();
      tracksRef.current.video?.close();
      if (client.current) { client.current.leave(); client.current.removeAllListeners(); }
    };
  }, []);

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

  return {
    client,
    localAudioTrack,
    localVideoTrack,
    tracksRef,
    cameraEnabled,
    micEnabled,
    streamHealth,
    isClientReady,
    availableCameras,
    currentCameraIndex,
    setStreamHealth,
    setCameraEnabled,
    setMicEnabled,
    toggleCamera,
    toggleMic,
    toggleCameraDevice,
  };
}
