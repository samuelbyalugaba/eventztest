import { useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, AtSign, User, Search, ChevronDown, Loader2, X, Star, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getProfile, uploadImage, checkUsernameUnique, becomeOrganizer } from '../utils/supabase/api';
import { searchNominatim } from '../utils/nominatim';
import { CREATOR_CATEGORIES } from '../utils/categories';

interface OrganizerProfileSetupProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function OrganizerProfileSetup({ onComplete, onBack }: OrganizerProfileSetupProps) {
  const [organizerName, setOrganizerName] = useState('');
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = CREATOR_CATEGORIES.filter(c => 
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    setLoadingLocations(true);
    try {
      const data = await searchNominatim(query, { limit: 10 });
      setLocationSuggestions(data);
      setShowLocationDropdown(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load location suggestions');
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (location && !showLocationDropdown && location !== organizerName) {
        // Only search if user is actually typing
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const p = await getProfile(user.id);
      
      if (p) {
        setOrganizerName(p.full_name || '');
        setUsername(p.username || '');
        setCategory(p.organizer_type || '');
        setCategorySearch(p.organizer_type || '');
        setLocation(p.location || '');
        setBio(p.bio || '');
        setAvatarUrl(p.avatar_url || '');
        if (p.username) setAvailable(true);
      }
    };
    init();
  }, []);
 
  const onUploadClick = () => fileInputRef.current?.click();
 
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sign in to upload photo');
      return;
    }
    try {
      const url = await uploadImage(e.target.files[0], 'avatars', `organizers/${user.id}`);
      setAvatarUrl(url);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };
 
  const checkHandle = async () => {
    if (!username) return;
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ok = await checkUsernameUnique(username, user?.id);
      setAvailable(ok);
    } finally {
      setChecking(false);
    }
  };
 
  const onSubmit = async () => {
    if (!organizerName || !username || !category || !location) {
      toast.error('Please fill in all required fields', {
        description: 'Name, username, category, and location are required',
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    try {
      const ok = await checkUsernameUnique(username, user.id);
      if (!ok) {
        toast.error('Username not available');
        return;
      }

      // Use RPC to become organizer (bypasses RLS restriction on is_organizer column)
      await becomeOrganizer({
        full_name: organizerName,
        username: username,
        organizer_type: category,
        location: location,
        bio: bio,
        avatar_url: avatarUrl,
        contact_email: user.email || undefined
      });

      toast.success('Your Creator profile is ready! 🎉');
      
      // Dispatch event to refresh profile across the app
      window.dispatchEvent(new Event('profileUpdated'));
      
      onComplete();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error?.message || 'Failed to save profile');
    }
  };
 
  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Creator Profile</h1>
            <p className="text-xs text-gray-500 font-medium">Setup your public profile</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
          <Star className="w-5 h-5 fill-current" />
        </div>
      </div>

      <div className="flex-1 px-6 pt-8 pb-32 max-w-lg mx-auto w-full">
        {/* Avatar Section - Modern & Minimal */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group cursor-pointer" onClick={onUploadClick}>
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-50 border-4 border-white shadow-xl shadow-purple-100 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Creator" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-300" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg border-4 border-white transform transition-transform group-hover:scale-110">
              <Camera className="w-4 h-4" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500">Tap to upload photo</p>
        </div>

        {/* Form Fields - Mobile Native Look */}
        <div className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. The Night Club"
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 placeholder-gray-400 font-medium outline-none transition-all"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Username</label>
            <div className="relative">
              <AtSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  setAvailable(null);
                }}
                onBlur={checkHandle}
                placeholder="username"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all"
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

          {/* Category Dropdown */}
          <div className="space-y-2" ref={categoryRef}>
            <label className="text-sm font-semibold text-gray-900 ml-1">Category</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setShowCategoryDropdown(true);
                  if (category && e.target.value !== category) setCategory('');
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Select category"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all"
              />
              <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              
              {showCategoryDropdown && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in duration-200">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          setCategorySearch(c);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-5 py-3.5 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${category === c ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-gray-600 font-medium'}`}
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
          </div>

          {/* Location Search */}
          <div className="space-y-2" ref={locationRef}>
            <label className="text-sm font-semibold text-gray-900 ml-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  searchLocations(e.target.value);
                }}
                onFocus={() => location.length >= 3 && setShowLocationDropdown(true)}
                placeholder="City, Country"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all"
              />
              {loadingLocations && (
                <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 animate-spin" />
              )}
              
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto py-2 animate-in fade-in zoom-in duration-200">
                  {locationSuggestions.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLocation(loc.display_name);
                        setShowLocationDropdown(false);
                        setLocationSuggestions([]);
                      }}
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

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your story..."
              rows={4}
              className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 placeholder-gray-400 font-medium outline-none transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-bottom z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onSubmit}
            className="w-full bg-[#8A2BE2] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Complete Setup</span>
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
