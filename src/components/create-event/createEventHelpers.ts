import { type ComponentType } from 'react';
import {
  Briefcase,
  Bolt,
  Calendar,
  CheckCircle,
  Church,
  Crown,
  Dumbbell,
  GraduationCap,
  Mic,
  Music,
  Palette,
  Settings,
  Shirt,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';
import { currencies, extractCurrencyFromPrice } from '../../utils/currencies';

export type IconType = ComponentType<{ className?: string }>;

export interface TicketTier {
  clientId?: string;
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
  badge?: string;
  saleEnds?: string;
  registrationRequired?: boolean;
}

export const TIER_COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#06B6D4', '#F97316'];
export const CREATE_CURRENCY_CODES = ['TZS', 'KES', 'UGX', 'USD', 'GBP', 'EUR', 'ZAR'];
export const DEFAULT_FREE_PERKS = ['Free entry', 'Networking'];
export const DEFAULT_PERKS = [
  'General entry',
  'Priority entry',
  'Reserved seating',
  'Digital pass',
];

export const eventCategories: {
  name: string;
  icon: IconType;
  subcategories: { name: string; icon: IconType }[];
}[] = [
  {
    name: 'Entertainment',
    icon: Music,
    subcategories: [
      { name: 'Concerts', icon: Mic },
      { name: 'Club Nights', icon: Sparkles },
      { name: 'Live Performances', icon: Music },
      { name: 'Nightlife', icon: Sparkles },
      { name: 'Themed Parties', icon: Crown },
      { name: 'Comedy Shows', icon: Mic },
    ],
  },
  {
    name: 'Education',
    icon: GraduationCap,
    subcategories: [
      { name: 'Workshops', icon: Settings },
      { name: 'Seminars', icon: GraduationCap },
      { name: 'Webinars', icon: Tv },
      { name: 'Bootcamps', icon: Bolt },
      { name: 'Talks and Panels', icon: Users },
      { name: 'Masterclasses', icon: CheckCircle },
    ],
  },
  {
    name: 'Business & Tech',
    icon: Briefcase,
    subcategories: [
      { name: 'Startup Events', icon: Bolt },
      { name: 'Networking', icon: Users },
      { name: 'Conferences', icon: Briefcase },
      { name: 'Talks and Panels', icon: Users },
      { name: 'Product Launches', icon: Sparkles },
      { name: 'Trade Shows', icon: Settings },
    ],
  },
  {
    name: 'Culture',
    icon: Palette,
    subcategories: [
      { name: 'Festivals', icon: Sparkles },
      { name: 'Arts and Exhibitions', icon: Palette },
      { name: 'Theatre', icon: Users },
      { name: 'Food and Drink', icon: Crown },
      { name: 'Local Traditions', icon: Church },
      { name: 'Film and Cinema', icon: Tv },
    ],
  },
  {
    name: 'Religion',
    icon: Church,
    subcategories: [
      { name: 'Worship and Services', icon: Church },
      { name: 'Youth and Community', icon: Users },
      { name: 'Spiritual Retreats', icon: Sparkles },
      { name: 'Religious Celebrations', icon: CheckCircle },
    ],
  },
  {
    name: 'Sports & Fitness',
    icon: Dumbbell,
    subcategories: [
      { name: 'Fitness and Wellness', icon: Dumbbell },
      { name: 'Tournaments', icon: Crown },
      { name: 'Live Matches', icon: Users },
      { name: 'Marathons and Runs', icon: Dumbbell },
      { name: 'Sports Camps', icon: Settings },
    ],
  },
  {
    name: 'Fashion',
    icon: Shirt,
    subcategories: [
      { name: 'Runway Shows', icon: Sparkles },
      { name: 'Pop-Up Markets', icon: Shirt },
      { name: 'Style and Beauty', icon: Palette },
      { name: 'Brand Launches', icon: Bolt },
      { name: 'Fashion Weeks', icon: Calendar },
    ],
  },
];

export const createCurrencies = CREATE_CURRENCY_CODES
  .map((code) => currencies.find((currency) => currency.code === code))
  .filter((currency): currency is (typeof currencies)[number] => Boolean(currency));

const getCurrency = (code: string) => createCurrencies.find((currency) => currency.code === code) || createCurrencies[0];

const getCurrencySymbol = (code: string) => getCurrency(code)?.symbol || code;

let tierClientIdCounter = 0;
export const createTierClientId = () => `ticket-tier-${Date.now()}-${tierClientIdCounter++}`;

export const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseFloat(String(value || '').replace(/[^0-9.]/g, '')) || 0;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

export const normalizeDateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  let year = 0;
  let month = 0;
  let day = 0;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slashMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (slashMatch) {
    month = Number(slashMatch[1]);
    day = Number(slashMatch[2]);
    year = Number(slashMatch[3]);
  } else {
    return '';
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export const normalizeTimeInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const compactMatch = trimmed.match(/^(\d{1,2})(\d{2})$/);
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  const match = colonMatch || compactMatch;
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';

  return `${pad2(hours)}:${pad2(minutes)}`;
};

export const formatMoney = (amount: number, currencyCode: string) => {
  const symbol = getCurrencySymbol(currencyCode);
  return amount > 0 ? `${symbol} ${amount.toLocaleString()}` : `${symbol} 0`;
};

export const normalizeIncomingTiers = (event: any, currencyCode: string): TicketTier[] => {
  const rawTiers = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers : [];

  if (rawTiers.length > 0) {
    return rawTiers.map((tier: any, index: number) => {
      const priceNumeric = typeof tier.priceNumeric === 'number' ? tier.priceNumeric : parseMoney(tier.price);
      return {
        clientId: createTierClientId(),
        name: tier.name || (priceNumeric > 0 ? 'Ticket' : 'Free Entry'),
        price: tier.price || (priceNumeric > 0 ? formatMoney(priceNumeric, currencyCode) : 'Free'),
        priceNumeric,
        available: Math.max(0, Number(tier.available ?? tier.quantity ?? 100) || 0),
        features: Array.isArray(tier.features) ? tier.features.filter(Boolean) : [],
        color: tier.color || TIER_COLORS[index % TIER_COLORS.length],
        badge: tier.badge,
        saleEnds: tier.saleEnds,
        registrationRequired: tier.registrationRequired,
      };
    });
  }

  const existingPrice = event?.price_range || event?.price;
  const numeric = parseMoney(existingPrice);
  if (existingPrice && String(existingPrice).toLowerCase() !== 'free' && numeric > 0) {
    return [
      {
        clientId: createTierClientId(),
        name: 'General Admission',
        price: formatMoney(numeric, currencyCode),
        priceNumeric: numeric,
        available: Number(event?.attendees) || 100,
        features: ['General entry'],
        color: TIER_COLORS[0],
        badge: 'GA',
      },
    ];
  }

  return [];
};

export const calculatePriceRange = (tiers: TicketTier[], currencyCode: string): string => {
  const validPrices = tiers
    .map((tier) => Number(tier.priceNumeric))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (validPrices.length === 0) return '';

  const min = Math.min(...validPrices);
  const max = Math.max(...validPrices);
  return min === max ? formatMoney(min, currencyCode) : `${formatMoney(min, currencyCode)} - ${formatMoney(max, currencyCode)}`;
};

export const getInitialCurrency = (event: any) => {
  const direct = event?.currency;
    if (typeof direct === 'string' && CREATE_CURRENCY_CODES.includes(direct.trim())) return direct.trim();

  const tierPrice = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers.find((tier: any) => tier?.price)?.price : null;
  if (typeof tierPrice === 'string' && tierPrice.trim()) {
    const detected = extractCurrencyFromPrice(tierPrice);
    return CREATE_CURRENCY_CODES.includes(detected) ? detected : 'TZS';
  }

  const priceRange = event?.price_range || event?.price;
  if (typeof priceRange === 'string' && priceRange.trim()) {
    const detected = extractCurrencyFromPrice(priceRange);
    return CREATE_CURRENCY_CODES.includes(detected) ? detected : 'TZS';
  }

  return 'TZS';
};

export const isFreeEvent = (event: any) => {
  const priceRange = String(event?.price_range || event?.price || '').trim().toLowerCase();
  const rawTiers = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers : [];
  return priceRange === 'free' || (rawTiers.length > 0 && rawTiers.every((tier: any) => parseMoney(tier?.priceNumeric ?? tier?.price) === 0));
};

export const getExternalTicketingPhone = (streaming: any) => {
  if (typeof streaming?.externalTicketing?.phone === 'string') return streaming.externalTicketing.phone;
  if (typeof streaming?.externalTicketingPhone === 'string') return streaming.externalTicketingPhone;
  return '';
};
