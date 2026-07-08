import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export const getViews = (event: any) => Number(event?.views || event?.view_count || 0);
export const getEventImage = (event: any) =>
  event?.image_url || event?.cover_image || event?.coverImage || event?.image || event?.thumbnail_url || event?.thumbnail;
export const hasEventImage = (event: any) => Boolean(getEventImage(event));
export const formatViews = (views: number) =>
  views >= 1000 ? `${(views / 1000).toFixed(1)}k views` : `${views || 0} views`;

export function EventSearchRow({ event, rank, onClick }: { event: any; rank?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
    >
      {rank && <span className="w-5 shrink-0 text-center text-sm font-semibold text-gray-500">{rank}</span>}
      <ImageWithFallback
        src={getEventImage(event)}
        alt={event.title || 'Event'}
        className="h-14 w-16 shrink-0 rounded-lg object-cover"
        displayWidth={128}
        displayHeight={112}
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-950">{event.title || 'Untitled event'}</h3>
        <p className="mt-1 truncate text-xs text-gray-500">
          {event.category || 'Event'} - {formatViews(getViews(event))}
        </p>
      </div>
    </button>
  );
}

export function SearchRowSkeleton({ rank }: { rank?: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      {rank && <span className="w-5 shrink-0 text-center text-sm font-semibold text-gray-300">{rank}</span>}
      <Skeleton className="h-14 w-16 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
