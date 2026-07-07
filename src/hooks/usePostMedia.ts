import { useState, useCallback, useMemo, useEffect } from 'react';
import { Post } from '../types';
import { isVideoMedia } from '../utils/media';

interface DisplayProfile {
  name: string;
  username: string;
  avatar: string;
  id: string;
  verified: boolean;
  isOrganizer?: boolean;
  isOrganizerPage?: boolean;
}

export function usePostMedia(
  post: Post,
  carouselIndex: number,
  updateCarouselHeight: () => void
) {
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});

  const normalizedImages = useMemo(
    () =>
      (post.content.images ?? [])
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
        .map((url) => url.trim()),
    [post.content.images]
  );

  const fallbackImage =
    typeof post.content.image === 'string' && post.content.image.trim().length > 0
      ? post.content.image.trim()
      : undefined;

  const mediaItems = useMemo(
    () =>
      normalizedImages.length > 0
        ? normalizedImages
        : fallbackImage
          ? [fallbackImage]
          : [],
    [normalizedImages, fallbackImage]
  );

  const videoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;
  const hasMedia = Boolean(videoUrl || mediaItems.length > 0);
  const isCarousel = !videoUrl && mediaItems.length > 1;
  const firstCarouselMedia = mediaItems[0];
  const currentMedia = videoUrl || mediaItems[carouselIndex] || mediaItems[0];
  const isCurrentMediaVideo = !!videoUrl || isVideoMedia(currentMedia);
  const videoPoster = post.isHighlight
    ? post.highlights?.[0]?.thumbnail ||
      mediaItems.find((u) => !!u && !isVideoMedia(u))
    : mediaItems.find((u) => !!u && !isVideoMedia(u));
  const currentVideoSrc = currentMedia
    ? `${currentMedia}${currentMedia.includes('#') ? '' : '#t=0.1'}`
    : undefined;

  const getMediaFrameStyle = useCallback(
    (media?: string): React.CSSProperties => {
      const referenceMedia = isCarousel ? firstCarouselMedia : media;
      const ratio = referenceMedia ? mediaAspectRatios[referenceMedia] : undefined;
      return { aspectRatio: ratio && Number.isFinite(ratio) ? String(ratio) : '4 / 5' };
    },
    [firstCarouselMedia, isCarousel, mediaAspectRatios]
  );

  const displayProfile: DisplayProfile = {
    name: post.user.name || post.user.username || 'User',
    username: post.user.username || '',
    avatar: post.user.avatar,
    id: post.user.id || post.user_id,
    verified: !!post.user.verified,
    isOrganizer: post.user.isOrganizer || post.user.isOrganizerPage,
    isOrganizerPage: post.user.isOrganizerPage,
  };

  const postOwnerId = displayProfile.id || post.user_id;

  useEffect(() => {
    requestAnimationFrame(updateCarouselHeight);
  }, [mediaAspectRatios, updateCarouselHeight]);

  return {
    mediaAspectRatios,
    setMediaAspectRatios,
    mediaItems,
    videoUrl,
    hasMedia,
    isCarousel,
    firstCarouselMedia,
    currentMedia,
    isCurrentMediaVideo,
    videoPoster,
    currentVideoSrc,
    getMediaFrameStyle,
    displayProfile,
    postOwnerId,
  };
}
