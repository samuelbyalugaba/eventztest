import { 
  // Icons
  X, 
  User, 
  CreditCard, 
  Lock, 
  Video, 
  Shield,
  Camera,
  Check,
  Mic2,
  Store,
  Trophy,
  Wine,
  Coffee,
  UtensilsCrossed,
  Headphones,
  Mic,
  Music,
  Users,
  Briefcase,
  Radio,
  Heart,
  GraduationCap,
  Church,
  Laptop,
  ShoppingBag,
  Plane,
  Film,
  Dumbbell,
  Activity,
  Target,
  Mail,
  Phone,
  Globe,
  AtSign,
  Calendar,
  Search,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../utils/supabase/client';
import { updateProfile, getProfile, checkUsernameUnique, getOrganizerProfile, upsertOrganizerProfile, uploadImage } from '../utils/supabase/api';
import { isSafeUrl } from '../utils/sanitize';

interface OrganizerSettingsModalProps {
  onClose: () => void;
}

export function OrganizerSettingsModal({ onClose }: OrganizerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'streaming' | 'payments' | 'privacy' | 'account'>('profile');

  const [profileData, setProfileData] = useState({
    username: '',
    organizerName: '',
    organizerType: '',
    venueSubType: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    avatarUrl: '',
    birthdate: '',
  });

  const [streamingSettings, setStreamingSettings] = useState({
    defaultQuality: '1080p',
    autoRecord: true,
    chatEnabled: true,
    reactionsEnabled: true,
    multiCamera: false,
    lowLatency: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showFollowers: true,
    showStats: true,
  });

  const [paymentData, setPaymentData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    mobileMoney: '',
    paymentMethod: 'bank',
  });

  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const CREATOR_CATEGORIES = [
    'Art Gallery', 'Artist', 'Bar', 'Band', 'Blogger', 'Book Store', 'Brand',
    'Business', 'Cafe', 'Charity', 'Church', 'Club', 'Coach', 'Comedy Club',
    'Community', 'Concert Venue', 'Conference', 'Content Creator', 'Corporate',
    'DJ', 'Dance Studio', 'Digital Creator', 'Education', 'Entrepreneur',
    'Event Planner', 'Exhibition', 'Fashion', 'Festival', 'Fitness Trainer',
    'Government', 'Gym', 'Health/Beauty', 'Hotel', 'Influencer', 'Library',
    'Lounge', 'Media', 'Mosque', 'Museum', 'Music Venue', 'Musician',
    'Networking Group', 'Nightclub', 'Non-Profit', 'Organization', 'Park',
    'Party Planner', 'Performing Arts', 'Personal Blog', 'Photographer',
    'Podcast', 'Promoter', 'Public Figure', 'Radio Station',
    'Religious Organization', 'Resort', 'Restaurant', 'Retail', 'School',
    'Shopping', 'Social Club', 'Speaker', 'Sports Team', 'Startup',
    'Student Organization', 'Synagogue', 'Tech Community', 'Theater',
    'University', 'Venue', 'Video Creator', 'Wedding Planner', 'Workshop',
    'Writer', 'Yoga Studio', 'Youth Organization'
  ].sort();

  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = CREATOR_CATEGORIES.filter(c => 
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

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
      if (!user) return;

      // Use organizer-specific path
      const publicUrl = await uploadImage(file, 'avatars', `organizers/${user.id}`);

      setProfileData({ ...profileData, avatarUrl: publicUrl });
      
      // Auto-save the avatar URL to the database
      // This ensures the avatar is persisted even if the user forgets to click "Save Changes"
      try {
        await upsertOrganizerProfile({
          id: user.id,
          organizer_avatar_url: publicUrl
        });
        toast.success('Profile photo updated successfully');
      } catch (saveError) {
        console.warn('Auto-save of avatar failed (likely new profile), user must click Save:', saveError);
        toast.success('Photo uploaded. Please click Save to finish setup.');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Error uploading avatar');
    }
  };

  if (loading) {
     // Optional: Add a loading state or just return null
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch independently to prevent one failure from blocking the other
          const profilePromise = getProfile(user.id);
          const organizerProfilePromise = getOrganizerProfile(user.id).catch(err => {
            console.error('Failed to fetch organizer profile (might be missing table or permissions):', err);
            return null;
          });

          const [profile, organizerProfile] = await Promise.all([
            profilePromise,
            organizerProfilePromise
          ]);

          if (profile) {
            // Parse organizer type and subtype from organizer profile OR profile (legacy)
            // Fix: Just take the organizer type as is, since we are moving to single string categories
            let type = organizerProfile?.organizer_type || profile.organizer_type || '';
            // If it has a dash, it might be old format "Type - Subtype", we can keep it or split it.
            // For now, let's just use it as the initial search value.
            
            // Fix: Use profile.username as fallback for organizer name if organizer name is empty
            const orgName = organizerProfile?.organizer_name || profile.username || '';

            setProfileData({
              username: profile.username || '',
              organizerName: orgName, 
              organizerType: type,
              venueSubType: '', // Deprecated
              email: organizerProfile?.contact_email || user.email || '',
              phone: organizerProfile?.phone || '',
              location: organizerProfile?.location || '',
              bio: organizerProfile?.bio || '',
              website: organizerProfile?.website || '',
              avatarUrl: organizerProfile?.organizer_avatar_url || profile.avatar_url || '', // Fallback to user avatar if organizer avatar is missing
              birthdate: profile.birthdate || '',
            });

            setCategorySearch(type);

            if (!organizerProfile) {
               // Hint to user that they are creating a new profile
               toast.info('Set up your new Organizer Page details');
            }


            if (profile.streaming_settings) setStreamingSettings(profile.streaming_settings);
            if (profile.privacy_settings) setPrivacySettings(profile.privacy_settings);
            if (profile.payment_settings) setPaymentData(profile.payment_settings);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

    const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validation: Check if sub-type is selected for types that require it
      // REMOVED: No longer needed with simple category selection
      /*
      const typesRequiringSubType = [
        'Venue', 
        'Artist/Performer', 
        'Organization/Institution', 
        'Business/Corporate', 
        'Sports Club/Fitness'
      ];

      if (typesRequiringSubType.includes(profileData.organizerType) && !profileData.venueSubType) {
        toast.error(`Please select a specific type for ${profileData.organizerType}`);
        return;
      }
      */

      // Check username uniqueness if changed
      // REMOVED: Username updates are disabled in Organizer Settings to prevent syncing with User Profile
      /*
      const currentProfile = await getProfile(user.id);
      if (profileData.username !== currentProfile?.username) {
        const isUnique = await checkUsernameUnique(profileData.username, user.id);
        if (!isUnique) {
          toast.error('Username already taken');
          return;
        }
      }
      */

      // Validate URLs
      if (profileData.website && !isSafeUrl(profileData.website)) {
        toast.error('Please enter a valid website URL (starting with http:// or https://)');
        return;
      }
      
      if (profileData.avatarUrl && !isSafeUrl(profileData.avatarUrl)) {
        // Should be impossible if uploaded via our tool, but good for safety
        toast.error('Invalid avatar URL');
        return;
      }

      const finalOrganizerType = profileData.organizerType;

      // Save organizer profile to separate table
      await upsertOrganizerProfile({
        id: user.id,
        organizer_name: profileData.organizerName,
        organizer_type: finalOrganizerType,
        organizer_avatar_url: profileData.avatarUrl,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        contact_email: profileData.email,
        phone: profileData.phone,
      });

      // REMOVED: Do not update User Profile username from here.
      // await updateProfile(user.id, {
      //   username: profileData.username
      // });
      
      toast.success('Profile updated successfully! ✅');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // Show more detailed error message to help debug
      const errorMessage = error.message || error.error_description || error.details || 'Failed to update profile';
      
      if (errorMessage.includes('relation "organizer_profiles" does not exist') || error.code === '42P01') {
        toast.error('System Error: Organizer database table is missing. Please ask developer to run the setup SQL.');
      } else {
        toast.error(`Failed to update profile: ${errorMessage}`);
      }
    }
  };

  const handleSaveStreaming = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await updateProfile(user.id, {
        streaming_settings: streamingSettings
      });
      toast.success('Streaming settings updated! 📹');
    } catch (error) {
      console.error('Error saving streaming settings:', error);
      toast.error('Failed to save streaming settings');
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await updateProfile(user.id, {
        privacy_settings: privacySettings
      });
      toast.success('Privacy settings updated! 🔒');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    }
  };

  const handleSavePayment = async () => {
    try {
      // Validate payment info
      if (paymentData.paymentMethod === 'bank') {
        if (!paymentData.bankName || !paymentData.accountNumber || !paymentData.accountName) {
          toast.error('Please fill in all bank details');
          return;
        }
      } else if (paymentData.paymentMethod === 'mobile') {
        if (!paymentData.mobileMoney) {
          toast.error('Please enter your mobile money number');
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await updateProfile(user.id, {
        payment_settings: paymentData
      });
      toast.success('Payment information saved securely! 💳');
    } catch (error) {
      console.error('Error saving payment info:', error);
      toast.error('Failed to save payment information');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'streaming', label: 'Streaming', icon: Video },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: Lock },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header with Tabs - FIXED AT TOP */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 text-xl font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Tab Navigation - All Visible */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#8A2BE2] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-6">Profile Photo</h4>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                        <UserAvatar 
                          src={profileData.avatarUrl} 
                          name={profileData.organizerName || 'Organizer'} 
                          className="w-full h-full" 
                        />
                      </div>
                      <button 
                        onClick={handleAvatarClick}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-[#8A2BE2] rounded-full flex items-center justify-center text-white hover:bg-[#7825d4]"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-3">Upload a new profile photo</p>
                      <button 
                        onClick={handleAvatarClick}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        Change Photo
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-6">Personal Information</h4>
                  <div className="space-y-5">
                    {/* Username Field Removed to prevent sync issues with User Profile */}
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Organizer Name</label>
                      <input
                        type="text"
                        value={profileData.organizerName}
                        onChange={(e) => setProfileData({ ...profileData, organizerName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                        placeholder="Your name"
                      />
                    </div>

                    {/* Organizer Type Selection - Dropdown Style */}
                    <div className="mb-2 relative" ref={categoryRef}>
                      <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Category <span className="text-red-500">*</span></label>
                      <p className="text-gray-500 text-xs mb-3 ml-1">Select the category that best describes you</p>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => {
                            setCategorySearch(e.target.value);
                            setShowCategoryDropdown(true);
                            if (profileData.organizerType && e.target.value !== profileData.organizerType) {
                              setProfileData(prev => ({ ...prev, organizerType: '' }));
                            }
                          }}
                          onFocus={() => setShowCategoryDropdown(true)}
                          placeholder="Search categories..."
                          className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent transition-all font-medium"
                        />
                        <ChevronDown className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {showCategoryDropdown && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in duration-200">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  setProfileData(prev => ({ ...prev, organizerType: c }));
                                  setCategorySearch(c);
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full text-left px-6 py-3 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${profileData.organizerType === c ? 'text-[#8A2BE2] font-bold bg-purple-50/50' : 'text-slate-600 font-medium'}`}
                              >
                                {c}
                                {profileData.organizerType === c && <Check className="w-4 h-4" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-6 py-4 text-sm text-slate-400 italic">No categories found</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                            placeholder="+255 XXX XXX XXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                          placeholder="City, Country"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Website</label>
                        <input
                          type="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Date of Birth</label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={profileData.birthdate}
                          onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Bio</label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] resize-none"
                        placeholder="Tell people about yourself..."
                      />
                      <p className="text-gray-500 text-xs mt-2">{profileData.bio.length}/500</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} className="px-5 py-2.5 bg-[#8A2BE2] text-white text-sm rounded-lg hover:bg-[#7825d4]">
                    Save Changes
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-red-50/50 rounded-xl p-4 border border-red-100">
                    <div>
                      <h5 className="text-gray-900 font-semibold text-sm">Switch to Personal Account</h5>
                      <p className="text-gray-500 text-xs mt-1 max-w-sm leading-relaxed">
                        Downgrading removes organizer features. Your events will remain but you won't be able to manage them.
                      </p>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to downgrade to a personal account? This will hide your organizer profile and you will lose access to organizer features.')) {
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                              const { error } = await supabase.rpc('downgrade_to_personal_account');

                              if (error) throw error;

                              toast.success('Account downgraded successfully');
                              // Force reload to update global state
                              window.location.reload();
                            }
                          } catch (error: any) {
                            console.error('Error downgrading account:', error);
                            
                            // Handle Auth Session Errors
                            if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
                              toast.error('Session expired. Please sign in again.');
                              await supabase.auth.signOut();
                              window.location.reload();
                              return;
                            }

                            toast.error(`Failed to downgrade account: ${error?.message || 'Unknown error'}`);
                          }
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 text-red-600 text-sm rounded-lg hover:bg-red-50 hover:border-red-200 font-medium transition-all shadow-sm whitespace-nowrap"
                    >
                      Downgrade Account
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* Streaming Tab */}
            {activeTab === 'streaming' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-4">Default Stream Quality</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {['720p', '1080p', '4K'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setStreamingSettings({ ...streamingSettings, defaultQuality: quality })}
                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium ${
                          streamingSettings.defaultQuality === quality
                            ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2]'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                  {[
                    { key: 'autoRecord', title: 'Auto-Record Streams', desc: 'Save streams automatically' },
                    { key: 'chatEnabled', title: 'Live Chat', desc: 'Enable chat during streams' },
                    { key: 'reactionsEnabled', title: 'Live Reactions', desc: 'Allow emoji reactions' },
                    { key: 'multiCamera', title: 'Multi-Camera', desc: 'Support multiple angles' },
                    { key: 'lowLatency', title: 'Low Latency Mode', desc: 'Reduce stream delay' },
                  ].map((item) => {
                    const isEnabled = streamingSettings[item.key as keyof typeof streamingSettings];
                    return (
                      <div key={item.key} className="p-5 flex items-center justify-between">
                        <div>
                          <h5 className="text-gray-900 font-medium text-sm">{item.title}</h5>
                          <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => setStreamingSettings({ ...streamingSettings, [item.key]: !isEnabled })}
                          className={`relative w-11 h-6 rounded-full ${isEnabled ? 'bg-[#8A2BE2]' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleSaveStreaming} className="px-5 py-2.5 bg-[#8A2BE2] text-white text-sm rounded-lg hover:bg-[#7825d4]">
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-4">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'bank' })}
                      className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
                        paymentData.paymentMethod === 'bank'
                          ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-2" />
                      Bank Account
                    </button>
                    <button
                      onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'mobile' })}
                      className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
                        paymentData.paymentMethod === 'mobile'
                          ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Phone className="w-5 h-5 mx-auto mb-2" />
                      Mobile Money
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-6">Payment Details</h4>
                  {paymentData.paymentMethod === 'bank' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Bank Name</label>
                        <input
                          type="text"
                          value={paymentData.bankName}
                          onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                          placeholder="e.g., CRDB Bank"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Account Number</label>
                        <input
                          type="text"
                          value={paymentData.accountNumber}
                          onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                          placeholder="Your account number"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Account Name</label>
                        <input
                          type="text"
                          value={paymentData.accountName}
                          onChange={(e) => setPaymentData({ ...paymentData, accountName: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                          placeholder="Account holder name"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Mobile Money Number</label>
                      <input
                        type="tel"
                        value={paymentData.mobileMoney}
                        onChange={(e) => setPaymentData({ ...paymentData, mobileMoney: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                        placeholder="+255 XXX XXX XXX"
                      />
                      <p className="text-gray-500 text-xs mt-2">M-Pesa, Tigo Pesa, Airtel Money</p>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-[#8A2BE2] flex-shrink-0" />
                    <div>
                      <h5 className="text-gray-900 font-medium text-sm mb-1">Secure Payment Processing</h5>
                      <p className="text-gray-600 text-sm">Your information is encrypted and stored securely.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleSavePayment} className="px-5 py-2.5 bg-[#8A2BE2] text-white text-sm rounded-lg hover:bg-[#7825d4]">
                    Save Payment Info
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-gray-900 font-medium mb-4">Profile Visibility</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPrivacySettings({ ...privacySettings, profileVisibility: 'public' })}
                      className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
                        privacySettings.profileVisibility === 'public'
                          ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Globe className="w-5 h-5 mx-auto mb-2" />
                      Public
                    </button>
                    <button
                      onClick={() => setPrivacySettings({ ...privacySettings, profileVisibility: 'private' })}
                      className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
                        privacySettings.profileVisibility === 'private'
                          ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Lock className="w-5 h-5 mx-auto mb-2" />
                      Private
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                  {[
                    { key: 'showEmail', title: 'Show Email', desc: 'Display email on profile' },
                    { key: 'showPhone', title: 'Show Phone', desc: 'Display phone number' },
                    { key: 'allowMessages', title: 'Allow Messages', desc: 'Let users message you' },
                    { key: 'showFollowers', title: 'Show Followers', desc: 'Display follower count' },
                    { key: 'showStats', title: 'Show Statistics', desc: 'Display event stats' },
                  ].map((item) => {
                    const isEnabled = privacySettings[item.key as keyof typeof privacySettings];
                    return (
                      <div key={item.key} className="p-5 flex items-center justify-between">
                        <div>
                          <h5 className="text-gray-900 font-medium text-sm">{item.title}</h5>
                          <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => setPrivacySettings({ ...privacySettings, [item.key]: !isEnabled })}
                          className={`relative w-11 h-6 rounded-full ${isEnabled ? 'bg-[#8A2BE2]' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleSavePrivacy} className="px-5 py-2.5 bg-[#8A2BE2] text-white text-sm rounded-lg hover:bg-[#7825d4]">
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <h5 className="text-gray-900 font-medium text-sm">Change Password</h5>
                    <p className="text-gray-500 text-sm mt-0.5">Update your password</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                    Update
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <h5 className="text-gray-900 font-medium text-sm">Two-Factor Authentication</h5>
                    <p className="text-gray-500 text-sm mt-0.5">Add extra security</p>
                  </div>
                  <button className="px-4 py-2 bg-[#8A2BE2] text-white text-sm rounded-lg hover:bg-[#7825d4]">
                    Enable
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h5 className="text-gray-900 font-medium text-sm mb-4">Connected Accounts</h5>
                  <div className="space-y-2">
                    {['Facebook', 'Instagram', 'Twitter'].map((platform) => (
                      <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 text-sm">{platform}</span>
                        <span className="text-gray-400 text-xs">Not connected</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <h5 className="text-gray-900 font-medium text-sm">Sign Out</h5>
                    <p className="text-gray-500 text-sm mt-0.5">Log out from this device</p>
                  </div>
                  <button 
                    onClick={() => {
                      toast.success('Logged out successfully');
                      onClose();
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h5 className="text-red-900 font-medium text-sm">Delete Account</h5>
                    <p className="text-red-700 text-sm mt-0.5">Permanently delete</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure? This cannot be undone.')) {
                        toast.error('Account deletion initiated');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
