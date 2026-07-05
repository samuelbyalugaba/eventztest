import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from './ui/BackButton';
import { X, RotateCw, ImagePlus, MapPin, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage } from '../utils/supabase/api';
import { consumePreloadedStream } from '../utils/cameraPreloader';

type MediaItem = {
  file: File;
  url: string;
  kind: 'image' | 'video';
};

const C = {
  void: '#0E0B1F',
  glass: 'rgba(255,255,255,0.05)',
  glass2: 'rgba(255,255,255,0.09)',
  hairline: 'rgba(255,255,255,0.12)',
  violet: '#7C3AED',
  purple: '#9333EA',
  ink: '#F3F1FC',
  mute: 'rgba(243,241,252,0.55)',
};

const GRADIENT = `linear-gradient(135deg, ${C.violet}, ${C.purple})`;
const GRADIENT_FALLBACK = C.purple;
const CHAR_LIMIT = 240;
const LONG_PRESS_MS = 200;

function GlassButton({ icon, size = 44, onClick, label }: {
  icon: React.ReactNode; size?: number; onClick: () => void; label: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `1px solid ${C.hairline}`,
        background: hover ? C.glass2 : C.glass,
        color: C.ink, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        transition: 'background 0.15s ease, transform 0.15s ease',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {icon}
    </button>
  );
}

function ShutterButton({ isRecording, onTap, onStartRecording, onStopRecording }: {
  isRecording: boolean;
  onTap: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = () => {
    if (isRecording) {
      onStopRecording();
      return;
    }
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onStartRecording();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!isLongPress.current && !isRecording) {
      onTap();
    }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (pressTimer.current) {
          clearTimeout(pressTimer.current);
          pressTimer.current = null;
        }
      }}
      aria-label={isRecording ? 'Stop recording' : 'Take photo'}
      style={{
        position: 'relative', width: 80, height: 80,
        borderRadius: '50%', border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
      }}
    >
      {isRecording ? (
        <>
          <span style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: '3px solid #FF3B30', opacity: 0.6,
          }} />
          <span style={{
            position: 'relative', width: 32, height: 32, borderRadius: 6,
            background: '#FF3B30',
          }} />
        </>
      ) : (
        <>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: GRADIENT_FALLBACK,
            backgroundImage: GRADIENT, filter: 'blur(15px)', opacity: 0.65,
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: GRADIENT_FALLBACK,
            backgroundImage: GRADIENT, padding: 4,
          }}>
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: C.void }} />
          </span>
          <span style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', backgroundColor: GRADIENT_FALLBACK, backgroundImage: GRADIENT }} />
        </>
      )}
    </button>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'camera' | 'compose'>('camera');
  const [caption, setCaption] = useState('');
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isPosting, setIsPosting] = useState(false);

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

  // Captured media
  const [capturedMedia, setCapturedMedia] = useState<MediaItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      setCameraError(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Try to consume a preloaded stream first
      streamRef.current = await consumePreloadedStream(facing);

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 960 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        streamRef.current = stream;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      } else {
        setCameraReady(true);
      }
    } catch {
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

  const handleFlip = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleRemoveLocation = () => {
    setLocationData(null);
  };

  const handleOpenLocationSearch = () => {
    setShowLocationSearch(true);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const handleLocationSelect = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const parts = suggestion.display_name.split(',').map(s => s.trim());
    const label = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
    setLocationData({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon), label });
    setShowLocationSearch(false);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const locationSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showLocationSearch) {
      setLocationSuggestions([]);
      setLocationQuery('');
      return;
    }
    const timer = setTimeout(async () => {
      if (!locationQuery.trim()) {
        setLocationSuggestions([]);
        return;
      }
      setLocationSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [locationQuery, showLocationSearch]);

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
  }, [cameraReady, capturedMedia, facingMode]);

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
    } catch {
      toast.error('Failed to start recording');
    }
  }, [cameraReady, capturedMedia]);

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

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
    const isVideo = file.type.startsWith('video/');
    setCapturedMedia({ file, url: URL.createObjectURL(file), kind: isVideo ? 'video' : 'image' });
    setView('compose');
    e.target.value = '';
  };

  useEffect(() => {
    if (view === 'compose' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [caption]);

  const remaining = CHAR_LIMIT - caption.length;
  const canPost = caption.trim().length > 0 && remaining >= 0 && capturedMedia !== null;

  const handlePost = async () => {
    if (!canPost || !capturedMedia || isPosting) return;
    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const url = await uploadImage(capturedMedia.file, 'posts', `user_${user.id}`);
      const extraLines: string[] = [];
      if (locationData) extraLines.push(`📍 ${locationData.label}`);
      const finalContent = [caption.trim(), ...extraLines].filter(Boolean).join('\n\n');

      await createPost({
        user_id: user.id,
        content: finalContent,
        image_urls: [url],
        hashtags: [],
        posted_as_organizer: false,
      } as any);

      toast.success('Post created successfully');
      window.dispatchEvent(new Event('postsUpdated'));
      navigate('/feed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const goBack = () => {
    if (isRecording) {
      stopRecording();
    }
    if (view === 'compose') {
      if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
      setCaption('');
      setView('camera');
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      navigate(-1);
    }
  };

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
              ) : (
                <Loader2 size={24} style={{ animation: 'camSpin 1s linear infinite' }} />
              )}
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
            {capturedMedia?.kind === 'video' ? (
              <video src={capturedMedia.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
            ) : capturedMedia?.url ? (
              <img src={capturedMedia.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : null}
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
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell people what's happening..."
              rows={1}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none',
                background: 'transparent', color: C.ink, fontSize: 16,
                lineHeight: 1.5, minHeight: 44,
              }}
            />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 16 }}>
              {locationData ? (
                <button
                  onClick={handleRemoveLocation}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 10, maxWidth: '55%',
                    border: '1px solid transparent',
                    backgroundColor: GRADIENT_FALLBACK,
                    backgroundImage: GRADIENT,
                    color: '#0E0B1F',
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}
                >
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationData.label}</span>
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>✕</span>
                </button>
              ) : showLocationSearch ? (
                <div ref={locationSearchRef} style={{ position: 'relative', flex: 1, maxWidth: '60%' }}>
                  <input
                    autoFocus
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Search location..."
                    style={{
                      width: '100%', border: `1px solid ${C.hairline}`, outline: 'none',
                      background: C.glass, color: C.ink, fontSize: 13,
                      padding: '8px 12px', borderRadius: 10, minHeight: 36,
                    }}
                  />
                  {locationSearching && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '8px 12px', color: C.mute, fontSize: 12 }}>
                      Searching...
                    </div>
                  )}
                  {locationSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
                      background: '#1C1733', border: `1px solid ${C.hairline}`,
                      borderRadius: 12, overflow: 'hidden', zIndex: 10,
                      boxShadow: '0 12px 30px -10px rgba(0,0,0,0.6)',
                    }}>
                      {locationSuggestions.map((s, i) => (
                        <div
                          key={i}
                          onClick={() => handleLocationSelect(s)}
                          style={{
                            padding: '10px 14px', fontSize: 13, color: C.ink,
                            cursor: 'pointer',
                            borderBottom: i < locationSuggestions.length - 1 ? `1px solid ${C.hairline}` : undefined,
                          }}
                        >
                          {s.display_name.split(',').slice(0, 3).join(',')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleOpenLocationSearch}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 10, maxWidth: '55%',
                    border: `1px solid ${C.hairline}`,
                    background: C.glass, color: C.mute,
                    fontSize: 13, fontWeight: 400,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span>Add location</span>
                </button>
              )}

              <span style={{
                marginLeft: 'auto', fontSize: 13, fontWeight: 600,
                color: remaining < 0 ? '#FF6B6B' : C.mute,
              }}>
                {remaining < 24 ? `${remaining} LEFT` : ''}
              </span>

              <button
                disabled={!canPost || isPosting}
                onClick={handlePost}
                style={{
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                  padding: '11px 24px', borderRadius: 100, border: 'none',
                  cursor: canPost && !isPosting ? 'pointer' : 'default',
                  color: canPost && !isPosting ? '#0E0B1F' : C.mute,
                  background: canPost && !isPosting ? undefined : 'rgba(255,255,255,0.08)',
                  backgroundColor: canPost && !isPosting ? GRADIENT_FALLBACK : undefined,
                  backgroundImage: canPost && !isPosting ? GRADIENT : undefined,
                  boxShadow: canPost && !isPosting ? '0 6px 22px -4px rgba(110,79,224,0.6)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {isPosting ? <Loader2 size={16} style={{ animation: 'camSpin 1s linear infinite' }} /> : null}
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
