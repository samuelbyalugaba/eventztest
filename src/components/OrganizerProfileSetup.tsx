import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Globe, Instagram, Facebook, Twitter, ArrowRight, Building2, Mic2, Store, Users, Briefcase, Trophy, Check, Music, Wine, Coffee, UtensilsCrossed, Headphones, Radio, Mic, Heart, GraduationCap, School, Building, Church, Laptop, ShoppingBag, Plane, Film, Dumbbell, Activity, Flame, Target, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile, supabase, getProfile, checkUsernameUnique, getOrganizerProfile, upsertOrganizerProfile } from '../utils/supabase/api';

interface OrganizerProfileSetupProps {
  onComplete: () => void;
}

interface OrganizerProfile {
  username: string;
  organizerName: string;
  organizerType: string;
  venueSubType?: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
  bio: string;
}

export function OrganizerProfileSetup({ onComplete }: OrganizerProfileSetupProps) {
  const [profileData, setProfileData] = useState<OrganizerProfile>({
    username: '',
    organizerName: '',
    organizerType: '',
    venueSubType: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
    bio: '',
  });

  const organizerTypes = [
    {
      id: 'individual',
      name: 'Individual Organizer',
      description: 'Independent event organizer or planner',
      icon: User,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      iconColor: 'bg-blue-500',
    },
    {
      id: 'artist',
      name: 'Artist / Performer',
      description: 'Musicians, DJs, performers, and entertainers',
      icon: Mic2,
      color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
      iconColor: 'bg-purple-500',
    },
    {
      id: 'venue',
      name: 'Venue',
      description: 'Clubs, Bars, Lounges, Restaurants',
      icon: Store,
      color: 'bg-pink-50 border-pink-200 hover:border-pink-400',
      iconColor: 'bg-pink-500',
    },
    {
      id: 'organization',
      name: 'Organization / Institution',
      description: 'Non-profits, educational institutions, communities',
      icon: Users,
      color: 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
      iconColor: 'bg-cyan-500',
    },
    {
      id: 'business',
      name: 'Business / Corporate',
      description: 'Companies, brands, and corporate organizers',
      icon: Briefcase,
      color: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
      iconColor: 'bg-indigo-500',
    },
    {
      id: 'sports',
      name: 'Sports Club / Fitness Provider',
      description: 'Gyms, sports clubs, and fitness centers',
      icon: Trophy,
      color: 'bg-green-50 border-green-200 hover:border-green-400',
      iconColor: 'bg-green-500',
    },
  ];

  const venueSubTypes = [
    {
      id: 'club',
      name: 'Club',
      icon: Music,
      description: 'Nightclub, dance club',
      emoji: '🎵',
    },
    {
      id: 'bar',
      name: 'Bar',
      icon: Wine,
      description: 'Bar, pub, tavern',
      emoji: '🍷',
    },
    {
      id: 'lounge',
      name: 'Lounge',
      icon: Coffee,
      description: 'Lounge, hookah lounge',
      emoji: '☕',
    },
    {
      id: 'restaurant',
      name: 'Restaurant',
      icon: UtensilsCrossed,
      description: 'Restaurant, dining venue',
      emoji: '🍽️',
    },
  ];

  const artistSubTypes = [
    {
      id: 'dj',
      name: 'DJ',
      icon: Headphones,
      description: 'DJ, electronic music',
      emoji: '🎧',
    },
    {
      id: 'band',
      name: 'Live Band',
      icon: Music,
      description: 'Band, musicians',
      emoji: '🎸',
    },
    {
      id: 'solo',
      name: 'Solo Artist',
      icon: Mic,
      description: 'Singer, solo performer',
      emoji: '🎤',
    },
    {
      id: 'entertainer',
      name: 'Entertainer',
      icon: Radio,
      description: 'Comedian, MC, host',
      emoji: '🎭',
    },
  ];

  const organizationSubTypes = [
    {
      id: 'nonprofit',
      name: 'Non-Profit',
      icon: Heart,
      description: 'NGO, charity, foundation',
      emoji: '❤️',
    },
    {
      id: 'education',
      name: 'Educational',
      icon: GraduationCap,
      description: 'University, school',
      emoji: '🎓',
    },
    {
      id: 'community',
      name: 'Community',
      icon: Users,
      description: 'Community group, club',
      emoji: '👥',
    },
    {
      id: 'religious',
      name: 'Religious',
      icon: Church,
      description: 'Church, religious org',
      emoji: '⛪',
    },
  ];

  const businessSubTypes = [
    {
      id: 'tech',
      name: 'Tech Company',
      icon: Laptop,
      description: 'Software, tech startup',
      emoji: '💻',
    },
    {
      id: 'retail',
      name: 'Retail Brand',
      icon: ShoppingBag,
      description: 'Store, retail business',
      emoji: '🛍️',
    },
    {
      id: 'hospitality',
      name: 'Hospitality',
      icon: Plane,
      description: 'Hotel, travel, tourism',
      emoji: '✈️',
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: Film,
      description: 'Media, production co.',
      emoji: '🎬',
    },
  ];

  const sportsSubTypes = [
    {
      id: 'gym',
      name: 'Gym/Fitness',
      icon: Dumbbell,
      description: 'Gym, fitness center',
      emoji: '💪',
    },
    {
      id: 'sports',
      name: 'Sports Club',
      icon: Trophy,
      description: 'Sports team, club',
      emoji: '🏆',
    },
    {
      id: 'yoga',
      name: 'Yoga/Wellness',
      icon: Activity,
      description: 'Yoga, wellness studio',
      emoji: '🧘',
    },
    {
      id: 'martial',
      name: 'Martial Arts',
      icon: Target,
      description: 'Fighting, martial arts',
      emoji: '🥋',
    },
  ];

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch both user profile and organizer profile
        const [profile, organizerProfile] = await Promise.all([
          getProfile(user.id),
          getOrganizerProfile(user.id)
        ]);
        
        if (profile) {
          // Determine values, preferring organizer profile if available
          setProfileData(prev => ({
            ...prev,
            username: profile.username || '',
            organizerName: organizerProfile?.organizer_name || profile.full_name || '',
            email: organizerProfile?.contact_email || profile.contact_email || profile.email || '',
            phone: organizerProfile?.phone || profile.phone || '',
            location: organizerProfile?.location || profile.location || '',
            bio: organizerProfile?.bio || profile.bio || '',
            website: organizerProfile?.website || profile.website || '',
            instagram: organizerProfile?.social_links?.instagram || profile.social_links?.instagram || '',
            facebook: organizerProfile?.social_links?.facebook || profile.social_links?.facebook || '',
            twitter: organizerProfile?.social_links?.twitter || profile.social_links?.twitter || '',
          }));
        }
      }
    };
    fetchProfileData();
  }, []);

  const handleInputChange = (field: keyof OrganizerProfile, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!profileData.username || !profileData.organizerName || !profileData.organizerType || !profileData.email || !profileData.phone) {
      toast.error('Please fill in all required fields', {
        description: 'Username, organizer name, type, email, and phone are required',
      });
      return;
    }

    // Validate sub-type for organizer types that require it (all except Individual Organizer)
    const requiresSubType = profileData.organizerType !== 'Individual Organizer';
    if (requiresSubType && !profileData.venueSubType) {
      const typeLabel = profileData.organizerType === 'Venue' ? 'venue type' :
                        profileData.organizerType === 'Artist / Performer' ? 'artist type' :
                        profileData.organizerType === 'Organization / Institution' ? 'organization type' :
                        profileData.organizerType === 'Business / Corporate' ? 'business type' :
                        profileData.organizerType === 'Sports Club / Fitness Provider' ? 'sports/fitness type' : 'type';
      
      toast.error(`Please select a ${typeLabel}`, {
        description: `Choose the specific ${typeLabel} that best describes you`,
      });
      return;
    }

    // Combine organizerType with venueSubType if applicable
    const finalOrganizerType = requiresSubType && profileData.venueSubType
      ? `${profileData.organizerType} - ${profileData.venueSubType}`
      : profileData.organizerType;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save your profile');
        return;
      }

      // Check username uniqueness if changed
      const currentProfile = await getProfile(user.id);
      if (profileData.username !== currentProfile?.username) {
        const isUnique = await checkUsernameUnique(profileData.username, user.id);
        if (!isUnique) {
          toast.error('Username already taken');
          return;
        }
      }

      // Save organizer profile to separate table
      await upsertOrganizerProfile({
        id: user.id,
        organizer_name: profileData.organizerName,
        organizer_type: finalOrganizerType,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        contact_email: profileData.email,
        phone: profileData.phone,
        social_links: {
          instagram: profileData.instagram,
          facebook: profileData.facebook,
          twitter: profileData.twitter,
        }
      });

      // Update main profile with basic info only, avoiding privileged fields like is_organizer
      await updateProfile(user.id, {
        username: profileData.username,
        // We do NOT set is_organizer: true here as it's a privileged field
        // The existence of an organizer_profile record is the source of truth
      });
      
      toast.success('Profile setup complete! 🎉', {
        description: 'You can now start creating events',
        duration: 3000,
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Error saving organizer profile:', error);
      toast.error(error.message || 'Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="bg-purple-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#8A2BE2] px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-white text-lg sm:text-2xl font-bold">Setup Your Profile</h1>
              <p className="text-white/90 text-xs sm:text-sm">Tell us about your organization</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">✓</div>
              <span className="hidden sm:inline">Become Organizer</span>
            </div>
            <div className="w-12 h-0.5 bg-purple-600"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">2</div>
              <span className="hidden sm:inline font-semibold text-purple-600">Profile Setup</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">3</div>
              <span className="hidden sm:inline">Create Event</span>
            </div>
          </div>
        </div>

        {/* Required Fields Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-gray-900 text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Required Information
          </h2>

          {/* Username */}
          <div className="mb-5">
            <label className="block text-gray-900 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="username"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Your unique handle on Eventz</p>
          </div>

          {/* Organizer Name */}
          <div className="mb-5">
            <label className="block text-gray-900 mb-2">
              Organizer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profileData.organizerName}
                onChange={(e) => handleInputChange('organizerName', e.target.value)}
                placeholder="e.g., Shanga, Elements, STR8 OUT VIBES"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">This is how your organization will appear on events</p>
          </div>

          {/* Organizer Type */}
          <div className="mb-5">
            <label className="block text-gray-900 mb-3">
              Organizer Type <span className="text-red-500">*</span>
            </label>
            <p className="text-gray-500 text-sm mb-4">Select the category that best describes you</p>
            
            {/* Premium Card Selection */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {organizerTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = profileData.organizerType === type.name;
                
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInputChange('organizerType', type.name)}
                    className={`relative border-2 rounded-xl p-3 sm:p-4 transition-all hover:shadow-lg ${
                      isSelected 
                        ? 'border-[#8A2BE2] bg-purple-50 shadow-md scale-[1.02]' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-3">
                      {/* Minimal Black & White Icon */}
                      <div className={`w-12 h-12 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-[#8A2BE2] shadow-md' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <Icon className={`w-6 h-6 sm:w-6 sm:h-6 transition-colors ${
                          isSelected ? 'text-white' : 'text-gray-700'
                        }`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 w-full text-left sm:text-center">
                        <h3 className="text-gray-900 mb-0.5 sm:mb-1 text-base font-medium">{type.name}</h3>
                        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{type.description}</p>
                      </div>
                      
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 sm:top-3 sm:right-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#8A2BE2] rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Premium Venue Sub-Type Selection - Appears when Venue is selected */}
          {profileData.organizerType === 'Venue' && (
            <div className="mb-5">
              <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border-2 border-pink-200 shadow-lg">
                {/* Header with Icon */}
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A2BE2] rounded-xl flex items-center justify-center shadow-md">
                      <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-900 text-sm sm:text-base font-medium">
                        Venue Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-600 text-xs sm:text-sm">What type of venue do you operate?</p>
                    </div>
                  </div>
                </div>
                
                {/* Premium Vertical Stack (Mobile) / Grid (Desktop) Cards */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  {venueSubTypes.map((subType) => {
                    const Icon = subType.icon;
                    const isSelected = profileData.venueSubType === subType.name;
                    
                    return (
                      <button
                        key={subType.id}
                        type="button"
                        onClick={() => handleInputChange('venueSubType', subType.name)}
                        className={`group relative border-2 sm:border-3 rounded-xl sm:rounded-2xl p-2 sm:p-5 transition-all duration-300 h-full ${
                          isSelected 
                            ? 'border-[#8A2BE2] bg-white shadow-lg sm:shadow-2xl scale-[1.02] ring-2 sm:ring-4 ring-purple-200/50' 
                            : 'border-white bg-white/80 hover:border-pink-300 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                          {/* Icon Container */}
                          <div className={`relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] shadow-md sm:shadow-lg shadow-purple-300/60' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-pink-100 group-hover:to-purple-100'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-10 sm:h-10 transition-all duration-300 ${
                              isSelected ? 'text-white scale-110' : 'text-gray-600 group-hover:text-pink-600 group-hover:scale-110'
                            }`} />
                            
                            {/* Animated Pulse Ring on hover (non-selected only) */}
                            {!isSelected && (
                              <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-pink-400 animate-ping"></div>
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-400"></div>
                              </div>
                            )}

                            {/* Sparkle Effect on selected */}
                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></div>
                              </>
                            )}
                          </div>
                          
                          <div className="w-full">
                            {/* Name */}
                            <h4 className={`mb-0.5 sm:mb-1.5 text-xs sm:text-base font-medium transition-all duration-300 ${
                              isSelected ? 'text-[#8A2BE2]' : 'text-gray-900 group-hover:text-pink-600'
                            }`}>
                              {subType.name}
                            </h4>
                            
                            {/* Description - Hidden on mobile */}
                            <p className="hidden sm:block text-gray-500 text-xs leading-relaxed line-clamp-2">{subType.description}</p>
                          </div>
                        </div>
                        
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 sm:top-auto sm:right-auto sm:-bottom-3 sm:left-1/2 sm:translate-y-0 sm:-translate-x-1/2 animate-fadeIn">
                            <div className="w-4 h-4 sm:w-8 sm:h-8 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-full flex items-center justify-center shadow-lg shadow-purple-400/60 ring-1 sm:ring-4 ring-white">
                              <Check className="w-2 h-2 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        
                        {/* Glow Effect on selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-indigo-400/20 pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Enhanced Preview Badge */}
                {profileData.venueSubType && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-xl shadow-md animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-xl flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Your organizer type will be saved as:</p>
                        <p className="text-[#8A2BE2] flex items-center gap-2 text-sm sm:text-base">
                          <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Venue - {profileData.venueSubType}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Artist/Performer Sub-Type Selection */}
          {profileData.organizerType === 'Artist / Performer' && (
            <div className="mb-5">
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A2BE2] rounded-xl flex items-center justify-center shadow-md">
                      <Mic2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-900 text-sm sm:text-base font-medium">
                        Artist Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-600 text-xs sm:text-sm">What type of performer are you?</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  {artistSubTypes.map((subType) => {
                    const Icon = subType.icon;
                    const isSelected = profileData.venueSubType === subType.name;
                    
                    return (
                      <button
                        key={subType.id}
                        type="button"
                        onClick={() => handleInputChange('venueSubType', subType.name)}
                        className={`group relative border-2 sm:border-3 rounded-xl sm:rounded-2xl p-2 sm:p-5 transition-all duration-300 h-full ${
                          isSelected 
                            ? 'border-[#8A2BE2] bg-white shadow-lg sm:shadow-2xl scale-[1.02] ring-2 sm:ring-4 ring-purple-200/50' 
                            : 'border-white bg-white/80 hover:border-purple-300 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                          <div className={`relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] shadow-md sm:shadow-lg shadow-purple-300/60' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-pink-100'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-10 sm:h-10 transition-all duration-300 ${
                              isSelected ? 'text-white scale-110' : 'text-gray-600 group-hover:text-purple-600 group-hover:scale-110'
                            }`} />
                            
                            {!isSelected && (
                              <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-400 animate-ping"></div>
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-pink-400"></div>
                              </div>
                            )}

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></div>
                              </>
                            )}
                          </div>
                          
                          <div className="w-full">
                            <h4 className={`mb-0.5 sm:mb-1.5 text-xs sm:text-base font-medium transition-all duration-300 ${
                              isSelected ? 'text-[#8A2BE2]' : 'text-gray-900 group-hover:text-purple-600'
                            }`}>
                              {subType.name}
                            </h4>
                            
                            <p className="hidden sm:block text-gray-500 text-xs leading-relaxed line-clamp-2">{subType.description}</p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-1 right-1 sm:top-auto sm:right-auto sm:-bottom-3 sm:left-1/2 sm:translate-y-0 sm:-translate-x-1/2 animate-fadeIn">
                            <div className="w-4 h-4 sm:w-8 sm:h-8 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-full flex items-center justify-center shadow-lg shadow-purple-400/60 ring-1 sm:ring-4 ring-white">
                              <Check className="w-2 h-2 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-indigo-400/20 pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {profileData.venueSubType && profileData.organizerType === 'Artist / Performer' && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-xl shadow-md animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-xl flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Your organizer type will be saved as:</p>
                        <p className="text-[#8A2BE2] flex items-center gap-2 text-sm sm:text-base">
                          <Mic2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Artist / Performer - {profileData.venueSubType}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Organization/Institution Sub-Type Selection */}
          {profileData.organizerType === 'Organization / Institution' && (
            <div className="mb-5">
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A2BE2] rounded-xl flex items-center justify-center shadow-md">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-900 text-sm sm:text-base font-medium">
                        Organization Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-600 text-xs sm:text-sm">What type of organization are you?</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  {organizationSubTypes.map((subType) => {
                    const Icon = subType.icon;
                    const isSelected = profileData.venueSubType === subType.name;
                    
                    return (
                      <button
                        key={subType.id}
                        type="button"
                        onClick={() => handleInputChange('venueSubType', subType.name)}
                        className={`group relative border-2 sm:border-3 rounded-xl sm:rounded-2xl p-2 sm:p-5 transition-all duration-300 h-full ${
                          isSelected 
                            ? 'border-[#8A2BE2] bg-white shadow-lg sm:shadow-2xl scale-[1.02] ring-2 sm:ring-4 ring-purple-200/50' 
                            : 'border-white bg-white/80 hover:border-purple-300 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                          <div className={`relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] shadow-md sm:shadow-lg shadow-purple-300/60' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-pink-100'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-10 sm:h-10 transition-all duration-300 ${
                              isSelected ? 'text-white scale-110' : 'text-gray-600 group-hover:text-purple-600 group-hover:scale-110'
                            }`} />
                            
                            {!isSelected && (
                              <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-400 animate-ping"></div>
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-pink-400"></div>
                              </div>
                            )}

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></div>
                              </>
                            )}
                          </div>
                          
                          <div className="w-full">
                            <h4 className={`mb-0.5 sm:mb-1.5 text-xs sm:text-base font-medium transition-all duration-300 ${
                              isSelected ? 'text-[#8A2BE2]' : 'text-gray-900 group-hover:text-purple-600'
                            }`}>
                              {subType.name}
                            </h4>
                            
                            <p className="hidden sm:block text-gray-500 text-xs leading-relaxed line-clamp-2">{subType.description}</p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-1 right-1 sm:top-auto sm:right-auto sm:-bottom-3 sm:left-1/2 sm:translate-y-0 sm:-translate-x-1/2 animate-fadeIn">
                            <div className="w-4 h-4 sm:w-8 sm:h-8 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-full flex items-center justify-center shadow-lg shadow-purple-400/60 ring-1 sm:ring-4 ring-white">
                              <Check className="w-2 h-2 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-indigo-400/20 pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {profileData.venueSubType && profileData.organizerType === 'Organization / Institution' && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-xl shadow-md animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-xl flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Your organizer type will be saved as:</p>
                        <p className="text-[#8A2BE2] flex items-center gap-2 text-sm sm:text-base">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Organization / Institution - {profileData.venueSubType}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business/Corporate Sub-Type Selection */}
          {profileData.organizerType === 'Business / Corporate' && (
            <div className="mb-5">
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A2BE2] rounded-xl flex items-center justify-center shadow-md">
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-900 text-sm sm:text-base font-medium">
                        Business Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-600 text-xs sm:text-sm">What type of business are you?</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  {businessSubTypes.map((subType) => {
                    const Icon = subType.icon;
                    const isSelected = profileData.venueSubType === subType.name;
                    
                    return (
                      <button
                        key={subType.id}
                        type="button"
                        onClick={() => handleInputChange('venueSubType', subType.name)}
                        className={`group relative border-2 sm:border-3 rounded-xl sm:rounded-2xl p-2 sm:p-5 transition-all duration-300 h-full ${
                          isSelected 
                            ? 'border-[#8A2BE2] bg-white shadow-lg sm:shadow-2xl scale-[1.02] ring-2 sm:ring-4 ring-purple-200/50' 
                            : 'border-white bg-white/80 hover:border-purple-300 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                          <div className={`relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] shadow-md sm:shadow-lg shadow-purple-300/60' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-pink-100'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-10 sm:h-10 transition-all duration-300 ${
                              isSelected ? 'text-white scale-110' : 'text-gray-600 group-hover:text-purple-600 group-hover:scale-110'
                            }`} />
                            
                            {!isSelected && (
                              <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-400 animate-ping"></div>
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-pink-400"></div>
                              </div>
                            )}

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></div>
                              </>
                            )}
                          </div>
                          
                          <div className="w-full">
                            <h4 className={`mb-0.5 sm:mb-1.5 text-xs sm:text-base font-medium transition-all duration-300 ${
                              isSelected ? 'text-[#8A2BE2]' : 'text-gray-900 group-hover:text-purple-600'
                            }`}>
                              {subType.name}
                            </h4>
                            
                            <p className="hidden sm:block text-gray-500 text-xs leading-relaxed line-clamp-2">{subType.description}</p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-1 right-1 sm:top-auto sm:right-auto sm:-bottom-3 sm:left-1/2 sm:translate-y-0 sm:-translate-x-1/2 animate-fadeIn">
                            <div className="w-4 h-4 sm:w-8 sm:h-8 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-full flex items-center justify-center shadow-lg shadow-purple-400/60 ring-1 sm:ring-4 ring-white">
                              <Check className="w-2 h-2 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-indigo-400/20 pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {profileData.venueSubType && profileData.organizerType === 'Business / Corporate' && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-xl shadow-md animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-xl flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Your organizer type will be saved as:</p>
                        <p className="text-[#8A2BE2] flex items-center gap-2 text-sm sm:text-base">
                          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Business / Corporate - {profileData.venueSubType}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sports Club/Fitness Provider Sub-Type Selection */}
          {profileData.organizerType === 'Sports Club / Fitness Provider' && (
            <div className="mb-5">
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A2BE2] rounded-xl flex items-center justify-center shadow-md">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-900 text-sm sm:text-base font-medium">
                        Sports/Fitness Type <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-600 text-xs sm:text-sm">What type of sports/fitness provider are you?</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  {sportsSubTypes.map((subType) => {
                    const Icon = subType.icon;
                    const isSelected = profileData.venueSubType === subType.name;
                    
                    return (
                      <button
                        key={subType.id}
                        type="button"
                        onClick={() => handleInputChange('venueSubType', subType.name)}
                        className={`group relative border-2 sm:border-3 rounded-xl sm:rounded-2xl p-2 sm:p-5 transition-all duration-300 h-full ${
                          isSelected 
                            ? 'border-[#8A2BE2] bg-white shadow-lg sm:shadow-2xl scale-[1.02] ring-2 sm:ring-4 ring-purple-200/50' 
                            : 'border-white bg-white/80 hover:border-purple-300 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                          <div className={`relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] shadow-md sm:shadow-lg shadow-purple-300/60' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-pink-100'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-10 sm:h-10 transition-all duration-300 ${
                              isSelected ? 'text-white scale-110' : 'text-gray-600 group-hover:text-purple-600 group-hover:scale-110'
                            }`} />
                            
                            {!isSelected && (
                              <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-400 animate-ping"></div>
                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-pink-400"></div>
                              </div>
                            )}

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></div>
                              </>
                            )}
                          </div>
                          
                          <div className="w-full">
                            <h4 className={`mb-0.5 sm:mb-1.5 text-xs sm:text-base font-medium transition-all duration-300 ${
                              isSelected ? 'text-[#8A2BE2]' : 'text-gray-900 group-hover:text-purple-600'
                            }`}>
                              {subType.name}
                            </h4>
                            
                            <p className="hidden sm:block text-gray-500 text-xs leading-relaxed line-clamp-2">{subType.description}</p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-1 right-1 sm:top-auto sm:right-auto sm:-bottom-3 sm:left-1/2 sm:translate-y-0 sm:-translate-x-1/2 animate-fadeIn">
                            <div className="w-4 h-4 sm:w-8 sm:h-8 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-full flex items-center justify-center shadow-lg shadow-purple-400/60 ring-1 sm:ring-4 ring-white">
                              <Check className="w-2 h-2 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-indigo-400/20 pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {profileData.venueSubType && profileData.organizerType === 'Sports Club / Fitness Provider' && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-xl shadow-md animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#8A2BE2] to-[#6A1BB2] rounded-xl flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Your organizer type will be saved as:</p>
                        <p className="text-[#8A2BE2] flex items-center gap-2 text-sm sm:text-base">
                          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Sports Club / Fitness Provider - {profileData.venueSubType}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email */}
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@yourorganization.com"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+255 123 456 789"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Dar es Salaam, Tanzania"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Optional Fields Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-gray-900 text-base sm:text-lg mb-3 sm:mb-4">Optional Information</h2>

          {/* Website */}
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">Website</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Social Media</label>
            <div className="space-y-2 sm:space-y-3">
              {/* Instagram */}
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-500" />
                <input
                  type="text"
                  value={profileData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="Instagram username"
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
                />
              </div>

              {/* Facebook */}
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600" />
                <input
                  type="text"
                  value={profileData.facebook}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  placeholder="Facebook page"
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
                />
              </div>

              {/* Twitter */}
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-500" />
                <input
                  type="text"
                  value={profileData.twitter}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  placeholder="Twitter/X username"
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">About Your Organization</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell people about your organization, what events you organize, and what makes you unique..."
              rows={4}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Continue Button */}
        <div className="sticky bottom-4 sm:bottom-20 bg-purple-50 py-2 sm:py-4">
          <button
            onClick={handleSubmit}
            className="w-full bg-[#8A2BE2] text-white py-3 sm:py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-sm sm:text-base font-medium">Continue to Create Event</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <p className="text-center text-gray-500 text-[10px] sm:text-xs mt-2 sm:mt-3">
            You can edit this information later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}