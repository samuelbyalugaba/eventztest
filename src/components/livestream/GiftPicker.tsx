import { useState } from 'react';
import { X } from 'lucide-react';
import { GIFT_OPTIONS, type GiftOption } from './types';

interface GiftPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (gift: GiftOption) => void;
  isSending?: boolean;
}

export function GiftPicker({ isOpen, onClose, onSendGift, isSending }: GiftPickerProps) {
  const [selectedGift, setSelectedGift] = useState<GiftOption | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base">Send a Gift</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {GIFT_OPTIONS.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                selectedGift?.id === gift.id
                  ? 'bg-white/15 border-2 scale-105 shadow-lg'
                  : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
              }`}
              style={{
                borderColor: selectedGift?.id === gift.id ? gift.color : 'transparent',
                boxShadow: selectedGift?.id === gift.id ? `0 0 20px ${gift.color}30` : 'none',
              }}
            >
              <span className="text-sm font-bold" style={{ color: gift.color }}>{gift.iconLabel}</span>
              <span className="text-white/90 text-2xs font-semibold">{gift.name}</span>
              <span className="text-white/50 text-2xs">TZS {gift.amount.toLocaleString()}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (selectedGift) {
              onSendGift(selectedGift);
              setSelectedGift(null);
            }
          }}
          disabled={!selectedGift || isSending}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
            selectedGift
              ? 'bg-primary text-white shadow-lg active:scale-[0.98]'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          {isSending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : selectedGift ? (
            `Send ${selectedGift.name} - TZS ${selectedGift.amount.toLocaleString()}`
          ) : (
            'Select a gift'
          )}
        </button>
      </div>
    </div>
  );
}
