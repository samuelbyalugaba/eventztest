import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  isSubmitting: boolean;
  disabled?: boolean;
  label: string;
}

export function SubmitButton({ isSubmitting, disabled, label }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isSubmitting}
      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gray-900 px-4 text-center text-sm font-semibold leading-tight text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? (
        <span className="inline-flex items-center justify-center">
          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
          Processing...
        </span>
      ) : (
        label
      )}
    </button>
  );
}
