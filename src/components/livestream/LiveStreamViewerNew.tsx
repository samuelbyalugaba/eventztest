import { useState, useCallback } from 'react';
import { useIsMobile } from '../ui/use-mobile';
import { ViewerHeader } from './ViewerHeader';
import { FloatingChat } from './FloatingChat';
import { SidebarChat } from './SidebarChat';
import { ViewerActionBar } from './ViewerActionBar';
import { GiftPicker } from './GiftPicker';
import { GiftBannerOverlay } from './GiftBannerOverlay';
import { HeartAnimations } from './HeartAnimations';
import type { LiveStreamData } from './types';
import { VideoPlayer } from './VideoPlayer';
import { useViewerConnection } from '../../hooks/useViewerConnection';
import { useViewerChat } from '../../hooks/useViewerChat';
import { useViewerInteractions } from '../../hooks/useViewerInteractions';

interface LiveStreamViewerProps {
  stream: LiveStreamData;
  onClose: () => void;
  isUnlockedOverride?: boolean;
}

export function LiveStreamViewerNew({ stream, onClose }: LiveStreamViewerProps) {
  const isMobile = useIsMobile();
  const [isChatVisible, setIsChatVisible] = useState(true);

  const {
    isMuted,
    setIsMuted,
    videoError,
    setVideoError,
    isHlsMode,
    remoteUsers,
    hasMedia,
    hlsVideoRef,
    cloudflareIframeRef,
    useIframePlayer,
    fitMode,
    isRotated,
  } = useViewerConnection(stream);

  const {
    isLiked,
    isFollowingHost,
    viewerCount,
    hearts,
    showGiftPicker,
    setShowGiftPicker,
    isSendingGift,
    currentUserId,
    handleLike,
    handleFollow,
    handleGift,
    handleShare,
  } = useViewerInteractions(stream);

  const {
    messages,
    message,
    setMessage,
    handleSendMessage,
    handleReportStreamMessage,
    giftBanners,
  } = useViewerChat(stream, currentUserId);

  const handleRetry = useCallback(() => {
    setVideoError(null);
    window.location.reload();
  }, [setVideoError]);

  // ─── DESKTOP LAYOUT ─────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex">
        {/* Video area */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative" onDoubleClick={handleLike}>
            <VideoPlayer
              stream={stream}
              isHlsMode={isHlsMode}
              useIframePlayer={useIframePlayer}
              fitMode={fitMode}
              isRotated={isRotated}
              isMuted={isMuted}
              remoteUsers={remoteUsers}
              hasMedia={hasMedia}
              videoError={videoError}
              hlsVideoRef={hlsVideoRef}
              cloudflareIframeRef={cloudflareIframeRef}
              onRetry={handleRetry}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />

            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+var(--eventz-safe-area-top))]">
              <ViewerHeader
                host={stream.host}
                hostAvatar={stream.host_avatar}
                isLive={true}
                viewerCount={viewerCount}
                isFollowing={isFollowingHost}
                onFollow={handleFollow}
                onClose={onClose}
              />
            </div>

            <div className="absolute left-4 top-20">
              <GiftBannerOverlay banners={giftBanners} />
            </div>

            <HeartAnimations hearts={hearts} />
          </div>

          <div className="p-3 bg-[#0f0f0f] border-t border-white/10">
            <ViewerActionBar
              message={message}
              onMessageChange={setMessage}
              onSendMessage={handleSendMessage}
              onShare={handleShare}
              onLike={handleLike}
              onGift={() => setShowGiftPicker(true)}
              onMuteToggle={() => setIsMuted((m: boolean) => !m)}
              onToggleChat={() => setIsChatVisible((v: boolean) => !v)}
              isLiked={isLiked}
              isMuted={isMuted}
              isChatVisible={isChatVisible}
              isDesktop={true}
            />
          </div>
        </div>

        {/* Sidebar chat — YouTube style */}
        {isChatVisible && (
          <div className="w-[340px] flex-shrink-0">
            <SidebarChat
              messages={messages}
              message={message}
              onMessageChange={setMessage}
              onSendMessage={handleSendMessage}
              onReportMessage={handleReportStreamMessage}
              viewerCount={viewerCount}
            />
          </div>
        )}

        <GiftPicker isOpen={showGiftPicker} onClose={() => setShowGiftPicker(false)} onSendGift={handleGift} isSending={isSendingGift} />
      </div>
    );
  }

  // ─── MOBILE LAYOUT ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black h-[100dvh] overflow-hidden overscroll-none">
      <div className="absolute inset-0 h-full" onDoubleClick={handleLike}>
        <VideoPlayer
          stream={stream}
          isHlsMode={isHlsMode}
          useIframePlayer={useIframePlayer}
          fitMode={fitMode}
          isRotated={isRotated}
          isMuted={isMuted}
          remoteUsers={remoteUsers}
          hasMedia={hasMedia}
          videoError={videoError}
          hlsVideoRef={hlsVideoRef}
          cloudflareIframeRef={cloudflareIframeRef}
          onRetry={handleRetry}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60" />

      {/* Fixed header overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 pt-[calc(0.75rem+var(--eventz-safe-area-top))] pointer-events-none">
        <div className="pointer-events-auto">
          <ViewerHeader
            host={stream.host}
            hostAvatar={stream.host_avatar}
            isLive={true}
            viewerCount={viewerCount}
            isFollowing={isFollowingHost}
            onFollow={handleFollow}
            onClose={onClose}
          />
        </div>
      </div>

      <GiftBannerOverlay banners={giftBanners} />

      {/* Floating chat overlay above the action bar (mobile) */}
      {isChatVisible && (
        <div className="absolute left-3 bottom-20 w-[min(82vw,20rem)] pointer-events-none">
          <div className="pointer-events-auto">
            <FloatingChat messages={messages} maxVisible={4} onReportMessage={handleReportStreamMessage} />
          </div>
        </div>
      )}

      {/* Fixed bottom overlay - always at bottom, never pushes video */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+var(--eventz-safe-area-bottom))]">
        <ViewerActionBar
            message={message}
            onMessageChange={setMessage}
            onSendMessage={handleSendMessage}
            onShare={handleShare}
            onLike={handleLike}
            onGift={() => setShowGiftPicker(true)}
            onMuteToggle={() => setIsMuted((m: boolean) => !m)}
            onToggleChat={() => setIsChatVisible((v: boolean) => !v)}
            isLiked={isLiked}
            isMuted={isMuted}
            isChatVisible={isChatVisible}
            isDesktop={false}
          />
      </div>

      <HeartAnimations hearts={hearts} />
      <GiftPicker isOpen={showGiftPicker} onClose={() => setShowGiftPicker(false)} onSendGift={handleGift} isSending={isSendingGift} />
    </div>
  );
}
