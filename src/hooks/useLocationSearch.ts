import { useState, useEffect, useRef } from 'react';

export function useLocationSearch() {
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const locationSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLocationSearch) {
      setLocationSuggestions([]);
      setLocationQuery('');
      return;
    }
    const timer = setTimeout(async () => {
      if (!locationQuery.trim()) {
        setLocationSuggestions([]);
        return;
      }
      setLocationSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [locationQuery, showLocationSearch]);

  const handleOpenLocationSearch = () => {
    setShowLocationSearch(true);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const handleLocationSelect = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const parts = suggestion.display_name.split(',').map(s => s.trim());
    const label = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
    setLocationData({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon), label });
    setShowLocationSearch(false);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const handleRemoveLocation = () => {
    setLocationData(null);
  };

  return {
    locationData,
    showLocationSearch,
    locationQuery,
    locationSearching,
    locationSuggestions,
    locationSearchRef,
    setLocationQuery,
    setShowLocationSearch,
    handleOpenLocationSearch,
    handleLocationSelect,
    handleRemoveLocation,
  };
}
