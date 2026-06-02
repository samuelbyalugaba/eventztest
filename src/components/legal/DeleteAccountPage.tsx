import { ArrowLeft, Loader2, Mail, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_OF_SERVICE_URL } from '../../utils/legal';

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignedInDeletion = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Eventz account deletion request`;
      return;
    }

    const confirmed = window.confirm('Delete your Eventz account permanently? This removes your profile, posts, saved items, and account access.');
    if (!confirmed) return;

    const typed = window.prompt('Type DELETE to confirm permanent account deletion.');
    if (typed !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
        body: {},
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      await supabase.auth.signOut();
      localStorage.removeItem('eventz-user-profile');
      localStorage.removeItem('eventz-privacy');
      toast.success('Account deleted');
      window.location.assign('/events');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 pt-[var(--eventz-safe-area-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => {
              if (location.key === 'default') navigate('/events', { replace: true });
              else navigate(-1);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">Delete Account</h1>
            <p className="text-xs text-gray-500">Permanent Eventz account removal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold">Request or complete account deletion</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Deleting your account removes your profile, posts, comments, saved items, follow relationships, and account access. Some transaction, safety, fraud-prevention, or legal records may be retained only as required by law or legitimate business obligations.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">If you are signed in</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use the button below to delete your account now. You can also find the same action in Settings under Privacy & Security.
          </p>
          <button
            type="button"
            onClick={handleSignedInDeletion}
            disabled={isDeleting}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? 'Deleting account...' : 'Delete my account'}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">If you cannot sign in</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Email support from the address linked to your Eventz account. Include your username and request account deletion.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Eventz account deletion request`}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900"
          >
            <Mail className="h-4 w-4" />
            Email support
          </a>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-gray-500">
          Review the{' '}
          <Link to={PRIVACY_POLICY_URL} className="font-medium text-purple-700">Privacy Policy</Link>
          {' '}and{' '}
          <Link to={TERMS_OF_SERVICE_URL} className="font-medium text-purple-700">Terms of Service</Link>.
        </p>
      </main>
    </div>
  );
}
