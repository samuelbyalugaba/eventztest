import { type ReactNode } from 'react';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../queryKeys';
import { clearRecentEvents } from '../../utils/recentEvents';
import { EventSearchRow, SearchRowSkeleton } from './SearchRow';

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-2 pt-4">
      <h2 className="text-lg font-bold text-gray-950">{title}</h2>
      {action}
    </div>
  );
}

interface SearchHomeProps {
  recentEvent: any;
  onSelectEvent: (event: any) => void;
  trendingEvents: any[];
  isLoadingTrending: boolean;
  recentEventIds: string[];
  recentSearches: string[];
  onClearRecent: () => void;
  onClose: () => void;
}

export function SearchHome({
  recentEvent,
  onSelectEvent,
  trendingEvents,
  isLoadingTrending,
  recentEventIds,
  recentSearches,
  onClearRecent,
  onClose,
}: SearchHomeProps) {
  return (
    <div>
      <SectionHeader
        title="Recent"
        action={recentEventIds.length > 0 || recentSearches.length > 0 ? (
          <button
            type="button"
            onClick={onClearRecent}
            className="text-sm font-semibold text-purple-700"
          >
            Clear
          </button>
        ) : null}
      />

      {recentEvent ? (
        <EventSearchRow event={recentEvent} onClick={() => onSelectEvent(recentEvent)} />
      ) : (
        <SearchRowSkeleton />
      )}

      <SectionHeader title="Trending" />
      {trendingEvents.length > 0 ? (
        trendingEvents.map((event, index) => (
          <EventSearchRow
            key={`trend-event-${event.id || event.title}-${index}`}
            event={event}
            rank={index + 1}
            onClick={() => onSelectEvent(event)}
          />
        ))
      ) : (
        Array.from({ length: isLoadingTrending ? 5 : 3 }).map((_, index) => (
          <SearchRowSkeleton key={`trend-skeleton-${index}`} rank={index + 1} />
        ))
      )}

      <button
        type="button"
        onClick={() => {
          onClose();
          queryClient.invalidateQueries({ queryKey: queryKeys.events.root });
        }}
        className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-4 text-sm font-semibold text-purple-700 transition-colors hover:bg-gray-50"
      >
        Explore more events
      </button>
    </div>
  );
}
