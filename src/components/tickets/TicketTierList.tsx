import { Minus, Plus, Sparkles, Crown, Ticket } from 'lucide-react';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
}

interface TicketTierListProps {
  tiers: TicketTier[];
  selections: Record<string, number>;
  onUpdateQuantity: (tierName: string, delta: number) => void;
  formatPrice: (price: string) => string;
}

function getTierIcon(name: string | null | undefined) {
  if (!name) return <Ticket className="w-5 h-5" />;
  const lowerName = name.toLowerCase();
  if (lowerName.includes('vvip')) return <Crown className="w-5 h-5" />;
  if (lowerName.includes('vip')) return <Sparkles className="w-5 h-5" />;
  return <Ticket className="w-5 h-5" />;
}

export function TicketTierList({ tiers, selections, onUpdateQuantity, formatPrice }: TicketTierListProps) {
  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const quantity = selections[tier.name] || 0;
        const isSelected = quantity > 0;

        return (
          <div
            key={tier.name}
            className={`border-2 rounded-xl p-4 transition-all ${
              isSelected ? 'border-primary bg-purple-50/50' : 'border-gray-100 hover:border-purple-200'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {getTierIcon(tier.name)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{tier.name}</h3>
                  <p className="text-sm text-gray-500">{formatPrice(tier.price)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                <button
                  onClick={() => onUpdateQuantity(tier.name, -1)}
                  disabled={quantity === 0}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${quantity === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-lg w-6 text-center text-gray-900">{quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(tier.name, 1)}
                  disabled={quantity >= tier.available}
                  className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 ml-12">
              {tier.features.slice(0, 2).map((f, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-white/50 rounded-md text-gray-500 border border-gray-100">{f}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
