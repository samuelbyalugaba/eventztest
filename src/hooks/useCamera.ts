import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { takePreloaded } from '../utils/cameraPreloader';

export type MediaItem = {
  file: File;
  url: string;
  kind: 'image' | 'video';
};

export function useCamera(onMediaCaptured?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<MediaItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      setCameraError(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const preloaded = await takePreloaded();
      const stream = preloaded && facing === 'environment'
        ? preloaded
        : await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } },
            audio: true,
          });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast.error('Failed to start camera');
      setCameraReady(false);
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  const handleFlip = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia({ file, url: URL.createObjectURL(file), kind: 'image' });
      onMediaCaptured?.();
    }, 'image/jpeg', 0.92);
  }, [cameraReady, capturedMedia, facingMode, onMediaCaptured]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !cameraReady) return;
    try {
      recordingChunksRef.current = [];
      const types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      if (!mimeType) { toast.error('Recording not supported on this device'); return; }
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: mimeType });
        if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
        setCapturedMedia({ file, url: URL.createObjectURL(file), kind: 'video' });
        onMediaCaptured?.();
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }, [cameraReady, capturedMedia, onMediaCaptured]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const handleGallerySelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
    const isVideo = file.type.startsWith('video/');
    setCapturedMedia({ file, url: URL.createObjectURL(file), kind: isVideo ? 'video' : 'image' });
    onMediaCaptured?.();
    e.target.value = '';
  }, [capturedMedia, onMediaCaptured]);

  return {
    videoRef,
    canvasRef,
    streamRef,
    facingMode,
    cameraReady,
    cameraError,
    isRecording,
    recordingDuration,
    capturedMedia,
    galleryInputRef,
    setCameraReady,
    setCapturedMedia,
    capturePhoto,
    startRecording,
    stopRecording,
    handleFlip,
    handleGallerySelect,
  };
}
