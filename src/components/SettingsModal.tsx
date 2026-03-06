import { X, User, Shield, HelpCircle, LogOut, ChevronRight, Mail, Phone, MapPin, Camera, Save, Check, MessageCircle, Heart, AtSign, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase, getProfile, updateProfile, checkUsernameUnique, uploadImage } from '../utils/supabase/api';

type SettingsView = 'main' | 'profile' | 'privacy' | 'help';

interface SettingsModalProps {
  onClose: () => void;
  onLogout: () => Promise<void>;
  initialView?: SettingsView;
}

export function SettingsModal({ onClose, onLogout, initialView = 'main' }: SettingsModalProps) {
  const [currentView, setCurrentView] = useState<SettingsView>(initialView);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    birthdate: '',
    avatarUrl: '',
  });

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



  // Privacy state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showActivity: true,
  });

  // Notification state
  const [notifications, setNotifications] = useState({
    ticketSales: true,
    streamAlerts: true,
    weeklyReport: false,
    marketingEmails: false,
    newFollowers: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          if (profile) {
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
                location: profile.location || '',
                bio: profile.bio || '',
                birthdate: profile.birthdate || '',
                avatarUrl: profile.avatar_url || '',
              });
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

          const storedNotifications = localStorage.getItem('eventz-notifications');
          if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
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

        await updateProfile(user.id, {
          username: profileData.username,
          full_name: profileData.name,
          contact_email: profileData.email,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          birthdate: profileData.birthdate,
          avatar_url: profileData.avatarUrl,
        });
      } else {
        localStorage.setItem('eventz-user-profile', JSON.stringify(profileData));
      }
      toast.success('Profile updated successfully! ✅');
      setCurrentView('main');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fields: ['username','full_name','contact_email','phone','location','bio','birthdate','avatar_url'] } }));
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

  const handleLogout = async () => {
    onClose();
    try {
      await onLogout();
      toast.success('Logged out successfully! 👋');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const menuItems = [
    {
      icon: User,
      label: 'Edit Profile',
      description: 'Update your personal information',
      onClick: () => setCurrentView('profile'),
    },

    {
      icon: Shield,
      label: 'Privacy & Security',
      description: 'Control your privacy settings',
      onClick: () => setCurrentView('privacy'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help with your account',
      onClick: () => setCurrentView('help'),
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          {/* Drag Indicator */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentView !== 'main' && (
                <button 
                  onClick={() => setCurrentView('main')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
                </button>
              )}
              <h2 className="text-gray-900 text-xl">
                {currentView === 'main' && 'Settings'}
                {currentView === 'profile' && 'Edit Profile'}

                {currentView === 'privacy' && 'Privacy & Security'}
                {currentView === 'help' && 'Help & Support'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {/* Main Menu */}
          {currentView === 'main' && (
            <>
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-purple-200 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-gray-900 text-sm font-medium">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 group"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>

              {/* App Version */}
              <p className="text-center text-gray-400 text-xs mt-6">
                EVENTZ v1.0.0 • Made with ❤️ in Tanzania
              </p>
            </>
          )}

          {/* Edit Profile View */}
          {currentView === 'profile' && (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {profileData.avatarUrl ? (
                        <img src={profileData.avatarUrl} alt={profileData.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <button 
                      onClick={handleAvatarClick}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-[#8A2BE2] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#7825d4] transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium mb-1">{profileData.name}</p>
                    <button 
                      onClick={handleAvatarClick}
                      className="text-[#8A2BE2] text-sm hover:text-[#7825d4] font-medium"
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

              {/* Profile Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                      placeholder="+255 712 345 678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={profileData.birthdate}
                      onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Bio</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#6A1BB2] text-white py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
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
    </div>
  );
}
