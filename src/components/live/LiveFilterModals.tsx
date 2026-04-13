import { Search, MapPin } from 'lucide-react';
import type { LocationOption } from '../../utils/locations';

interface FilterModalsProps {
  showFilters: boolean;
  showLocationFilter: boolean;
  selectedCategory: string;
  selectedLocation: string;
  locationSearch: string;
  categories: { id: string; name: string }[];
  displayedLocations: LocationOption[];
  onCategorySelect: (id: string) => void;
  onLocationSelect: (id: string) => void;
  onLocationSearchChange: (value: string) => void;
  onCloseFilters: () => void;
  onCloseLocation: () => void;
}

export function LiveFilterModals({
  showFilters,
  showLocationFilter,
  selectedCategory,
  selectedLocation,
  locationSearch,
  categories,
  displayedLocations,
  onCategorySelect,
  onLocationSelect,
  onLocationSearchChange,
  onCloseFilters,
  onCloseLocation,
}: FilterModalsProps) {
  return (
    <>
      {showFilters && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCloseFilters}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-5 pb-8">
              <h2 className="text-gray-900 text-lg mb-5">Filter by category</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl transition-all ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLocationFilter && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCloseLocation}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h2 className="text-gray-900 text-lg">Filter by location</h2>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => onLocationSearchChange(e.target.value)}
                  placeholder="Search location..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {displayedLocations.length > 0 ? (
                  displayedLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => onLocationSelect(location.id)}
                      className={`w-full text-left px-5 py-3.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedLocation === location.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {location.icon ? (
                        <location.icon className={`w-6 h-6 ${selectedLocation === location.id ? 'text-white' : 'text-gray-700'}`} />
                      ) : (
                        <span className="text-2xl">{location.flag}</span>
                      )}
                      <span>{location.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No locations found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
