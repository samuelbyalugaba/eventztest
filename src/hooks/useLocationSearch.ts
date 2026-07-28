import { useState, useEffect, useRef } from 'react';
import { searchNominatim } from '../utils/nominatim';

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
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!locationQuery.trim()) {
        setLocationSuggestions([]);
        return;
      }
      setLocationSearching(true);
      try {
        const data = await searchNominatim(locationQuery, { limit: 6, signal: controller.signal });
        setLocationSuggestions(data || []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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
