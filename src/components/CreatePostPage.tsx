import { useState, useRef, useEffect, useCallback } from 'react';
import { BackButton } from './ui/BackButton';
import { X, RotateCw, ImagePlus, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { takePreloaded } from '../utils/cameraPreloader';
import { usePostCreation } from '../hooks/usePostCreation';
import { useDiscardDialog } from '../hooks/useDiscardDialog';
import { useHighlightCreation } from '../hooks/useHighlightCreation';
import { GlassButton } from './create-post/GlassButton';
import { ShutterButton } from './create-post/ShutterButton';
import { CaptionEditor } from './create-post/CaptionEditor';
import { MediaPreviews } from './create-post/MediaPreviews';
import { PostSettings } from './create-post/PostSettings';
import { C } from './create-post/constants';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CreatePostPage() {
  const [view, setView] = useState<'camera' | 'compose'>('camera');

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleFlip = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

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

  // Form/posting state
  const {
    capturedMedia, setCapturedMedia,
    galleryInputRef, handleGallerySelect,
    caption, setCaption,
    textareaRef,
    remaining, canPost,
    isPosting,
    locationData, showLocationSearch, locationQuery, setLocationQuery,
    locationSearching, locationSuggestions, locationSearchRef,
    handleRemoveLocation, handleOpenLocationSearch, handleLocationSelect,
    handlePost,
  } = usePostCreation(() => setView('compose'));

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
      setView('compose');
    }, 'image/jpeg', 0.92);
  }, [cameraReady, capturedMedia, facingMode, setCapturedMedia]);

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
        setView('compose');
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
  }, [cameraReady, capturedMedia, setCapturedMedia]);

  const { goBack } = useDiscardDialog({
    view,
    isRecording,
    capturedMedia,
    caption,
    stopRecording,
    setCapturedMedia,
    setCaption,
    setView,
    streamRef,
  });

  useHighlightCreation();

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  useEffect(() => {
    if (view === 'compose' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view, textareaRef]);

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#000' }}>
      <style>{`
        @keyframes camFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes camSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        textarea::placeholder { color: ${C.mute}; }
      `}</style>

      {view === 'camera' ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            onPlaying={() => setCameraReady(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
              opacity: cameraReady ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
          {!cameraReady && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.void, color: C.mute, fontSize: 14,
              flexDirection: 'column', gap: 12,
            }}>
              {cameraError ? (
                <>
                  <Camera size={32} opacity={0.4} />
                  <span>Camera unavailable</span>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    style={{
                      marginTop: 8, padding: '10px 24px', borderRadius: 100,
                      border: `1px solid ${C.hairline}`, background: C.glass,
                      color: C.ink, cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    Pick from gallery
                  </button>
                </>
              ) : null}
            </div>
          )}

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 16px', zIndex: 2 }}>
            <GlassButton icon={<X size={18} />} size={38} onClick={goBack} label="Close" />
          </div>

          {isRecording && (
            <div style={{
              position: 'absolute', top: 70, left: 0, right: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: '#FF3B30',
                animation: 'recPulse 1s ease-in-out infinite',
              }} />
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}

          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '0 28px 30px', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => galleryInputRef.current?.click()}
                aria-label="Add photo from gallery"
                style={{
                  width: 50, height: 50, borderRadius: 14,
                  border: `1.5px solid ${C.hairline}`,
                  background: `linear-gradient(160deg, #211A3D, #100D20)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: C.mute,
                }}
              >
                <ImagePlus size={20} />
              </button>
              <span style={{ fontSize: 12, color: C.mute }}>Gallery</span>
            </div>

            <ShutterButton
              isRecording={isRecording}
              onTap={capturePhoto}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />

            <GlassButton icon={<RotateCw size={18} />} size={50} onClick={handleFlip} label="Flip camera" />
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg"
            onChange={handleGallerySelect}
            style={{ display: 'none' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: '1 1 auto', position: 'relative', minHeight: 0, background: '#000' }}>
            <MediaPreviews capturedMedia={capturedMedia} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 16px' }}>
              <BackButton onClick={goBack} className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm text-[#F3F1FC] hover:bg-white/[0.09] hover:scale-105 transition-all duration-150" iconClassName="h-[17px] w-[17px]" />
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            background: 'rgba(18,14,32,0.92)',
            backdropFilter: 'blur(18px)',
            borderTop: `1px solid ${C.hairline}`,
            borderRadius: '24px 24px 0 0',
            padding: '18px 18px max(22px, env(safe-area-inset-bottom, 0px))',
            marginTop: -24, position: 'relative', zIndex: 2,
            animation: 'camFadeUp 0.35s ease',
          }}>
            <CaptionEditor
              caption={caption}
              setCaption={setCaption}
              textareaRef={textareaRef}
            />

            <PostSettings
              locationData={locationData}
              showLocationSearch={showLocationSearch}
              locationQuery={locationQuery}
              setLocationQuery={setLocationQuery}
              locationSearching={locationSearching}
              locationSuggestions={locationSuggestions}
              locationSearchRef={locationSearchRef}
              onRemoveLocation={handleRemoveLocation}
              onOpenLocationSearch={handleOpenLocationSearch}
              onLocationSelect={handleLocationSelect}
              remaining={remaining}
              canPost={canPost}
              isPosting={isPosting}
              onPost={handlePost}
            />
          </div>
        </div>
      )}
    </div>
  );
}
