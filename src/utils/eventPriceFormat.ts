import { extractCurrencyFromPrice, currencies, formatPrice } from './currencies';
import type { Event } from './supabase/api';

export const getEventCurrency = (event: Event): string => {
  if (event.streaming?.virtualPrice) {
    const code = extractCurrencyFromPrice(event.streaming.virtualPrice);
    return code;
  }
  if (event.price_range) {
    const code = extractCurrencyFromPrice(event.price_range);
    return code;
  }
  if (event.ticket_tiers && event.ticket_tiers.length > 0) {
    const code = extractCurrencyFromPrice(event.ticket_tiers[0].price);
    return code;
  }
  return 'TZS';
};

export const formatEventPrice = (
  event: Event,
  price: string | number | null | undefined,
  allowTierFallback: boolean = true,
): string => {
  if (price === null || price === undefined) return 'Free';

  if (typeof price === 'number') {
    if (price === 0 || Number.isNaN(price)) return 'Free';
    const eventCurrencyCode = getEventCurrency(event);
    const currency = currencies.find(c => c.code === eventCurrencyCode);
    const symbol = currency ? currency.symbol : 'TSh';
    return `${symbol} ${price.toLocaleString()}`;
  }

  const priceStr = String(price).trim();

  if (priceStr.toLowerCase() === 'free') {
    return 'Free';
  }

  if (priceStr === '') {
    if (!allowTierFallback || !event.ticket_tiers || event.ticket_tiers.length === 0) {
      return 'Free';
    }
  }

  const numeric = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

  if (numeric === 0 && priceStr !== '' && priceStr.match(/^[\s0.]+$/)) {
    return 'Free';
  }

  if (allowTierFallback && priceStr === '' && event.ticket_tiers && event.ticket_tiers.length > 0) {
    const prices = event.ticket_tiers.map(t => {
      const tierPrice = parseFloat(String(t.price).replace(/[^0-9.]/g, '')) || 0;
      return tierPrice;
    }).filter(p => p > 0);

    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const eventCurrencyCode = getEventCurrency(event);
      const currency = currencies.find(c => c.code === eventCurrencyCode);
      const symbol = currency ? currency.symbol : 'TSh';
      return min === max
        ? `${symbol} ${min.toLocaleString()}`
        : `${symbol} ${min.toLocaleString()} - ${symbol} ${max.toLocaleString()}`;
    }
  }

  const hasDash = priceStr.includes(' - ') || priceStr.includes('-');
  const dashIndex = priceStr.indexOf('-');
  const isRange = hasDash && dashIndex > 0;

  if (isRange) {
    let parts = priceStr.split(' - ');
    if (parts.length === 1) {
      parts = priceStr.split(/\s*-\s*/);
    }
    if (parts.length === 2) {
      const formattedParts = parts.map(part => {
        const trimmed = part.trim();
        const hasCurrency = currencies.some(c =>
          trimmed.includes(c.symbol) || trimmed.includes(c.code)
        );

        if (hasCurrency) {
          return formatPrice(trimmed);
        } else {
          const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, '')) || 0;
          if (!numeric || Number.isNaN(numeric)) return trimmed;
          const eventCurrencyCode = getEventCurrency(event);
          const currency = currencies.find(c => c.code === eventCurrencyCode);
          const symbol = currency ? currency.symbol : 'TSh';
          return `${symbol} ${numeric.toLocaleString()}`;
        }
      });
      return formattedParts.join(' - ');
    }
  }

  const hasCurrency = currencies.some(c =>
    priceStr.includes(c.symbol) || priceStr.includes(c.code)
  );

  if (hasCurrency) {
    return formatPrice(price);
  }

  if (Number.isNaN(numeric)) {
    return 'Free';
  }

  if (numeric === 0) {
    return 'Free';
  }

  const eventCurrencyCode = getEventCurrency(event);
  const currency = currencies.find(c => c.code === eventCurrencyCode);
  const symbol = currency ? currency.symbol : 'TSh';

  return `${symbol} ${numeric.toLocaleString()}`;
};
