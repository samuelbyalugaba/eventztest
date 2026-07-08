import { AtSign, Loader2, Check, X, MapPin } from 'lucide-react';

interface ProfileFormFieldsProps {
  organizerName: string;
  onOrganizerNameChange: (name: string) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  checking: boolean;
  available: boolean | null;
  location: string;
  onLocationChange: (location: string) => void;
  showLocationDropdown: boolean;
  locationSuggestions: any[];
  loadingLocations: boolean;
  onLocationSelect: (displayName: string) => void;
  bio: string;
  onBioChange: (bio: string) => void;
}

export function ProfileFormFields({
  organizerName,
  onOrganizerNameChange,
  username,
  onUsernameChange,
  checking,
  available,
  location,
  onLocationChange,
  showLocationDropdown,
  locationSuggestions,
  loadingLocations,
  onLocationSelect,
  bio,
  onBioChange,
}: ProfileFormFieldsProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold text-gray-900">Profile details</h2>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-900 ml-1">Display Name</label>
        <div className="relative">
          <input
            type="text"
            value={organizerName}
            onChange={(e) => onOrganizerNameChange(e.target.value)}
            placeholder="e.g. The Night Club"
            className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-900 ml-1">Username</label>
        <div className="relative">
          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            placeholder="username"
            className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 font-medium outline-none transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking ? (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            ) : available === true ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : available === false ? (
              <X className="w-5 h-5 text-red-500" />
            ) : null}
          </div>
        </div>
        {available === false && (
          <p className="text-xs text-red-500 ml-1 font-medium">Username is already taken</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-900 ml-1">Location</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            onFocus={() => {}}
            placeholder="City, Country"
            className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 font-medium outline-none transition-all"
          />
          {loadingLocations && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 animate-spin" />
          )}
          {showLocationDropdown && locationSuggestions.length > 0 && (
            <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1.5 animate-in fade-in zoom-in duration-200">
              {locationSuggestions.map((loc: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => onLocationSelect(loc.display_name)}
                  className="w-full text-left px-5 py-3.5 text-sm text-gray-600 hover:bg-purple-50 transition-colors font-medium border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2">{loc.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-900 ml-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder="Tell your story..."
          rows={4}
          className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all resize-none"
        />
      </div>
    </section>
  );
}
