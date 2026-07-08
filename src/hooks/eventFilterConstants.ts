import { Music2, GraduationCap, BriefcaseBusiness, Palette, Landmark, Dumbbell, Shirt } from 'lucide-react';
import type { TimeFilterId } from './useEventFilters';

export type LocationOption = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

export type CountryOption = {
  code: string;
  name: string;
  cities: string[];
  timeZones?: string[];
};

export type CategoryOption = {
  id: string;
  name: string;
  chipName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: string[];
};

export const categories: CategoryOption[] = [
  { id: 'all', name: 'All' },
  { id: 'entertainment', name: 'Entertainment', icon: Music2, subcategories: ['Concerts', 'Club Nights', 'Live Performances', 'Nightlife (Bars/Lounges)', 'Themed Parties'] },
  { id: 'business & tech', name: 'Business & Tech', icon: BriefcaseBusiness, subcategories: ['Startup Events', 'Networking', 'Conferences', 'Tech Talks'] },
  { id: 'sports & fitness', name: 'Sports & Fitness', chipName: 'Sports', icon: Dumbbell, subcategories: ['Fitness Classes', 'Competitions', 'Sports Events'] },
  { id: 'fashion', name: 'Fashion', icon: Shirt, subcategories: ['Runway Shows', 'Pop-Up Markets', 'Style and Beauty', 'Brand Launches', 'Fashion Weeks'] },
  { id: 'culture', name: 'Culture', icon: Palette, subcategories: ['Festivals', 'Arts', 'Theater', 'Food & Drink', 'Local Traditions', 'Fashion Events'] },
  { id: 'education', name: 'Education', icon: GraduationCap, subcategories: ['Workshops', 'Seminars', 'Webinars'] },
  { id: 'religion', name: 'Religion', icon: Landmark, subcategories: ['Worship Services', 'Religious Gatherings', 'Spiritual Events'] },
];

export type TimeFilterOption = {
  id: TimeFilterId;
  name: string;
};

export const timeFilters: TimeFilterOption[] = [
  { id: 'all', name: 'All Upcoming Events' },
  { id: 'today', name: 'Today' },
  { id: 'tomorrow', name: 'Tomorrow' },
  { id: 'weekend', name: 'This Weekend' },
  { id: 'month', name: 'This Month' },
];

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'TZ', name: 'Tanzania', cities: ['Dar es Salaam', 'Zanzibar', 'Arusha', 'Mwanza', 'Dodoma', 'Moshi', 'Tanga'], timeZones: ['Africa/Dar_es_Salaam'] },
  { code: 'KE', name: 'Kenya', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi'], timeZones: ['Africa/Nairobi'] },
  { code: 'UG', name: 'Uganda', cities: ['Kampala', 'Entebbe', 'Gulu', 'Jinja', 'Mbarara'], timeZones: ['Africa/Kampala'] },
  { code: 'RW', name: 'Rwanda', cities: ['Kigali', 'Butare', 'Gisenyi', 'Musanze'], timeZones: ['Africa/Kigali'] },
  { code: 'ET', name: 'Ethiopia', cities: ['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa'], timeZones: ['Africa/Addis_Ababa'] },
  { code: 'NG', name: 'Nigeria', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'], timeZones: ['Africa/Lagos'] },
  { code: 'ZA', name: 'South Africa', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Stellenbosch'], timeZones: ['Africa/Johannesburg'] },
  { code: 'GB', name: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds'], timeZones: ['Europe/London'] },
  { code: 'US', name: 'United States', cities: ['New York', 'Los Angeles', 'Atlanta', 'Chicago', 'Houston', 'Miami'], timeZones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver'] },
  { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], timeZones: ['Asia/Dubai'] },
];

export const DEFAULT_COUNTRY_CODE = 'TZ';
