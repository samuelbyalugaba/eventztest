import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Share2, Bookmark, MoreHorizontal, Trash2, 
  MessageCircle, Calendar, MapPin, X, Heart, Volume2, VolumeX
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import verifiedBadge from '../assets/verified-badge.png';
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
import { useVisualViewport } from '../utils/useVisualViewport';
import { reportContent } from '../utils/supabase/api';
import { askForReportReason } from '../utils/moderation';

interface PostDetailPageProps {
  post: any;
  currentUser: any;
  userProfile?: any; // Kept for compatibility with App.tsx
  onBack: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: any, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  startTime?: number;
  initialMuted?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i.test(cleaned);
};

export function PostDetailPage({  
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
  startTime = 0,
  initialMuted = false
}: PostDetailPageProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number, name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { offsetTop, offsetBottom } = useVisualViewport();

  // Handle video initialization and transition
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleMetadata = () => {
        if (startTime > 0) {
          video.currentTime = startTime;
        }

        const dispatchPlaying = () => {
          window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
        };
        
        // Ensure it starts playing if it's supposed to
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            dispatchPlaying();
          }).catch(() => {
            if (!video.muted) {
              video.muted = true;
              setIsMuted(true);
              video.play().then(dispatchPlaying).catch(() => {});
            }
          });
        }
      };

      if (video.readyState >= 1) { // HAVE_METADATA
        handleMetadata();
      } else {
        video.addEventListener('loadedmetadata', handleMetadata, { once: true });
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [post.id, startTime]);

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

  return (
    <div
      className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in slide-in-from-right duration-300"
      style={{ paddingTop: 64 + offsetTop, paddingBottom: 96 + offsetBottom }}
    >
      {/* Unique Detail Header */}
      <div
        className="fixed left-0 right-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100"
        style={{ top: offsetTop }}
      >
        <div className="px-4 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => onShare(post, e)}
                className="p-2.5 bg-gray-100 hover:bg-cyan-100 text-gray-700 hover:text-cyan-600 rounded-xl transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => onSave(post.id, e)}
                className={`p-2.5 rounded-xl transition-all ${
                  post.isSaved
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-600'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-white' : ''}`} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  {isOwner ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setCaptionDraft(currentCaption || '');
                          setIsEditingCaption(true);
                        }}
                        className="cursor-pointer"
                      >
                        Edit caption
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                      onClick={() => {
                        onDelete(post.id);
                        onBack(); // Close modal after deleting
                      }} 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem 
                      onClick={handleReportPost}
                      className="cursor-pointer"
                    >
                      Report Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

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
                className="w-full min-h-[140px] p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                    if (!captionDraft.trim()) {
                      toast.error('Caption cannot be empty');
                      return;
                    }
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
        {/* Media Content (Carousel or Single) */}
        <div className="relative bg-black rounded-b-3xl overflow-hidden">
          {(() => {
            // Determine media items
            let mediaItems = post.content?.images || post.image_urls || [];
            let videoPoster: string | undefined;
            const highlightVideoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;
            
            // If single image string provided instead of array
            if (typeof mediaItems === 'string') mediaItems = [mediaItems];
            
            // Fallback to single image fields if array is empty
            if (mediaItems.length === 0) {
              if (post.content?.image) mediaItems = [post.content.image];
              else if (post.image) mediaItems = [post.image];
            }

            if (highlightVideoUrl) {
              const posterCandidate = (mediaItems as string[]).find((u: string) => u && !isVideo(u));
              videoPoster = posterCandidate;
              mediaItems = [highlightVideoUrl];
            }

            if (post.video_url) {
              const nonVideoItems = (mediaItems as string[]).filter((u: string) => u && !isVideo(u));
              const videoExists = (mediaItems as string[]).some((url: string) => url === post.video_url);
              if (!videoExists) {
                if ((mediaItems as string[]).length === 1 && nonVideoItems.length === 1) {
                  videoPoster = nonVideoItems[0];
                  mediaItems = [post.video_url];
                } else {
                  mediaItems = [post.video_url, ...(mediaItems as string[])];
                }
              } else if ((mediaItems as string[]).length === 2) {
                const onlyPoster = (mediaItems as string[]).filter((u: string) => u && !isVideo(u) && u !== post.video_url);
                if (onlyPoster.length === 1) {
                  videoPoster = onlyPoster[0];
                  mediaItems = [post.video_url];
                }
              }
            }

            // Also check highlights array if present
            if (mediaItems.length === 0 && post.highlights && post.highlights.length > 0) {
                 const highlight = post.highlights[0];
                 if (highlight.videoUrl) {
                    mediaItems = [highlight.videoUrl];
                 }
            }

            if (mediaItems.length === 0) return null;

            if (mediaItems.length === 1) {
              const media = mediaItems[0];
              const isMediaVideo = isVideo(media) || !!post.video_url || media === highlightVideoUrl;
              const posterToUse = media === highlightVideoUrl ? undefined : videoPoster;
              const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;

              return (
                <div
                  className="relative w-full bg-black overflow-hidden group mx-auto"
                  style={{
                    aspectRatio,
                    maxHeight: '70vh',
                    width: `min(100%, calc(70vh * ${aspectRatio}))`,
                  }}
                >
                   {isMediaVideo ? (
                      <>
                        <video 
                          ref={videoRef}
                          src={media} 
                          className="absolute inset-0 w-full h-full object-contain"
                          poster={posterToUse}
                          controls
                          playsInline
                          loop
                          preload="auto"
                          muted={isMuted}
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            if (v.videoWidth > 0 && v.videoHeight > 0) {
                              const next = v.videoWidth / v.videoHeight;
                              setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                          }}
                          className="absolute bottom-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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

            // Carousel Render
            return (
              <Carousel setApi={setApi} className="w-full group">
                <CarouselContent
                  className="transition-[height] duration-300"
                  style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}
                >
                  {mediaItems.map((media: string, index: number) => {
                    const isMediaVideo = isVideo(media);
                    const isActive = index === (current - 1);
                    const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;
                    
                    return (
                              <CarouselItem key={index} className="pl-0">
                                 <div
                                   data-media-frame="true"
                                   className="relative w-full bg-black overflow-hidden group mx-auto"
                                   style={{
                                     aspectRatio,
                                     maxHeight: '70vh',
                                     width: `min(100%, calc(70vh * ${aspectRatio}))`,
                                   }}
                                 >
                                   {isMediaVideo ? (
                                      <>
                                        <video 
                                          ref={isActive ? videoRef : null}
                                          src={media} 
                                          className="absolute inset-0 w-full h-full object-contain"
                                          controls
                                          playsInline
                                          loop
                                          preload="auto"
                                          muted={isMuted}
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
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setIsMuted(!isMuted);
                                           }}
                                           className="absolute bottom-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                                        >
                                           {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
                
                {/* Navigation */}
                <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                   <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
                   <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
                </div>

                {/* Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {mediaItems.map((_: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${
                        idx === (current - 1) ? 'bg-white w-4' : 'bg-white/50'
                      }`} 
                    />
                  ))}
                </div>
              </Carousel>
            );
          })()}
        </div>

        {/* User & Post Info */}
        <div className="p-5 space-y-4">
          {/* User Card */}
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

          {/* Post Content */}
          {post.content?.text && (
            <div className="text-gray-800 text-[15px] leading-relaxed">
              {post.content.text}
            </div>
          )}

          {/* Event Card - If Available */}
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

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 py-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => onLike(post.id, e)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  post.isLiked ? 'bg-pink-50 text-pink-600 scale-110' : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-pink-600' : ''}`} />
              </button>
              <div className="text-gray-900 font-bold text-sm">{(post.likes_count || post.likes || 0).toLocaleString()}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-gray-900 font-bold text-sm">{(post.comments?.length || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Comments Section - Mobile Native Style */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Header */}
          <div className="px-5 pt-4 pb-2 border-b border-gray-50">
            <h3 className="text-gray-900 font-bold text-base">
              Comments ({post.comments?.length || 0})
            </h3>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {!post.comments || post.comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">No comments yet</p>
              </div>
            ) : (
              (() => {
                // Group comments by parent_id
                const parentComments = post.comments.filter((c: any) => !c.parent_id);
                const replies = post.comments.filter((c: any) => c.parent_id);

                return parentComments.map((comment: any) => (
                  <div key={comment.id} className="space-y-4">
                    {/* Parent Comment */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleCommentProfileClick(comment, e)}
                        className="mt-1 h-8 w-8 flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        aria-label={`Open ${comment.user.name}'s profile`}
                      >
                        <UserAvatar
                          src={comment.user.avatar}
                          name={comment.user.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleCommentProfileClick(comment, e)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          >
                            {comment.user.name}
                            {comment.user.is_organizer && (
                              <img src={verifiedBadge} alt="Verified" className="w-3 h-3 select-none" loading="lazy" decoding="async" />
                            )}
                          </button>
                          <span className="text-gray-400 text-[10px]">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-snug">{comment.text}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button 
                            onClick={() => handleReply(comment)}
                            className="text-xs text-gray-400 font-medium hover:text-gray-600"
                          >
                            Reply
                          </button>
                          <button 
                            onClick={() => onLikeComment?.(comment.id)}
                            className={`text-xs font-medium hover:text-gray-600 ${comment.is_liked ? 'text-pink-600' : 'text-gray-400'}`}
                          >
                            Like {comment.likes_count > 0 && `(${comment.likes_count})`}
                          </button>
                          {String(comment.user?.id || comment.user_id) !== String(currentUser?.id || '') && (
                            <button
                              onClick={() => handleReportComment(comment)}
                              className="text-xs text-gray-400 font-medium hover:text-red-600"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.filter((r: any) => r.parent_id === comment.id).map((reply: any) => (
                      <div key={reply.id} className="flex gap-3 ml-11">
                        <button
                          type="button"
                          onClick={(e) => handleCommentProfileClick(reply, e)}
                          className="mt-1 h-6 w-6 flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          aria-label={`Open ${reply.user.name}'s profile`}
                        >
                          <UserAvatar
                            src={reply.user.avatar}
                            name={reply.user.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleCommentProfileClick(reply, e)}
                              className="flex items-center gap-1 text-[11px] font-bold text-gray-900 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            >
                              {reply.user.name}
                              {reply.user.is_organizer && (
                                <img src={verifiedBadge} alt="Verified" className="w-2.5 h-2.5 select-none" loading="lazy" decoding="async" />
                              )}
                            </button>
                            <span className="text-gray-400 text-[9px]">{reply.timestamp}</span>
                          </div>
                          <p className="text-gray-700 text-xs leading-snug">{reply.text}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <button 
                              onClick={() => handleReply(comment)} // Reply to parent for simple threading
                              className="text-[10px] text-gray-400 font-medium hover:text-gray-600"
                            >
                              Reply
                            </button>
                            <button 
                              onClick={() => onLikeComment?.(reply.id)}
                              className={`text-[10px] font-medium hover:text-gray-600 ${reply.is_liked ? 'text-pink-600' : 'text-gray-400'}`}
                            >
                              Like {reply.likes_count > 0 && `(${reply.likes_count})`}
                            </button>
                            {String(reply.user?.id || reply.user_id) !== String(currentUser?.id || '') && (
                              <button
                                onClick={() => handleReportComment(reply)}
                                className="text-[10px] text-gray-400 font-medium hover:text-red-600"
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
          <div className="flex items-end gap-3 bg-gray-50 rounded-3xl px-4 py-2">
            <UserAvatar
              src={currentUser?.user_metadata?.avatar_url || userProfile?.avatar_url}
              name={userProfile?.full_name || currentUser?.user_metadata?.full_name || userProfile?.username || "User"}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5"
            />
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              className="flex-1 bg-transparent border-none p-0 text-sm text-gray-900 placeholder-gray-400 focus:ring-0 resize-none min-h-[20px] max-h-[80px] py-1.5"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
              }}
            />
            <button
              onClick={handlePostComment}
              disabled={!commentText.trim()}
              className={`p-1.5 rounded-full transition-all mb-0.5 ${
                commentText.trim()
                  ? 'text-blue-500 hover:bg-blue-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="text-xs font-bold">Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
