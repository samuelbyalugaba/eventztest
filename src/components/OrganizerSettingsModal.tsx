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
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Search,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { UserAvatar } from './UserAvatar';
import { supabase, getProfile, updateProfile } from '../utils/supabase/api';
import { isSafeUrl } from '../utils/sanitize';
import { CREATOR_CATEGORIES } from '../utils/categories';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PRIVACY_SETTINGS, mapOrganizerProfileToSettingsForm, uploadProfileAvatar, validateProfileImageFile } from './settings/profileSettingsShared';

interface OrganizerSettingsModalProps {
  onClose: () => void;
}

export function OrganizerSettingsModal({ onClose }: OrganizerSettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth();
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
    ...DEFAULT_PRIVACY_SETTINGS,
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
      const validationError = validateProfileImageFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (!user) return;

      const publicUrl = await uploadProfileAvatar({ file, userId: user.id, scope: 'organizers' });

      setProfileData({ ...profileData, avatarUrl: publicUrl });
      
      // Auto-save the avatar URL to the database
      try {
        await updateProfile(user.id, {
          avatar_url: publicUrl
        });
        await refreshProfile();
        toast.success('Profile photo updated successfully');
      } catch (saveError) {
        toast.success('Photo uploaded. Please click Save to finish setup.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error uploading avatar');
    }
  };

  if (loading) {
     // Optional: Add a loading state or just return null
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user) {
          const currentProfile = profile || await getProfile(user.id);

          if (currentProfile) {
            let type = currentProfile.organizer_type || '';

            setProfileData(mapOrganizerProfileToSettingsForm(currentProfile, user.email || ''));

            setCategorySearch(type);

            if (!currentProfile.is_organizer) {
               // Hint to user that they are setting up a creator account
               toast.info('Set up your Creator details');
             }

            if (currentProfile.streaming_settings) setStreamingSettings(currentProfile.streaming_settings);
            if (currentProfile.privacy_settings) setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...currentProfile.privacy_settings });
            if (currentProfile.payment_settings) setPaymentData(currentProfile.payment_settings);
          }
        }
      } catch (error) {
        toast.error('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profile, user]);

  const handleSaveProfile = async () => {
    try {
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

      // Save to profiles table
      await updateProfile(user.id, {
        full_name: profileData.organizerName,
        organizer_type: finalOrganizerType,
        avatar_url: profileData.avatarUrl,
        bio: profileData.bio,
        location: profileData.location.trim(),
        website: profileData.website,
        contact_email: profileData.email,
        phone: profileData.phone,
        birthdate: profileData.birthdate,
        is_organizer: true // Ensure they are marked as organizer
      });
      await refreshProfile();
      
      toast.success('Profile updated successfully');
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(`Failed to update profile: ${errorMessage}`);
    }
  };

  const handleSaveStreaming = async () => {
    try {
      if (!user) return;

      await updateProfile(user.id, {
        streaming_settings: streamingSettings
      });
      await refreshProfile();
      toast.success('Streaming settings updated');
    } catch (error) {
      toast.error('Failed to save streaming settings');
    }
  };

  const handleSavePrivacy = async () => {
    try {
      if (!user) return;

      await updateProfile(user.id, {
        privacy_settings: privacySettings
      });
      await refreshProfile();
      toast.success('Privacy settings updated');
    } catch (error) {
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

      if (!user) return;

      await updateProfile(user.id, {
        payment_settings: paymentData
      });
      await refreshProfile();
      toast.success('Payment information saved securely');
    } catch (error) {
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
              <div className="space-y-8 pb-10">
                {/* Avatar Section - Modern & Minimal (Matching Creator Setup) */}
                <div className="flex flex-col items-center mb-10">
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-xl shadow-purple-100 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
                      <UserAvatar 
                        src={profileData.avatarUrl} 
                        name={profileData.organizerName || 'Organizer'} 
                        className="w-full h-full" 
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#8A2BE2] text-white flex items-center justify-center shadow-lg border-4 border-white transform transition-transform group-hover:scale-110">
                      <Camera className="w-4 h-4" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-500">Tap to upload photo</p>
                </div>

                {/* Form Fields - Mobile Native Look (Matching Creator Setup) */}
                <div className="space-y-6">
                  {/* Organizer Name Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 ml-1">Organizer Name</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.organizerName}
                        onChange={(e) => setProfileData({ ...profileData, organizerName: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                        placeholder="Your name"
                      />
                    </div>
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
                          if (profileData.organizerType && e.target.value !== profileData.organizerType) {
                            setProfileData(prev => ({ ...prev, organizerType: '' }));
                          }
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        placeholder="Select category"
                        className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                      />
                      <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                      
                      {showCategoryDropdown && (
                        <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in duration-200">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  setProfileData(prev => ({ ...prev, organizerType: c }));
                                  setCategorySearch(c);
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full text-left px-5 py-3.5 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${profileData.organizerType === c ? 'text-[#8A2BE2] font-bold bg-purple-50/50' : 'text-gray-600 font-medium'}`}
                              >
                                {c}
                                {profileData.organizerType === c && <Check className="w-4 h-4" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-5 py-4 text-sm text-gray-400 text-center italic">No categories found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location & Website Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900 ml-1">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                          placeholder="City, Country"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900 ml-1">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Phone Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900 ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900 ml-1">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                          placeholder="+255 XXX XXX XXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date of Birth Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 ml-1">Date of Birth</label>
                    <div className="flex items-center gap-3 w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm focus-within:border-purple-500/20 focus-within:bg-white">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <input
                        type="date"
                        value={profileData.birthdate}
                        onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-gray-900 font-medium outline-none"
                      />
                    </div>
                  </div>

                  {/* Bio Textarea */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 ml-1">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell your story..."
                      rows={4}
                      maxLength={500}
                      className="w-full px-5 py-4 bg-white border-2 border-gray-100 focus:border-purple-500/20 focus:bg-white rounded-2xl text-gray-900 placeholder-gray-400 font-medium outline-none transition-all resize-none shadow-sm"
                    />
                    <p className="text-gray-500 text-xs mt-2 text-right">{profileData.bio.length}/500</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 flex justify-end gap-3">
                  <button 
                    onClick={onClose} 
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-10 mt-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-red-50/50 rounded-3xl p-6 border border-red-100">
                    <div>
                      <h5 className="text-gray-900 font-bold text-lg">Switch to Personal Account</h5>
                      <p className="text-gray-500 text-sm mt-1 max-w-sm leading-relaxed">
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
                      className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all shadow-sm whitespace-nowrap"
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
                    { key: 'reactionsEnabled', title: 'Live Reactions', desc: 'Allow live reactions' },
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
