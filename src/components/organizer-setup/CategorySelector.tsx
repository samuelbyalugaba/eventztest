import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { CREATOR_CATEGORIES } from '../../utils/categories';

interface CategorySelectorProps {
  category: string;
  categorySearch: string;
  onCategoryChange: (category: string) => void;
  onCategorySearchChange: (search: string) => void;
}

const popularCreatorCategories = [
  { label: 'Event Organizer', value: 'Event Organizer' },
  { label: 'DJ', value: 'DJ' },
  { label: 'Artist', value: 'Artist' },
  { label: 'Promoter', value: 'Promoter' },
  { label: 'Night Club', value: 'Nightclub' },
];

export function CategorySelector({
  category,
  categorySearch,
  onCategoryChange,
  onCategorySearchChange,
}: CategorySelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = CREATOR_CATEGORIES.filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <section className="mb-8" ref={ref}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1.5">What best describes you?</h2>
      <p className="text-sm leading-5 text-gray-500 mb-4">
        Search or pick a category.
      </p>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => {
            onCategorySearchChange(e.target.value);
            setShowDropdown(true);
            if (category && e.target.value !== category) onCategoryChange('');
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="e.g. Event Organizer, DJ, Artist, Promoter"
          className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 focus:border-gray-300 focus:bg-white rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all"
        />
        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />

        {showDropdown && (
          <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-1.5 animate-in fade-in zoom-in duration-200">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onCategoryChange(c);
                    onCategorySearchChange(c);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${category === c ? 'text-purple-600 font-semibold bg-purple-50/50' : 'text-gray-600 font-medium'}`}
                >
                  {c}
                  {category === c && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              <div className="px-5 py-4 text-sm text-gray-400 text-center italic">No categories found</div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[0.66rem] font-semibold tracking-[0.18em] text-gray-500 uppercase mb-2.5">Popular on EVENTZ</p>
        <div className="flex flex-wrap gap-1.5">
          {popularCreatorCategories.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onCategoryChange(item.value);
                onCategorySearchChange(item.value);
                setShowDropdown(false);
              }}
              className={`min-h-7 px-3 py-1.5 rounded-full border text-[0.75rem] font-medium transition-colors ${
                category === item.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
