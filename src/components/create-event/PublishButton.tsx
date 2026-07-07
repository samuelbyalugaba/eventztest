import { Bolt } from 'lucide-react';

interface PublishButtonProps {
  isSubmitting: boolean;
  isEditing: boolean;
  onPublish: () => void;
}

export function PublishButton({ isSubmitting, isEditing, onPublish }: PublishButtonProps) {
  return (
    <button
      type="button"
      onClick={onPublish}
      disabled={isSubmitting}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-70"
    >
      {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Bolt className="h-4 w-4" />}
      {isEditing ? 'Save event' : 'Publish event'}
    </button>
  );
}
