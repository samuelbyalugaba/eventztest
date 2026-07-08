import { Search, X } from 'lucide-react';

type SearchCategory = 'all' | 'events' | 'venues' | 'people';

const categories: { id: SearchCategory; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'events', name: 'Events' },
  { id: 'venues', name: 'Venues' },
  { id: 'people', name: 'People' },
];

interface SearchHeaderProps {
  searchQuery: string;
  searchCategory: SearchCategory;
  onSearchQueryChange: (query: string) => void;
  onSearchCategoryChange: (category: SearchCategory) => void;
  onClose: () => void;
}

export function SearchHeader({
  searchQuery,
  searchCategory,
  onSearchQueryChange,
  onSearchCategoryChange,
  onClose,
}: SearchHeaderProps) {
  return (
    <div className="shrink-0 border-b border-gray-100 bg-white pt-[calc(0.75rem+var(--eventz-safe-area-top))]">
      <div className="flex items-center gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-800 transition-colors hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            aria-label="Search events, venues, people"
            placeholder="Search events, venues, people..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            autoFocus
            className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-950 shadow-none outline-none transition-colors placeholder:text-gray-500 focus:border-gray-200 focus:bg-gray-50 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-gray-200 focus-visible:outline-none focus-visible:ring-0"
            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
          />
        </div>
      </div>

      <div className="grid h-11 grid-cols-4">
        {categories.map((category) => {
          const active = searchCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSearchCategoryChange(category.id)}
              className={`relative flex items-center justify-center text-sm font-semibold transition-colors ${
                active ? 'text-gray-950' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {category.name}
              {active && <span className="absolute bottom-0 h-1 w-10 rounded-full bg-purple-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
