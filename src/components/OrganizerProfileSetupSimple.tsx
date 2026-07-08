import { useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, AtSign, User, Search, ChevronDown, Loader2, X } from 'lucide-react';
import { BackButton } from './ui/BackButton';
import { toast } from 'sonner';
import { supabase, getProfile, uploadImage, checkUsernameUnique, becomeOrganizer } from '../utils/supabase/api';
import { searchNominatim } from '../utils/nominatim';
import { CREATOR_CATEGORIES } from '../utils/categories';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import creatorBadge from '../assets/verified-badge.png';

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
  const popularCreatorCategories = [
    { label: 'Event Organizer', value: 'Event Organizer' },
    { label: 'DJ', value: 'DJ' },
    { label: 'Artist', value: 'Artist' },
    { label: 'Promoter', value: 'Promoter' },
    { label: 'Night Club', value: 'Nightclub' },
  ];

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
    } catch (error) {
      console.error('Failed to upload photo:', error);
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
    if (!organizerName || !username || !category) {
      toast.error('Please fill in all required fields', {
        description: 'Name, username, and category are required',
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
        location: location.trim(),
        bio: bio,
        avatar_url: avatarUrl,
        contact_email: user.email || undefined
      });

      toast.success('Your Creator profile is ready');
      
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
      
      onComplete();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save profile');
    }
  };
 
  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-5 pb-2.5 pt-[calc(0.625rem+var(--eventz-safe-area-top))] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <BackButton
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-900"
            />
          )}
          <div>
            <h1 className="text-base font-semibold text-gray-900">Set up your creator profile</h1>
            <p className="text-[0.7rem] leading-4 text-gray-500 font-medium">Go live, host events & grow your audience</p>
          </div>
        </div>
        <div className="w-10 h-10 flex items-center justify-center">
          <img src={creatorBadge} alt="Creator badge" className="w-8 h-8 object-contain" />
        </div>
      </div>

      <div className="flex-1 px-6 pt-5 pb-28 max-w-lg mx-auto w-full">
        {/* Category First */}
        <section className="mb-8" ref={categoryRef}>
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
                setCategorySearch(e.target.value);
                setShowCategoryDropdown(true);
                if (category && e.target.value !== category) setCategory('');
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              placeholder="e.g. Event Organizer, DJ, Artist, Promoter"
              className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all"
            />
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />

            {showCategoryDropdown && (
              <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-1.5 animate-in fade-in zoom-in duration-200">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(c);
                        setCategorySearch(c);
                        setShowCategoryDropdown(false);
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
                    setCategory(item.value);
                    setCategorySearch(item.value);
                    setShowCategoryDropdown(false);
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

        {/* Form Fields - Mobile Native Look */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Profile details</h2>

          <button
            type="button"
            onClick={onUploadClick}
            className="w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-left active:bg-gray-100 transition-colors"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Creator" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Profile photo</p>
              <p className="text-xs text-gray-500 mt-0.5">Add or change photo</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Camera className="w-4 h-4" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-900 ml-1">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. The Night Club"
                className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-900 ml-1">Username</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  setAvailable(null);
                }}
                onBlur={checkHandle}
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

          {/* Location Search */}
          <div className="space-y-2" ref={locationRef}>
            <label className="text-xs font-semibold text-gray-900 ml-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  searchLocations(e.target.value);
                }}
                onFocus={() => location.length >= 3 && setShowLocationDropdown(true)}
                placeholder="City, Country"
                className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 font-medium outline-none transition-all"
              />
              {loadingLocations && (
                <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 animate-spin" />
              )}
              
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1.5 animate-in fade-in zoom-in duration-200">
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
            <label className="text-xs font-semibold text-gray-900 ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your story..."
              rows={4}
              className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-400/10 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium outline-none transition-all resize-none"
            />
          </div>
        </section>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-bottom z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onSubmit}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Complete Setup</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
