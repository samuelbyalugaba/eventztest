import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EditCaptionModalProps {
  isOpen: boolean;
  initialCaption: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (caption: string) => void;
}

export function EditCaptionModal({
  isOpen,
  initialCaption,
  isSaving = false,
  onClose,
  onSave,
}: EditCaptionModalProps) {
  const [caption, setCaption] = useState(initialCaption);

  useEffect(() => {
    if (isOpen) setCaption(initialCaption);
  }, [initialCaption, isOpen]);

  if (!isOpen) return null;

  const canSave = caption !== initialCaption && !isSaving;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-950">Edit caption</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close edit caption"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className="min-h-32 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-950 outline-none transition-colors focus:border-purple-500 focus:bg-white"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(caption)}
            disabled={!canSave}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
