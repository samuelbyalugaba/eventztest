import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  Share2, Bookmark, MoreHorizontal, Trash2,
  MessageCircle, Calendar, MapPin, X, Heart, Volume2, VolumeX, Maximize, Play, Send
} from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import verifiedBadge from '../assets/verified-badge.png';
import { CommentIcon } from './icons/CommentIcon';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { reportContent } from '../utils/supabase/api';
import { askForReportReason } from '../utils/moderation';
import { isVideoMedia } from '../utils/media';
import { useFullscreen } from '../hooks/useFullscreen';

interface PostDetailViewProps {
  post: any;
  currentUser: any;
  userProfile?: any;
  onBack: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: any, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  renderHeader?: (props: { onShare: (e: React.MouseEvent) => void; onSave: (e: React.MouseEvent) => void; isOwner: boolean; onEditCaptionOpen: () => void; onDeletePost: () => void; onReport: () => void }) => ReactNode;
  renderUserBadge?: () => ReactNode;
  renderCommentInput?: (props: { commentText: string; onCommentTextChange: (text: string) => void; replyingTo: { id: number; name: string } | null; onCancelReply: () => void; onPostComment: () => void }) => ReactNode;
  videoProps?: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isVideoPaused: boolean;
    onPlaybackToggle: (e?: React.MouseEvent) => void;
    onFullscreen: (video: HTMLVideoElement | null) => void;
  };
  startTime?: number;
  initialMuted?: boolean;
  offsetTop?: number;
  offsetBottom?: number;
}

export function PostDetailView({
  post,
  currentUser,
  userProfile,
  onBack,
  onLike,
  onSave,
  onShare,
  onDelete,
  onEditCaption,
  onProfileClick,
  onComment,
  onLikeComment,
  renderHeader,
  renderUserBadge,
  renderCommentInput,
  videoProps,
  startTime: _startTime = 0,
  initialMuted = false,
  offsetTop = 0,
  offsetBottom = 0,
}: PostDetailViewProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const instanceId = useRef(`pv-${Math.random().toString(36).slice(2, 8)}`);
  const enterFullscreen = useFullscreen();

  const updateCarouselHeight = useCallback(() => {
    if (!api) return;
    const index = api.selectedScrollSnap();
    const slide = api.slideNodes()[index] as HTMLElement | undefined;
    const frame = slide?.querySelector('[data-media-frame="true"]') as HTMLElement | null;
    if (!frame) return;
    const next = Math.ceil(frame.getBoundingClientRect().height);
    if (next > 0) setCarouselHeight((prev) => (prev === next ? prev : next));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1);
      requestAnimationFrame(updateCarouselHeight);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, updateCarouselHeight]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        if (
          document.fullscreenElement === v ||
          (document as any).webkitFullscreenElement === v ||
          (document as any).msFullscreenElement === v
        ) {
          v.controls = true;
        } else {
          v.controls = false;
        }
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    const finalText = replyingTo ? `@${replyingTo.name} ${commentText}` : commentText;
    onComment(post.id, finalText, replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  };

  const handleReply = (comment: any) => {
    setReplyingTo({ id: comment.id, name: comment.user.name });
    textareaRef.current?.focus();
  };

  const handleReportPost = async () => {
    if (!currentUser) {
      toast.error('Please sign in to report content');
      return;
    }
    const reason = askForReportReason('this post');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'post',
        contentId: post.id,
        reason,
        reportedUserId: post.user?.id || post.user_id,
      });
      toast.success('Report submitted');
      onBack();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const handleReportComment = async (comment: any) => {
    if (!currentUser) {
      toast.error('Please sign in to report content');
      return;
    }
    const reason = askForReportReason('this comment');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'comment',
        contentId: comment.id,
        reason,
        details: comment.text,
        reportedUserId: comment.user?.id || comment.user_id,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const handleCommentProfileClick = (comment: any, e: React.MouseEvent) => {
    const user = comment.user;
    const userId = user?.id || comment.user_id;
    if (!userId || userId === 'unknown') return;

    onProfileClick({
      id: userId,
      name: user?.name || 'User',
      username: user?.username || '',
      avatar: user?.avatar || '',
      verified: !!user?.verified,
      isOrganizer: !!(user?.isOrganizer || user?.is_organizer),
    }, e);
  };

  const isOwner = currentUser && (
    String(currentUser.id) === String(post.user?.id) ||
    String(currentUser.id) === String(post.user_id)
  );

  const currentCaption = post?.content?.text ?? post?.content ?? '';

  const defaultHeader = () => (
    <div
      className="fixed left-0 right-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100"
      style={{ top: offsetTop, paddingTop: 'var(--eventz-safe-area-top)' }}
    >
      <div className="px-4 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onBack}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onShare(post, e)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-cyan-100 hover:text-cyan-600"
              aria-label="Share post"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => onSave(post.id, e)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl p-0 transition-all ${post.isSaved ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-600'}`}
              aria-label={post.isSaved ? 'Unsave post' : 'Save post'}
            >
              <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-white' : ''}`} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-gray-200" aria-label="More post actions">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                {isOwner ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => { setCaptionDraft(currentCaption || ''); setIsEditingCaption(true); }}
                      className="cursor-pointer"
                    >
                      Edit caption
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { onDelete(post.id); onBack(); }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleReportPost} className="cursor-pointer">
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );

  const defaultCommentInput = () => (
    <div className="flex items-end gap-2.5 rounded-[1.45rem] border border-gray-200 bg-gray-50 px-3 py-2.5 transition-all focus-within:border-gray-300 focus-within:bg-white">
      <UserAvatar
        src={userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
        name={userProfile?.full_name || currentUser?.user_metadata?.full_name || userProfile?.username || "User"}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
      <textarea
        ref={textareaRef}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add a comment..."
        rows={1}
        className="min-h-[20px] max-h-[110px] flex-1 resize-none border-none bg-transparent p-0 py-1.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:ring-0"
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }}
      />
      <button
        onClick={handlePostComment}
        disabled={!commentText.trim()}
        aria-label="Post comment"
        className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all ${commentText.trim() ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95' : 'cursor-not-allowed bg-transparent text-gray-300'}`}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in slide-in-from-right duration-300"
      style={{
        paddingTop: `calc(4rem + ${offsetTop}px + var(--eventz-safe-area-top))`,
        paddingBottom: `calc(6rem + ${offsetBottom}px + var(--eventz-safe-area-bottom))`,
      }}
    >
      {renderHeader ? renderHeader({
        onShare: (e) => onShare(post, e),
        onSave: (e) => onSave(post.id, e),
        isOwner,
        onEditCaptionOpen: () => { setCaptionDraft(currentCaption || ''); setIsEditingCaption(true); },
        onDeletePost: () => { onDelete(post.id); onBack(); },
        onReport: handleReportPost,
      }) : defaultHeader()}

      {isEditingCaption && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => !isSavingCaption && setIsEditingCaption(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-gray-900 font-bold">Edit caption</div>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => !isSavingCaption && setIsEditingCaption(false)}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                className="w-full min-h-[140px] p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400/20"
                disabled={isSavingCaption}
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  onClick={() => !isSavingCaption && setIsEditingCaption(false)}
                  disabled={isSavingCaption}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-xl font-bold text-white transition-colors ${isSavingCaption ? 'bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'}`}
                  onClick={async () => {
                    if (!onEditCaption) return;
                    if (!captionDraft.trim()) { toast.error('Caption cannot be empty'); return; }
                    try {
                      setIsSavingCaption(true);
                      await onEditCaption(post.id, captionDraft);
                      toast.success('Caption updated');
                      setIsEditingCaption(false);
                    } catch (e) {
                      toast.error('Failed to update caption');
                    } finally {
                      setIsSavingCaption(false);
                    }
                  }}
                  disabled={isSavingCaption}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Media Content */}
        <div className="relative bg-black rounded-b-3xl overflow-hidden">
          {renderUserBadge?.()}
          {(() => {
            let mediaItems = post.content?.images || post.image_urls || [];
            let videoPoster: string | undefined;
            const highlightVideoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;

            if (typeof mediaItems === 'string') mediaItems = [mediaItems];

            if (mediaItems.length === 0) {
              if (post.content?.image) mediaItems = [post.content.image];
              else if (post.image) mediaItems = [post.image];
            }

            if (highlightVideoUrl) {
              const posterCandidate = (mediaItems as string[]).find((u: string) => u && !isVideoMedia(u));
              videoPoster = posterCandidate || post.highlights?.[0]?.thumbnail;
              mediaItems = [highlightVideoUrl];
            }

            if (post.video_url) {
              const nonVideoItems = (mediaItems as string[]).filter((u: string) => u && !isVideoMedia(u));
              const videoExists = (mediaItems as string[]).some((url: string) => url === post.video_url);
              if (!videoExists) {
                if ((mediaItems as string[]).length === 1 && nonVideoItems.length === 1) {
                  videoPoster = nonVideoItems[0];
                  mediaItems = [post.video_url];
                } else {
                  mediaItems = [post.video_url, ...(mediaItems as string[])];
                }
              } else if ((mediaItems as string[]).length === 2) {
                const onlyPoster = (mediaItems as string[]).filter((u: string) => u && !isVideoMedia(u) && u !== post.video_url);
                if (onlyPoster.length === 1) {
                  videoPoster = onlyPoster[0];
                  mediaItems = [post.video_url];
                }
              }
            }

            if (mediaItems.length === 0 && post.highlights && post.highlights.length > 0) {
              const highlight = post.highlights[0];
              if (highlight.videoUrl) mediaItems = [highlight.videoUrl];
            }

            if (mediaItems.length === 0) return null;

            if (mediaItems.length === 1) {
              const media = mediaItems[0];
              const isMediaVideo = isVideoMedia(media) || !!post.video_url || media === highlightVideoUrl;
              const posterToUse = videoPoster;
              const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;

              return (
                <div
                  className="relative w-full bg-black overflow-hidden group mx-auto"
                  style={{ aspectRatio, maxHeight: '70vh', width: `min(100%, calc(70vh * ${aspectRatio}))` }}
                >
                  {isMediaVideo ? (
                    <>
                      <video
                        id={`video-${instanceId.current}-${post.id}`}
                        ref={(videoProps?.videoRef ?? localVideoRef) as React.Ref<HTMLVideoElement>}
                        src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                        className="absolute inset-0 w-full h-full object-contain"
                        poster={posterToUse}
                        controls={false}
                        playsInline
                        loop
                        preload="metadata"
                        muted={isMuted}
                        disablePictureInPicture
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        onClick={videoProps?.onPlaybackToggle || ((e) => { e.preventDefault(); e.stopPropagation(); })}
                        onPlay={() => {
                          window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
                        }}
                        onPause={() => {}}
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          if (v.videoWidth > 0 && v.videoHeight > 0) {
                            const next = v.videoWidth / v.videoHeight;
                            setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                          }
                        }}
                      />
                      {(videoProps?.isVideoPaused ?? false) && (
                        <button
                          type="button"
                          onClick={videoProps?.onPlaybackToggle}
                          className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 text-white"
                          aria-label="Play video"
                        >
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/45 pl-1 backdrop-blur-sm">
                            <Play className="h-7 w-7 fill-current" />
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoProps) {
                            videoProps.onFullscreen(videoProps.videoRef?.current ?? null);
                          } else {
                            const videoEl = localVideoRef.current;
                            if (videoEl) {
                              void enterFullscreen(videoEl).then((didEnter) => {
                                if (didEnter) videoEl.controls = true;
                              });
                            }
                          }
                        }}
                        className="absolute bottom-4 left-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Open video fullscreen"
                      >
                        <Maximize className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="absolute bottom-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </button>
                    </>
                  ) : (
                    <ImageWithFallback
                      src={media}
                      alt="Post detail"
                      className="absolute inset-0 w-full h-full object-contain"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                          const next = img.naturalWidth / img.naturalHeight;
                          setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                        }
                      }}
                    />
                  )}
                </div>
              );
            }

            return (
              <Carousel setApi={setApi} className="w-full group">
                <CarouselContent
                  className="transition-[height] duration-300"
                  style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}
                >
                  {mediaItems.map((media: string, index: number) => {
                    const isMediaVideo = isVideoMedia(media) || media === post.video_url || (post.highlights && post.highlights.some((h: any) => h.videoUrl === media));
                    const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;

                    return (
                      <CarouselItem key={index} className="pl-0">
                        <div
                          data-media-frame="true"
                          className="relative w-full bg-black overflow-hidden group mx-auto"
                          style={{ aspectRatio, maxHeight: '70vh', width: `min(100%, calc(70vh * ${aspectRatio}))` }}
                        >
                          {isMediaVideo ? (
                            <>
                              <video
                                id={`video-${instanceId.current}-${post.id}-${index}`}
                                src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                                className="absolute inset-0 w-full h-full object-contain"
                                controls={false}
                                playsInline
                                loop
                                preload="metadata"
                                muted={isMuted}
                                disablePictureInPicture
                                controlsList="nodownload noplaybackrate noremoteplayback"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onPlay={() => {
                                  window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
                                }}
                                onLoadedMetadata={(e) => {
                                  const v = e.currentTarget;
                                  if (v.videoWidth > 0 && v.videoHeight > 0) {
                                    const next = v.videoWidth / v.videoHeight;
                                    setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                                  }
                                  requestAnimationFrame(updateCarouselHeight);
                                }}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                className="absolute bottom-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                              >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const videoEl = document.getElementById(`video-${instanceId.current}-${post.id}-${index}`) as HTMLVideoElement;
                                  if (videoEl) {
                                    void enterFullscreen(videoEl).then((didEnter) => {
                                      if (didEnter) videoEl.controls = true;
                                    });
                                  }
                                }}
                                className="absolute bottom-4 left-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                              >
                                <Maximize className="w-5 h-5 text-white" />
                              </button>
                            </>
                          ) : (
                            <ImageWithFallback
                              src={media}
                              alt={`Slide ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-contain"
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                  const next = img.naturalWidth / img.naturalHeight;
                                  setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                                }
                                requestAnimationFrame(updateCarouselHeight);
                              }}
                            />
                          )}
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                  <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
                  <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {mediaItems.map((_: any, idx: number) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === (current - 1) ? 'bg-white w-4' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </Carousel>
            );
          })()}
        </div>

        {/* User & Post Info */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={post.user.avatar}
              name={post.user.name}
              className="w-14 h-14 rounded-full object-cover cursor-pointer flex-shrink-0"
              onClick={(e) => onProfileClick(post.user, e)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1 min-w-0">
                <span
                  className="text-gray-900 font-bold cursor-pointer hover:text-purple-600 transition-colors truncate min-w-0"
                  onClick={(e) => onProfileClick(post.user, e)}
                >
                  {post.user.name}
                </span>
                {(post.user.isOrganizer || post.user.verified) && (
                  <img src={verifiedBadge} alt="Verified" className="w-4 h-4 flex-shrink-0 select-none" loading="lazy" decoding="async" />
                )}
              </div>
              <span className="text-gray-500 text-sm">{post.timestamp || 'Just now'}</span>
            </div>
          </div>

          {post.content?.text && (
            <div className="text-gray-800 text-sm leading-relaxed">
              {post.content.text}
            </div>
          )}

          {post.event && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-lg mb-2">{post.event.name || post.event.title}</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{post.event.date}</span>
                      {post.event.time && <span className="text-gray-500">• {post.event.time}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span>{post.event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="feed-post-actions !px-0 !py-2">
            <button
              onClick={(e) => onLike(post.id, e)}
              className={`feed-action-btn feed-like-btn ${post.isLiked ? 'feed-action-liked' : ''}`}
            >
              <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
              <span>{(post.likes_count || post.likes || 0).toLocaleString()}</span>
            </button>
            <button
              onClick={() => textareaRef.current?.focus()}
              className="feed-action-btn"
            >
              <CommentIcon className="h-[1.05rem] w-[1.05rem] overflow-visible" color="currentColor" />
              <span>{(post.comments_count || post.comments?.length || 0).toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="px-5 pt-4 pb-2 border-b border-gray-50">
            <h3 className="text-gray-900 font-bold text-base">
              Comments ({(post.comments_count || post.comments?.length || 0).toLocaleString()})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!post.comments || post.comments.length === 0 ? (
              <EmptyState icon={MessageCircle} title="No comments yet" />
            ) : (
              (() => {
                const parentComments = post.comments.filter((c: any) => !c.parent_id);
                const replies = post.comments.filter((c: any) => c.parent_id);

                return parentComments.map((comment: any) => (
                  <div key={comment.id} className="mb-4 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleCommentProfileClick(comment, e)}
                        className="h-9 w-9 flex-shrink-0 rounded-full text-left focus:outline-none"
                        aria-label={`Open ${comment.user.name}'s profile`}
                      >
                        <UserAvatar
                          src={comment.user.avatar}
                          name={comment.user.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      </button>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs leading-[18px] text-gray-900">
                          <button
                            type="button"
                            onClick={(e) => handleCommentProfileClick(comment, e)}
                            className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                          >
                            {comment.user.name}
                            {(comment.user.is_organizer || comment.user.isOrganizer || comment.user.verified) && (
                              <img src={verifiedBadge} alt="Verified" className="h-3.5 w-3.5 select-none" loading="lazy" decoding="async" />
                            )}
                          </button>
                          {comment.text}
                        </p>
                        <div className="mt-0.5 flex h-4 items-center gap-4">
                          <span className="text-xs font-semibold leading-none text-gray-400">{comment.timestamp}</span>
                          <button
                            onClick={() => handleReply(comment)}
                            className="comment-inline-button text-xs font-semibold leading-none text-gray-500 transition-colors hover:text-gray-800"
                          >
                            Reply
                          </button>
                          {String(comment.user?.id || comment.user_id) !== String(currentUser?.id || '') && (
                            <button
                              onClick={() => handleReportComment(comment)}
                              className="comment-inline-button text-xs font-semibold leading-none text-gray-500 transition-colors hover:text-red-600"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onLikeComment?.(comment.id)}
                        className={`comment-icon-button mt-1 flex flex-shrink-0 items-center justify-center rounded-full transition-colors ${comment.is_liked ? 'text-pink-600' : 'text-gray-400 hover:text-gray-700'}`}
                        aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
                      >
                        <Heart className={`h-4 w-4 ${comment.is_liked ? 'fill-pink-600' : ''}`} />
                      </button>
                    </div>

                    {replies.filter((r: any) => r.parent_id === comment.id).map((reply: any) => (
                      <div key={reply.id} className="ml-12 flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => handleCommentProfileClick(reply, e)}
                          className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full text-left focus:outline-none"
                          aria-label={`Open ${reply.user.name}'s profile`}
                        >
                          <UserAvatar
                            src={reply.user.avatar}
                            name={reply.user.name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        </button>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-xs leading-[18px] text-gray-900">
                            <button
                              type="button"
                              onClick={(e) => handleCommentProfileClick(reply, e)}
                              className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                            >
                              {reply.user.name}
                              {(reply.user.is_organizer || reply.user.isOrganizer || reply.user.verified) && (
                                <img src={verifiedBadge} alt="Verified" className="h-3 w-3 select-none" loading="lazy" decoding="async" />
                              )}
                            </button>
                            {reply.text}
                          </p>
                          <div className="mt-0.5 flex h-4 items-center gap-4">
                            <span className="text-2xs font-semibold leading-none text-gray-400">{reply.timestamp}</span>
                            <button
                              onClick={() => handleReply(comment)}
                              className="comment-inline-button text-2xs font-semibold leading-none text-gray-500 transition-colors hover:text-gray-800"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => onLikeComment?.(reply.id)}
                              className={`comment-inline-button text-2xs font-semibold leading-none transition-colors ${reply.is_liked ? 'text-pink-600' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                              Like{reply.likes_count > 0 ? ` (${reply.likes_count})` : ''}
                            </button>
                            {String(reply.user?.id || reply.user_id) !== String(currentUser?.id || '') && (
                              <button
                                onClick={() => handleReportComment(reply)}
                                className="comment-inline-button text-2xs font-semibold leading-none text-gray-500 transition-colors hover:text-red-600"
                              >
                                Report
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      </div>

      <div
        className="fixed left-0 right-0 z-20 border-t border-gray-100 bg-white"
        style={{ bottom: offsetBottom }}
      >
        <div className="max-w-2xl mx-auto p-3">
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-2 mb-2 bg-gray-50 rounded-lg text-xs">
              <span className="text-gray-500">Replying to <span className="font-semibold text-gray-900">{replyingTo.name}</span></span>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          )}
          {renderCommentInput ? renderCommentInput({
            commentText,
            onCommentTextChange: setCommentText,
            replyingTo,
            onCancelReply: () => setReplyingTo(null),
            onPostComment: handlePostComment,
          }) : defaultCommentInput()}
        </div>
      </div>
    </div>
  );
}
