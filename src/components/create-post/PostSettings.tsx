import { MapPin, Loader2 } from 'lucide-react';
import { C, GRADIENT, GRADIENT_FALLBACK } from './constants';

export function PostSettings({
  locationData,
  showLocationSearch,
  locationQuery,
  setLocationQuery,
  locationSearching,
  locationSuggestions,
  locationSearchRef,
  onRemoveLocation,
  onOpenLocationSearch,
  onLocationSelect,
  remaining,
  canPost,
  isPosting,
  onPost,
}: {
  locationData: { lat: number; lng: number; label: string } | null;
  showLocationSearch: boolean;
  locationQuery: string;
  setLocationQuery: (query: string) => void;
  locationSearching: boolean;
  locationSuggestions: Array<{ display_name: string; lat: string; lon: string }>;
  locationSearchRef: React.RefObject<HTMLDivElement>;
  onRemoveLocation: () => void;
  onOpenLocationSearch: () => void;
  onLocationSelect: (suggestion: { display_name: string; lat: string; lon: string }) => void;
  remaining: number;
  canPost: boolean;
  isPosting: boolean;
  onPost: () => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 16 }}>
      {locationData ? (
        <button
          onClick={onRemoveLocation}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10, maxWidth: '55%',
            border: '1px solid transparent',
            backgroundColor: GRADIENT_FALLBACK,
            backgroundImage: GRADIENT,
            color: '#0E0B1F',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s ease',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}
        >
          <MapPin size={14} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationData.label}</span>
          <span style={{ marginLeft: 4, opacity: 0.6 }}>✕</span>
        </button>
      ) : showLocationSearch ? (
        <div ref={locationSearchRef} style={{ position: 'relative', flex: 1, maxWidth: '60%' }}>
          <input
            autoFocus
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="Search location..."
            style={{
              width: '100%', border: `1px solid ${C.hairline}`, outline: 'none',
              background: C.glass, color: C.ink, fontSize: 13,
              padding: '8px 12px', borderRadius: 10, minHeight: 36,
            }}
          />
          {locationSearching && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '8px 12px', color: C.mute, fontSize: 12 }}>
              Searching...
            </div>
          )}
          {locationSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#1C1733', border: `1px solid ${C.hairline}`,
              borderRadius: 12, overflow: 'hidden', zIndex: 10,
              boxShadow: '0 12px 30px -10px rgba(0,0,0,0.6)',
            }}>
              {locationSuggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => onLocationSelect(s)}
                  style={{
                    padding: '10px 14px', fontSize: 13, color: C.ink,
                    cursor: 'pointer',
                    borderBottom: i < locationSuggestions.length - 1 ? `1px solid ${C.hairline}` : undefined,
                  }}
                >
                  {s.display_name.split(',').slice(0, 3).join(',')}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onOpenLocationSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10, maxWidth: '55%',
            border: `1px solid ${C.hairline}`,
            background: C.glass, color: C.mute,
            fontSize: 13, fontWeight: 400,
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
        >
          <MapPin size={14} style={{ flexShrink: 0 }} />
          <span>Add location</span>
        </button>
      )}

      <span style={{
        marginLeft: 'auto', fontSize: 13, fontWeight: 600,
        color: remaining < 0 ? '#FF6B6B' : C.mute,
      }}>
        {remaining < 24 ? `${remaining} LEFT` : ''}
      </span>

      <button
        disabled={!canPost || isPosting}
        onClick={onPost}
        style={{
          fontWeight: 700, fontSize: 14, flexShrink: 0,
          padding: '11px 24px', borderRadius: 100, border: 'none',
          cursor: canPost && !isPosting ? 'pointer' : 'default',
          color: canPost && !isPosting ? '#0E0B1F' : C.mute,
          background: canPost && !isPosting ? undefined : 'rgba(255,255,255,0.08)',
          backgroundColor: canPost && !isPosting ? GRADIENT_FALLBACK : undefined,
          backgroundImage: canPost && !isPosting ? GRADIENT : undefined,
          boxShadow: canPost && !isPosting ? '0 6px 22px -4px rgba(110,79,224,0.6)' : 'none',
          transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {isPosting ? <Loader2 size={16} style={{ animation: 'camSpin 1s linear infinite' }} /> : null}
        {isPosting ? 'Posting...' : 'Post'}
      </button>
    </div>
  );
}
