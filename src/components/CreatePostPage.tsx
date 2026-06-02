import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image as ImageIcon, Loader2, MapPin, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage, getProfile } from '../utils/supabase/api';
import { UserAvatar } from './UserAvatar';

type MediaItem = {
  file: File;
  url: string;
  kind: 'image' | 'video';
};

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
]);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_VIDEO_SIZE_MB = 100;

const getFileExtension = (file: File) => {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex > 0 && dotIndex < file.name.length - 1 ? file.name.slice(dotIndex + 1).toLowerCase() : '';
};
const isSupportedVideoFile = (file: File) => {
  const ext = getFileExtension(file);
  return SUPPORTED_VIDEO_TYPES.has(file.type) || SUPPORTED_VIDEO_EXTENSIONS.has(ext);
};
const isKnownUnsupportedVideoFile = (file: File) => {
  const ext = getFileExtension(file);
  return file.type.startsWith('video/') || ['mov', 'm4v', 'hevc', 'heif', '3gp', '3gpp'].includes(ext);
};
const isSupportedImageFile = (file: File) => {
  const ext = getFileExtension(file);
  return file.type.startsWith('image/') || SUPPORTED_IMAGE_EXTENSIONS.has(ext);
};

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const mediaRef = useRef<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [locationTag, setLocationTag] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [locationDraft, setLocationDraft] = useState('');
  const [scheduleDraft, setScheduleDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thumbVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [coverTime, setCoverTime] = useState(0);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);
  const [generatedCoverDataUrl, setGeneratedCoverDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        setUserProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    coverPreviewUrlRef.current = coverPreviewUrl;
  }, [coverPreviewUrl]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach(m => URL.revokeObjectURL(m.url));
      if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    };
  }, []);

  const hasSingleVideoPost = media.length === 1 && media[0]?.kind === 'video';

  const dataUrlToFile = async (dataUrl: string, filename: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  };

  const captureCoverFrame = async (timeSeconds: number) => {
    const v = thumbVideoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    const seekTo = Math.max(0, Math.min(timeSeconds, videoDuration || 0));
    setCoverTime(seekTo);

    await new Promise<void>((resolve) => {
      const onSeeked = () => resolve();
      v.addEventListener('seeked', onSeeked, { once: true });
      try {
        v.currentTime = seekTo;
      } catch {
        resolve();
      }
    });

    const width = v.videoWidth || 720;
    const height = v.videoHeight || 1280;
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, width, height);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    setGeneratedCoverDataUrl(dataUrl);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_MEDIA = 10;
    const remaining = Math.max(0, MAX_MEDIA - media.length);
    if (remaining === 0) {
      toast.error(`You can only add up to ${MAX_MEDIA} items`);
      e.target.value = '';
      return;
    }

    const next: MediaItem[] = [];
    for (const file of files.slice(0, remaining)) {
      const isVideo = isSupportedVideoFile(file);
      const isImage = isSupportedImageFile(file);
      if (!isVideo && !isImage) {
        if (isKnownUnsupportedVideoFile(file)) {
          toast.error('Use MP4, WebM, or OGG video for reliable mobile playback.');
        }
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast.error(`Video must be less than ${MAX_VIDEO_SIZE_MB}MB`);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file), kind: isVideo ? 'video' : 'image' });
    }

    if (next.length === 0) {
      toast.error('Please select valid image/video files');
      e.target.value = '';
      return;
    }

    setMedia(prev => [...prev, ...next]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setMedia(prev => {
      const next = [...prev];
      const removed = next[index];
      if (removed) URL.revokeObjectURL(removed.url);
      next.splice(index, 1);
      return next;
    });
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Cover must be an image');
      return;
    }
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverImageFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setGeneratedCoverDataUrl(null);
    e.target.value = '';
  };

  useEffect(() => {
    if (!hasSingleVideoPost) {
      setVideoDuration(0);
      setCoverTime(0);
      setCoverImageFile(null);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
      setGeneratedCoverDataUrl(null);
      return;
    }

    const v = thumbVideoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      setVideoDuration(d);
      captureCoverFrame(0);
    };
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => v.removeEventListener('loadedmetadata', onLoadedMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSingleVideoPost]);

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      toast.error('Please add some content or media');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create posts');
        return;
      }

      const extraLines: string[] = [];
      if (locationTag.trim()) extraLines.push(`Location: ${locationTag.trim()}`);
      if (scheduledAt.trim()) extraLines.push(`Scheduled: ${scheduledAt.trim()}`);
      const finalContent = [content.trim(), ...extraLines].filter(Boolean).join('\n\n');

      let mediaUrls: string[] = [];

      if (media.length > 0) {
        try {
          mediaUrls = [];
          for (const [index, item] of media.entries()) {
            try {
              mediaUrls.push(await uploadImage(item.file, 'posts', `user_${user.id}`));
            } catch (error: any) {
              const label = item.kind === 'video' ? 'Video' : `Media ${index + 1}`;
              throw new Error(`${label} upload failed. ${error?.message || 'Please try again.'}`);
            }
          }
        } catch (error: any) {
          throw new Error(error?.message || 'Failed to upload media');
        }
      }

      if (hasSingleVideoPost) {
        const videoUrl = mediaUrls[0];
        let coverUrl: string | undefined;
        if (coverImageFile) {
          coverUrl = await uploadImage(coverImageFile, 'posts', `user_${user.id}`);
        } else if (generatedCoverDataUrl) {
          const file = await dataUrlToFile(generatedCoverDataUrl, `cover_${Date.now()}.jpg`);
          coverUrl = await uploadImage(file, 'posts', `user_${user.id}`);
        }

        await createPost({
          user_id: user.id,
          content: finalContent,
          image_urls: coverUrl ? [coverUrl] : [],
          video_url: videoUrl,
          hashtags: [],
          posted_as_organizer: false
        });
      } else {
        await createPost({
          user_id: user.id,
          content: finalContent,
          image_urls: mediaUrls,
          hashtags: [],
          posted_as_organizer: false
        } as any);
      }

      toast.success('Post created successfully');
      window.dispatchEvent(new Event('postsUpdated'));
      navigate('/feed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || (!content.trim() && media.length === 0);

  return (
    <div className="min-h-screen bg-white flex flex-col z-[100] fixed inset-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 sticky top-0 bg-white z-10 border-b border-gray-100">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          type="button"
        >
          <X className="w-6 h-6 text-gray-900" />
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className={`px-6 py-1.5 rounded-full font-bold text-sm transition-all ${
            isButtonDisabled 
              ? 'bg-purple-300 text-white cursor-not-allowed' 
              : 'bg-[#8A2BE2] text-white hover:bg-[#7B27CC] active:scale-95 shadow-md shadow-purple-200'
          }`}
          type="button"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Posting...</span>
            </div>
          ) : (
            'Post'
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            <UserAvatar 
              src={userProfile?.avatar_url} 
              name={userProfile?.full_name} 
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
            
            <div className="flex-1 flex flex-col min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="What's happening?"
              className="w-full text-[17px] leading-relaxed text-gray-900 placeholder-gray-500 border-none p-0 resize-none min-h-[140px]"
            />

            {(locationTag.trim() || scheduledAt.trim()) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {locationTag.trim() && (
                  <button
                    type="button"
                    onClick={() => setLocationTag('')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors"
                    title="Remove location"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="max-w-[220px] truncate">{locationTag.trim()}</span>
                    <X className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
                {scheduledAt.trim() && (
                  <button
                    type="button"
                    onClick={() => setScheduledAt('')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors"
                    title="Remove schedule"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span className="max-w-[220px] truncate">{scheduledAt.trim()}</span>
                    <X className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </div>
            )}

            {hasSingleVideoPost && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">Thumbnail</div>
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                    type="button"
                  >
                    Upload cover
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 items-start">
                  <div className="rounded-xl overflow-hidden bg-white border border-gray-200 aspect-[4/5] flex items-center justify-center">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    ) : generatedCoverDataUrl ? (
                      <img src={generatedCoverDataUrl} alt="Generated cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-gray-500 font-medium">Generating…</div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-gray-700 mb-2">Pick a frame</div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, videoDuration || 0)}
                      step={0.1}
                      value={coverTime}
                      onChange={(e) => {
                        setCoverImageFile(null);
                        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                        setCoverPreviewUrl(null);
                        captureCoverFrame(Number(e.target.value));
                      }}
                      className="w-full"
                      disabled={!videoDuration}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      {videoDuration ? `${coverTime.toFixed(1)}s / ${videoDuration.toFixed(1)}s` : 'Loading video…'}
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverSelect}
                />

                <video ref={thumbVideoRef} src={media[0]?.url} className="hidden" preload="metadata" playsInline />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {/* Media Previews */}
            {media.length > 0 && (
              <div className="mt-4 mb-4">
                <div className={`grid gap-2 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {media.map((m, index) => (
                    <div
                      key={m.url}
                      className={`relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 group ${
                        media.length === 3 && index === 0 ? 'row-span-2' : 'aspect-square'
                      }`}
                    >
                      {m.kind === 'video' ? (
                        <video src={m.url} controls className="w-full h-full object-cover bg-black" />
                      ) : (
                        <img src={m.url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Bottom Tools */}
      <div className="border-t border-gray-100 px-4 py-3 sticky bottom-0 bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-[#8A2BE2] hover:bg-purple-50 rounded-full transition-colors"
            title="Media"
            type="button"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <button
            className="p-3 text-[#8A2BE2] hover:bg-purple-50 rounded-full transition-colors"
            title="Location"
            type="button"
            onClick={() => {
              setLocationDraft(locationTag);
              setShowLocationModal(true);
              setShowScheduleModal(false);
            }}
          >
            <MapPin className="w-6 h-6" />
          </button>
          <button
            className="p-3 text-[#8A2BE2] hover:bg-purple-50 rounded-full transition-colors"
            title="Schedule"
            type="button"
            onClick={() => {
              setScheduleDraft(scheduledAt);
              setShowScheduleModal(true);
              setShowLocationModal(false);
            }}
          >
            <Calendar className="w-6 h-6" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/mp4,video/webm,video/ogg"
          className="hidden"
          multiple
        />

        <div className="flex items-center gap-4">
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
            content.length > 280 ? 'border-red-500 text-red-500' : 'border-gray-200 text-gray-500'
          }`}>
            {280 - content.length}
          </div>
        </div>
      </div>
      </div>

      {showLocationModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowLocationModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-gray-900 font-bold">Add location</div>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setShowLocationModal(false)}
                type="button"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <input
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                placeholder="e.g. Dar es Salaam"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  onClick={() => setShowLocationModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  onClick={() => {
                    setLocationTag(locationDraft.trim());
                    setShowLocationModal(false);
                  }}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-gray-900 font-bold">Add schedule</div>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setShowScheduleModal(false)}
                type="button"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <input
                value={scheduleDraft}
                onChange={(e) => setScheduleDraft(e.target.value)}
                placeholder="e.g. 2026-03-11 20:00"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  onClick={() => setShowScheduleModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  onClick={() => {
                    setScheduledAt(scheduleDraft.trim());
                    setShowScheduleModal(false);
                  }}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
