import { Eye } from 'lucide-react';
import { BackButton } from '../ui/BackButton';

interface StickyHeaderProps {
  onBack?: () => void;
  isEditing: boolean;
  isAutoSaving: boolean;
  onPreview: () => void;
}

export function StickyHeader({ onBack, isEditing, isAutoSaving, onPreview }: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 pt-[var(--eventz-safe-area-top)] backdrop-blur">
      <div className="mx-auto flex max-w-[460px] items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{isEditing ? 'Edit Event' : 'Create Event'}</h1>
            <p className="truncate text-xs text-gray-500">{isAutoSaving ? 'Saving draft...' : 'Host. Go Live. Sell Tickets'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onPreview}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"
            aria-label="Preview"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
