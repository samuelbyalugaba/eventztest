import { User, Camera, AtSign, MapPin, Search, ChevronDown, Check, Mail, Phone, Calendar, Save, Loader2 } from 'lucide-react';
import { CREATOR_CATEGORIES } from '../../utils/categories';

export interface ProfileData {
  username: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  birthdate: string;
  avatarUrl: string;
  location: string;
  category: string;
}

interface ProfileSettingsFormProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
  isCreatorProfile: boolean;
  categorySearch: string;
  setCategorySearch: React.Dispatch<React.SetStateAction<string>>;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  categoryRef: React.RefObject<HTMLDivElement>;
  locationSuggestions: any[];
  setLocationSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
  loadingLocations: boolean;
  showLocationDropdown: boolean;
  setShowLocationDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  locationRef: React.RefObject<HTMLDivElement>;
  searchLocations: (query: string) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarClick: () => void;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSaveProfile: () => Promise<void>;
}

export function ProfileSettingsForm({
  profileData,
  setProfileData,
  isCreatorProfile,
  categorySearch,
  setCategorySearch,
  showCategoryDropdown,
  setShowCategoryDropdown,
  categoryRef,
  locationSuggestions,
  setLocationSuggestions,
  loadingLocations,
  showLocationDropdown,
  setShowLocationDropdown,
  locationRef,
  searchLocations,
  fileInputRef,
  handleAvatarClick,
  handleAvatarChange,
  handleSaveProfile,
}: ProfileSettingsFormProps) {
  const filteredCategories = CREATOR_CATEGORIES.filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto space-y-8 pb-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative h-16 w-16 rounded-full overflow-visible"
            aria-label="Change profile photo"
          >
            <div className="absolute inset-0 rounded-full overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt={profileData.name} className="h-full w-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1 h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center ring-2 ring-white shadow-sm">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{profileData.name || 'Your profile'}</p>
            <p className="text-xs text-gray-500">Upload a square photo for best results</p>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef as React.Ref<HTMLInputElement>}
          onChange={handleAvatarChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Username</label>
          <div className="relative">
            <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
              className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
              placeholder="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
              placeholder="Your name"
            />
          </div>
        </div>

        {isCreatorProfile && (
          <>
            <div className="space-y-2" ref={categoryRef as React.RefObject<HTMLDivElement>}>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                    if (profileData.category && e.target.value !== profileData.category) {
                      setProfileData(prev => ({ ...prev, category: '' }));
                    }
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Select category"
                  className="w-full h-11 pl-11 pr-10 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
                />
                <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />

                {showCategoryDropdown && (
                  <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-hide py-1 animate-in fade-in zoom-in duration-200">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setProfileData(prev => ({ ...prev, category: c }));
                            setCategorySearch(c);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${profileData.category === c ? 'text-purple-700 bg-purple-50' : 'text-gray-700'}`}
                        >
                          {c}
                          {profileData.category === c && <Check className="w-4 h-4" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No categories found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2" ref={locationRef as React.RefObject<HTMLDivElement>}>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => {
                    setProfileData({ ...profileData, location: e.target.value });
                    searchLocations(e.target.value);
                  }}
                  onFocus={() => profileData.location.length >= 3 && setShowLocationDropdown(true)}
                  placeholder="City, Country"
                  className="w-full h-11 pl-11 pr-10 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
                />
                {loadingLocations && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 animate-spin" />
                )}

                {showLocationDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in duration-200">
                    {locationSuggestions.map((loc, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setProfileData(prev => ({ ...prev, location: loc.display_name }));
                          setShowLocationDropdown(false);
                          setLocationSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
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
          </>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
              placeholder="your.email@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition"
              placeholder="+255 712 345 678"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Date of Birth</label>
          <div className="flex items-center gap-3 w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-gray-900 transition">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={profileData.birthdate}
              onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
              className="flex-1 min-w-0 h-full bg-transparent border-0 p-0 text-gray-900 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            placeholder="Tell your story..."
            rows={4}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition resize-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSaveProfile}
          className="w-full h-11 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>Save Changes</span>
          <Save className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
