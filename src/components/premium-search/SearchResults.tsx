import { type ReactNode } from 'react';
import { MapPin, Search } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { UserAvatar } from '../UserAvatar';
import { EventSearchRow, SearchRowSkeleton } from './SearchRow';
import type { Profile } from '../../utils/supabase/api';

type VenueResult = { id: string; name: string; subtitle?: string; lat?: string; lon?: string };
type SearchCategory = 'all' | 'events' | 'venues' | 'people';

function ResultSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-2 pt-4">
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <span className="text-xs font-medium text-gray-500">{count} found</span>
      </div>
      {children}
    </section>
  );
}

interface SearchResultsProps {
  searchCategory: SearchCategory;
  filteredEvents: any[];
  onSelectEvent: (event: any) => void;
  peopleResults: Profile[];
  onSelectPerson: (person: any) => void;
  venueResults: VenueResult[];
  onSelectVenue: (venue: VenueResult) => void;
  isSearching: boolean;
  showEmptyState: boolean;
}

export function SearchResults({
  searchCategory,
  filteredEvents,
  onSelectEvent,
  peopleResults,
  onSelectPerson,
  venueResults,
  onSelectVenue,
  isSearching,
  showEmptyState,
}: SearchResultsProps) {
  return (
    <div>
      {(searchCategory === 'all' || searchCategory === 'events') && filteredEvents.length > 0 && (
        <ResultSection title="Events" count={filteredEvents.length}>
          {filteredEvents.map((event: any) => (
            <EventSearchRow key={event.id} event={event} onClick={() => onSelectEvent(event)} />
          ))}
        </ResultSection>
      )}

      {(searchCategory === 'all' || searchCategory === 'people') && peopleResults.length > 0 && (
        <ResultSection title="People" count={peopleResults.length}>
          {peopleResults.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelectPerson(person)}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <UserAvatar
                src={person.avatar_url}
                name={person.full_name || person.username || 'User'}
                className="h-11 w-11"
                verified={person.verified}
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-950">{person.full_name || person.username}</h3>
                <p className="truncate text-xs text-gray-500">
                  {person.is_organizer ? person.organizer_type || 'Organizer' : 'User'}
                  {person.location ? ` - ${person.location}` : ''}
                </p>
              </div>
            </button>
          ))}
        </ResultSection>
      )}

      {(searchCategory === 'all' || searchCategory === 'venues') && venueResults.length > 0 && (
        <ResultSection title="Venues" count={venueResults.length}>
          {venueResults.map((venue) => (
            <button
              key={venue.id}
              type="button"
              onClick={() => onSelectVenue(venue)}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-950">{venue.name}</h3>
                {venue.subtitle && <p className="truncate text-xs text-gray-500">{venue.subtitle}</p>}
              </div>
            </button>
          ))}
        </ResultSection>
      )}

      {isSearching && <SearchRowSkeleton />}

      {showEmptyState && (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try another event, venue, or person."
        />
      )}
    </div>
  );
}
