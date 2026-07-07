import { Check, Minus, Plus, Trash2, X } from 'lucide-react';
import { TIER_COLORS, DEFAULT_PERKS, type TicketTier } from './createEventHelpers';

interface TicketTierCardProps {
  tier: TicketTier;
  index: number;
  currency: string;
  tierFeatureDraft: string;
  onUpdate: (index: number, field: keyof TicketTier, value: string | number | string[]) => void;
  onAdjustCapacity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onToggleFeature: (index: number, feature: string) => void;
  onAddFeature: (index: number) => void;
  onFeatureDraftChange: (index: number, value: string) => void;
}

export function TicketTierCard({
  tier,
  index,
  currency,
  tierFeatureDraft,
  onUpdate,
  onAdjustCapacity,
  onRemove,
  onToggleFeature,
  onAddFeature,
  onFeatureDraftChange,
}: TicketTierCardProps) {
  const customFeatures = tier.features.filter(
    (feature) => !DEFAULT_PERKS.some((perk) => perk.toLowerCase() === feature.toLowerCase()),
  );

  return (
    <div key={tier.clientId || `ticket-tier-${index}`} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-7 w-1 rounded-full" style={{ backgroundColor: tier.color || TIER_COLORS[index % TIER_COLORS.length] }} />
        <input
          type="text"
          value={tier.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder="Tier name"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          aria-label="Ticket tier name"
        />
        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-purple-700">
          {tier.badge || 'TIER'}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          aria-label={`Remove ${tier.name || 'ticket tier'}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-2xs font-bold uppercase tracking-wide text-gray-500">Price ({currency})</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={tier.priceNumeric > 0 ? tier.priceNumeric : ''}
            onChange={(e) => onUpdate(index, 'priceNumeric', e.target.value)}
            placeholder="0"
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-2xs font-bold uppercase tracking-wide text-gray-500">Capacity</label>
          <div className="flex h-10 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1.5 focus-within:border-gray-400">
            <button
              type="button"
              onClick={() => onAdjustCapacity(index, -10)}
              className="capacity-stepper-button rounded-md bg-white text-gray-600 shadow-sm"
              aria-label="Decrease capacity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={tier.available > 0 ? tier.available : ''}
              onChange={(e) => onUpdate(index, 'available', e.target.value)}
              placeholder="0"
              className="h-8 min-w-0 flex-1 bg-transparent text-center text-sm font-semibold outline-none"
              aria-label="Ticket capacity"
            />
            <button
              type="button"
              onClick={() => onAdjustCapacity(index, 10)}
              className="capacity-stepper-button rounded-md bg-white text-gray-600 shadow-sm"
              aria-label="Increase capacity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {tier.name.toLowerCase().includes('early') && (
        <div className="mt-3">
          <label className="mb-1 block text-2xs font-bold uppercase tracking-wide text-gray-500">Sale ends</label>
          <input
            type="date"
            value={tier.saleEnds || ''}
            onChange={(e) => onUpdate(index, 'saleEnds', e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400"
          />
        </div>
      )}

      <div className="mt-3">
        <label className="mb-2 block text-2xs font-bold uppercase tracking-wide text-gray-500">Perks</label>
        {customFeatures.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-purple-100 bg-purple-50/60 p-2">
            {customFeatures.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => onToggleFeature(index, feature)}
                className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-700 shadow-sm"
                aria-label={`Remove ${feature}`}
              >
                <span className="truncate">{feature}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_PERKS.map((feature) => {
            const active = tier.features.includes(feature);
            return (
              <button
                key={feature}
                type="button"
                onClick={() => onToggleFeature(index, feature)}
                aria-pressed={active}
                className={`inline-flex h-9 min-w-0 items-center justify-start gap-1.5 rounded-lg border px-2.5 text-left text-xs font-medium transition ${
                  active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                {active && <Check className="h-3 w-3 shrink-0" />}
                <span className="truncate">{feature}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={tierFeatureDraft}
            onChange={(e) => onFeatureDraftChange(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddFeature(index);
              }
            }}
            placeholder="Custom perk"
            className="h-10 min-w-0 flex-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-400"
          />
          <button
            type="button"
            onClick={() => onAddFeature(index)}
            disabled={!tierFeatureDraft.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-3 text-xs font-semibold text-purple-700 transition enabled:bg-purple-50 enabled:hover:bg-purple-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
            aria-label="Add custom perk"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
