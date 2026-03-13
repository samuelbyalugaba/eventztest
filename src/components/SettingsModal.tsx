import { X, User, Shield, HelpCircle, ChevronRight, Mail, Phone, MapPin, Camera, Save, Check, MessageCircle, Heart, AtSign, Calendar, Search, ChevronDown, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase, getProfile, updateProfile, checkUsernameUnique, uploadImage } from '../utils/supabase/api';
import { Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription } from "./ui/sheet";

type SettingsView = 'main' | 'profile' | 'privacy' | 'help';

interface SettingsModalProps {
  onClose: () => void;
  onLogout: () => Promise<void>;
  initialView?: SettingsView;
}

export function SettingsModal({ onClose, onLogout, initialView = 'main' }: SettingsModalProps) {
  const [currentView, setCurrentView] = useState<SettingsView>(initialView);
  const [isOpen, setIsOpen] = useState(true);

  // Helper to handle closing via sheet
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(onClose, 300); // Give time for animation
    }
  };
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    bio: '',
    birthdate: '',
    avatarUrl: '',
    location: '',
    category: '',
  });

  const [isCreatorProfile, setIsCreatorProfile] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const CREATOR_CATEGORIES = [
    'Art Gallery', 'Artist', 'Bar', 'Band', 'Blogger', 'Book Store', 'Brand',
    'Broadcasting & Media Production Company',
    'Business', 'Cafe', 'Charity', 'Church', 'Club', 'Coach', 'Comedy Club',
    'Community', 'Concert Venue', 'Conference', 'Content Creator', 'Corporate',
    'DJ', 'Dance Studio', 'Digital Creator', 'Education', 'Entrepreneur',
    'Entertainment',
    'Event Curator',
    'Event Organizer',
    'Event Planner', 'Exhibition', 'Fashion', 'Festival', 'Fitness Trainer',
    'Government', 'Gym', 'Health/Beauty', 'Hotel', 'Influencer', 'Library',
    'Lounge', 'Media', 'Mosque', 'Museum', 'Music Venue', 'Musician',
    'Networking Group', 'Nightclub', 'Non-Profit', 'Organization', 'Park',
    'Party Planner', 'Performing Arts', 'Personal Blog', 'Photographer',
    'Podcast', 'Promoter', 'Public Figure', 'Radio Station',
    'Religious Organization', 'Resort', 'Restaurant', 'Retail', 'School',
    'Shopping', 'Social Club', 'Speaker', 'Sports Team', 'Startup',
    'Sports Event',
    'Student Organization', 'Synagogue', 'Tech Community', 'Theater',
    'University', 'Venue', 'Video Creator', 'Wedding Planner', 'Workshop',
    'Writer', 'Yoga Studio', 'Youth Organization'
  ].sort();

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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setLocationSuggestions(data);
      setShowLocationDropdown(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load location suggestions');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update your profile photo');
        return;
      }

      // Use user-specific path to separate from organizer photos
      const publicUrl = await uploadImage(file, 'avatars', `users/${user.id}`);

      setProfileData(prev => ({ ...prev, avatarUrl: publicUrl }));
      await updateProfile(user.id, { avatar_url: publicUrl });
      toast.success('Profile photo updated successfully');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fields: ['avatar_url'] } }));
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Error uploading avatar');
    }
  };



  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showFollowers: true,
    showStats: true,
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showActivity: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          if (profile) {
            setIsCreatorProfile(!!profile.is_organizer);
            // Profile Data Migration
            const localProfile = localStorage.getItem('eventz-user-profile');
            let profileUpdates: any = {};
            let hasUpdates = false;

            if (localProfile && !profile.full_name && !profile.phone) {
              // Assume if name and phone are missing, we might want to migrate
              const parsed = JSON.parse(localProfile);
              setProfileData(parsed);
              profileUpdates = {
                full_name: parsed.name,
                contact_email: parsed.email,
                phone: parsed.phone,
                location: parsed.location,
                bio: parsed.bio
              };
              hasUpdates = true;
              localStorage.removeItem('eventz-user-profile');
            } else {
              setProfileData({
                username: profile.username || '',
                name: profile.full_name || '',
                email: profile.contact_email || user.email || '',
                phone: profile.phone || '',
                bio: profile.bio || '',
                birthdate: profile.birthdate || '',
                avatarUrl: profile.avatar_url || '',
                location: profile.location || '',
                category: profile.organizer_type || '',
              });
              setCategorySearch(profile.organizer_type || '');
              if (localProfile) localStorage.removeItem('eventz-user-profile');
            }

            // Privacy Settings Migration
            const localPrivacy = localStorage.getItem('eventz-privacy');
            if (profile.privacy_settings) {
              setPrivacy(prev => ({
                ...prev,
                profileVisibility: profile.privacy_settings?.profileVisibility || prev.profileVisibility,
                showEmail: profile.privacy_settings?.showEmail ?? prev.showEmail,
                showPhone: profile.privacy_settings?.showPhone ?? prev.showPhone,
                allowMessages: profile.privacy_settings?.allowMessages ?? prev.allowMessages,
                showActivity: profile.privacy_settings?.showActivity ?? prev.showActivity,
              }));
              if (localPrivacy) localStorage.removeItem('eventz-privacy');
            } else if (localPrivacy) {
              const parsed = JSON.parse(localPrivacy);
              setPrivacy(parsed);
              profileUpdates.privacy_settings = parsed;
              hasUpdates = true;
              localStorage.removeItem('eventz-privacy');
            }

            // Notification Settings Migration removed


            // Apply any migration updates
            if (hasUpdates) {
              await updateProfile(user.id, profileUpdates);
            }
          }
        } else {
          // Fallback to localStorage
          const storedProfile = localStorage.getItem('eventz-user-profile');
          if (storedProfile) setProfileData(JSON.parse(storedProfile));
          


          const storedPrivacy = localStorage.getItem('eventz-privacy');
          if (storedPrivacy) setPrivacy(JSON.parse(storedPrivacy));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();

    // Listen for auth changes to reload settings
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSettings();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if username changed and is unique
        const currentProfile = await getProfile(user.id);
        if (profileData.username !== currentProfile?.username) {
          const isUnique = await checkUsernameUnique(profileData.username, user.id);
          if (!isUnique) {
            toast.error('Username already taken');
            return;
          }
        }

        const nextEmail = (profileData.email || '').trim();
        if (nextEmail && nextEmail !== user.email) {
          const { error: authUpdateError } = await supabase.auth.updateUser({ email: nextEmail });
          if (authUpdateError) throw authUpdateError;
          toast.info('Email change requested. Please check your inbox to confirm.');
        }

        await updateProfile(user.id, {
          username: profileData.username,
          full_name: profileData.name,
          phone: profileData.phone,
          bio: profileData.bio,
          birthdate: profileData.birthdate,
          avatar_url: profileData.avatarUrl,
          ...(isCreatorProfile ? { location: profileData.location, organizer_type: profileData.category } : {}),
        });
      } else {
        localStorage.setItem('eventz-user-profile', JSON.stringify(profileData));
      }
      toast.success('Profile updated successfully! ✅');
      setCurrentView('main');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fields: ['username','full_name','phone','bio','birthdate','avatar_url', ...(isCreatorProfile ? ['location','organizer_type'] : [])] } }));
    } catch (error) {
      console.error('Error saving profile:', error);
      const message = (error as any)?.message || (error as any)?.error_description || (error as any)?.details || 'Failed to save profile';
      toast.error(message);
    }
  };

  // Notifications settings removed as per unused warning


  const handleSavePrivacy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        const currentSettings = profile?.privacy_settings || {};

        await updateProfile(user.id, {
          privacy_settings: {
            ...currentSettings,
            ...privacy,
            // Ensure required fields
            showFollowers: currentSettings.showFollowers ?? true,
            showStats: currentSettings.showStats ?? true,
          }
        });
      } else {
        localStorage.setItem('eventz-privacy', JSON.stringify(privacy));
      }
      toast.success('Privacy settings updated! 🔒');
      setCurrentView('main');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fields: ['privacy_settings'] } }));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[100vw] sm:w-[450px] p-0 overflow-y-auto bg-white border-l border-gray-100">
        <SheetTitle className="sr-only">Settings</SheetTitle>
        <SheetDescription className="sr-only">
          Manage your profile, privacy settings, and view help options.
        </SheetDescription>
        <div className="flex flex-col h-full bg-white">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentView !== 'main' && (
                  <button 
                    onClick={() => setCurrentView('main')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-900 rotate-180" />
                  </button>
                )}
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {currentView === 'main' ? 'Settings' : 
                   currentView === 'profile' ? 'Edit Profile' :
                   currentView === 'privacy' ? 'Privacy' : 'Help & Support'}
                </h2>
              </div>
              <SheetClose className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-900" />
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 p-6">
            {/* Main Menu View */}
            {currentView === 'main' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <button 
                    onClick={() => setCurrentView('profile')}
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-bold text-base">Edit Profile</p>
                        <p className="text-gray-500 text-xs mt-0.5">Update your personal information</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  <button 
                    onClick={() => setCurrentView('privacy')}
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-bold text-base">Privacy & Security</p>
                        <p className="text-gray-500 text-xs mt-0.5">Control your privacy settings</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  <button 
                    onClick={() => setCurrentView('help')}
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <HelpCircle className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-bold text-base">Help & Support</p>
                        <p className="text-gray-500 text-xs mt-0.5">Get help with your account</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-center text-gray-400 text-xs font-medium">
                    EVENTZ v1.0.0 • Made with ❤️ in Tanzania
                  </p>
                </div>
              </div>
            )}

          {/* Edit Profile View */}
          {currentView === 'profile' && (
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
                  ref={fileInputRef}
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
                      className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
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
                      className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                {isCreatorProfile && (
                  <>
                    <div className="space-y-2" ref={categoryRef}>
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
                          className="w-full h-11 pl-11 pr-10 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
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

                    <div className="space-y-2" ref={locationRef}>
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
                          className="w-full h-11 pl-11 pr-10 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
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
                      className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
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
                      className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="+255 712 345 678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="flex items-center gap-3 w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-gray-900 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200">
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition resize-none"
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
          )}

          {/* Notifications View */}
          {/* Removed Notifications View */}

          {/* Privacy & Security View */}
          {currentView === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#8A2BE2] mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium mb-1">Privacy Controls</p>
                    <p className="text-gray-600 text-sm">Manage who can see your information and how you interact with others</p>
                  </div>
                </div>
              </div>

              {/* Profile Visibility */}
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-900 font-medium text-sm mb-3">Profile Visibility</p>
                  <div className="space-y-2">
                    {['public', 'friends', 'private'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setPrivacy({ ...privacy, profileVisibility: option })}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          privacy.profileVisibility === option
                            ? 'border-[#8A2BE2] bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900 text-sm font-medium capitalize">{option}</span>
                          {privacy.profileVisibility === option && (
                            <Check className="w-5 h-5 text-[#8A2BE2]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Email */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium text-sm mb-1">Show Email on Profile</p>
                      <p className="text-gray-500 text-xs">Let others see your email address</p>
                    </div>
                    <button
                      onClick={() => setPrivacy({ ...privacy, showEmail: !privacy.showEmail })}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        privacy.showEmail ? 'bg-[#8A2BE2]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        privacy.showEmail ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Show Phone */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium text-sm mb-1">Show Phone on Profile</p>
                      <p className="text-gray-500 text-xs">Let others see your phone number</p>
                    </div>
                    <button
                      onClick={() => setPrivacy({ ...privacy, showPhone: !privacy.showPhone })}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        privacy.showPhone ? 'bg-[#8A2BE2]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        privacy.showPhone ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Allow Messages */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium text-sm mb-1">Allow Direct Messages</p>
                      <p className="text-gray-500 text-xs">Anyone can send you messages</p>
                    </div>
                    <button
                      onClick={() => setPrivacy({ ...privacy, allowMessages: !privacy.allowMessages })}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        privacy.allowMessages ? 'bg-[#8A2BE2]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        privacy.allowMessages ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Show Activity */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium text-sm mb-1">Show Activity Status</p>
                      <p className="text-gray-500 text-xs">Let others see when you're active</p>
                    </div>
                    <button
                      onClick={() => setPrivacy({ ...privacy, showActivity: !privacy.showActivity })}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        privacy.showActivity ? 'bg-[#8A2BE2]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        privacy.showActivity ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSavePrivacy}
                className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#6A1BB2] text-white py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}

          {/* Help & Support View */}
          {currentView === 'help' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 mb-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#8A2BE2] mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium mb-1">We're Here to Help</p>
                    <p className="text-gray-600 text-sm">Get assistance with your EVENTZ account and find answers to common questions</p>
                  </div>
                </div>
              </div>

              {/* Help Options */}
              <button className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <MessageCircle className="w-5 h-5 text-[#8A2BE2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium text-sm mb-1">Contact Support</p>
                    <p className="text-gray-500 text-xs">Get help from our support team</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </button>

              <button className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                    <HelpCircle className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium text-sm mb-1">FAQs</p>
                    <p className="text-gray-500 text-xs">Find answers to common questions</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </button>

              <button className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium text-sm mb-1">Send Feedback</p>
                    <p className="text-gray-500 text-xs">Help us improve EVENTZ</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </button>

              {/* Contact Info */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
                <p className="text-gray-900 font-medium text-sm mb-4">Contact Information</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-600 text-sm">support@eventz.co.tz</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-600 text-sm">+255 700 123 456</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-600 text-sm">Dar es Salaam, Tanzania</p>
                  </div>
                </div>
              </div>

              {/* App Info */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-5 border border-purple-200 text-center">
                <p className="text-gray-700 font-medium mb-2">EVENTZ</p>
                <p className="text-gray-600 text-sm mb-1">Version 1.0.0</p>
                <p className="text-gray-500 text-xs">Made with ❤️ in Tanzania</p>
              </div>
            </div>
          )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
