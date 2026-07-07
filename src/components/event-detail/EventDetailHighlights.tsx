import { Play } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { validateYouTubeUrl, getYouTubeVideoId } from '../../utils/sanitize';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailHighlightsProps {
  event: ApiEvent;
  onOpenMedia: (highlightIdx: number, mediaType: 'photo' | 'video', videoIndex: number, photoIndex: number) => void;
}

export function EventDetailHighlights({ event, onOpenMedia }: EventDetailHighlightsProps) {
  if (!event.event_highlights || event.event_highlights.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-gray-900 mb-3">Event Photos & Highlights</h2>
      <div className="grid grid-cols-3 gap-2">
        {event.event_highlights.map((highlight, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              const videoIndex = event.event_highlights!.filter(h => h.mediaType === 'video').findIndex(h => h === highlight);
              const photoIndex = event.event_highlights!.filter(h => h.mediaType === 'image').findIndex(h => h === highlight);
              onOpenMedia(idx, highlight.mediaType === 'image' ? 'photo' : 'video', videoIndex, photoIndex);
            }}
          >
            {highlight.mediaType === 'video' ? (
              <>
                {validateYouTubeUrl(highlight.video || '') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(highlight.video || '')}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    style={{ border: 'none', pointerEvents: 'none' }}
                  />
                ) : (
                  <>
                    <video src={highlight.video} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:bg-white transition-colors">
                        <Play className="w-3 h-3 text-gray-900 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <ImageWithFallback
                src={highlight.image!}
                alt={highlight.caption}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
