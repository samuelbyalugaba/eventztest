import { Eye, Ticket } from 'lucide-react';
import { formatEventPrice, getEventCurrency } from '../../utils/eventPriceFormat';
import { currencies } from '../../utils/currencies';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailTicketSectionProps {
  event: ApiEvent;
  displayViews: number;
  externalTicketing: boolean;
  onTierSelect?: (event: ApiEvent, tierName: string) => void;
}

export function EventDetailTicketSection({
  event,
  displayViews,
  externalTicketing,
  onTierSelect,
}: EventDetailTicketSectionProps) {
  return (
    <>
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-600 text-sm mb-1">Ticket Price</p>
            <p className="text-gray-900">{formatEventPrice(event, event.price_range)}</p>
          </div>
          <div className="mt-0.5 flex shrink-0 items-center gap-2 text-primary">
            <Eye className="w-5 h-5" />
            <span className="text-sm">
              {displayViews.toLocaleString()} {displayViews === 1 ? 'view' : 'views'}
            </span>
          </div>
        </div>
      </div>

      {event.ticket_tiers && event.ticket_tiers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-900 font-semibold mb-3">
            Ticket Prices
          </h3>
          <div className="space-y-2">
            {event.ticket_tiers.map((tier, index) => {
              const tierPerks = Array.isArray(tier.features) ? tier.features.filter(Boolean) : [];

              return (
                <div
                  key={index}
                  onClick={() => !externalTicketing && onTierSelect && onTierSelect(event, tier.name)}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 transition-colors ${externalTicketing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 block">{tier.name}</span>
                      {tierPerks.length > 0 && (
                        <p className="mt-1 max-w-full text-xs leading-snug text-gray-500 [overflow-wrap:anywhere]">
                          {tierPerks.slice(0, 4).join(' • ')}
                          {tierPerks.length > 4 ? ` • +${tierPerks.length - 4} more` : ''}
                        </p>
                      )}
                      {tier.available < 10 && (
                        <span className="mt-1 block text-xs text-red-500 font-medium">
                          Only {tier.available} left
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap pt-1 font-bold text-gray-900">
                    {(() => {
                      if (tier.priceNumeric !== undefined && tier.priceNumeric !== null && !isNaN(tier.priceNumeric)) {
                        if (tier.priceNumeric === 0) return 'Free';
                        const eventCurrencyCode = getEventCurrency(event);
                        const currency = currencies.find(c => c.code === eventCurrencyCode);
                        const symbol = currency ? currency.symbol : 'TSh';
                        return `${symbol} ${tier.priceNumeric.toLocaleString()}`;
                      }
                      return formatEventPrice(event, tier.price);
                    })()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
