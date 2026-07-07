import { Trash2, Loader2, ChevronRight } from 'lucide-react';

interface DeleteAccountSectionProps {
  isDeletingAccount: boolean;
  handleDeleteAccount: () => void;
}

export function DeleteAccountSection({ isDeletingAccount, handleDeleteAccount }: DeleteAccountSectionProps) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
        Account
      </p>
      <button
        type="button"
        onClick={handleDeleteAccount}
        disabled={isDeletingAccount}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            {isDeletingAccount ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-600">
              {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500">
              Permanently remove your profile, hosted events, posts, and saved items.
            </p>
          </div>
          {!isDeletingAccount && <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />}
        </div>
      </button>
    </div>
  );
}
