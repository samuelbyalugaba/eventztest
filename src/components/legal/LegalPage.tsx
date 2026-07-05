import { Mail } from 'lucide-react';
import { BackButton } from '../ui/BackButton';
import { Link } from 'react-router-dom';
import { ACCOUNT_DELETION_URL, SUPPORT_EMAIL } from '../../utils/legal';

const TERMS_SECTIONS = [
  {
    title: 'Using Eventz',
    body: 'Eventz helps people discover events, follow creators, buy tickets, post community content, message other users, and join live experiences. Use the app lawfully and only share content you have the right to share.',
  },
  {
    title: 'Tickets and Payments',
    body: 'Physical event tickets are issued for the event shown at checkout. Organizers are responsible for event details, venue access, and fulfillment. Refunds, cancellations, and disputes are handled according to the organizer policy shown for the event or by contacting support.',
  },
  {
    title: 'Community Safety',
    body: 'Do not post harassment, hate, violence, nudity, scams, spam, or illegal content. Users can report content and block profiles. Reports may lead to removal, account restrictions, or organizer review.',
  },
  {
    title: 'Accounts',
    body: 'You are responsible for keeping your account secure. You can update your profile details and request account deletion from Privacy & Security in Settings or from the public account deletion page.',
  },
];

const PRIVACY_SECTIONS = [
  {
    title: 'Data We Collect',
    body: 'Eventz may collect account details, profile information, event and ticket activity, posts, comments, messages, media, wallet transaction records, device diagnostics, and approximate location when you choose to use location-based features.',
  },
  {
    title: 'How We Use Data',
    body: 'We use data to run the app, process ticketing and wallet activity, show relevant events, deliver messages and notifications, protect the community, prevent abuse, and provide support.',
  },
  {
    title: 'Sharing',
    body: 'Public profile, creator, event, post, comment, and live stream information may be visible to other users. Payment providers and infrastructure partners may process data needed to complete app functionality.',
  },
  {
    title: 'Your Choices',
    body: 'You can update profile visibility, message settings, and account details from Settings. You can delete your account from Privacy & Security, use the public account deletion page, or contact support for privacy requests.',
  },
];

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const switchTo = isPrivacy ? '/terms' : '/privacy';
  const switchLabel = isPrivacy ? 'Terms of Service' : 'Privacy Policy';

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 pt-[var(--eventz-safe-area-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <BackButton fallbackPath="/events" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <p className="text-xs text-gray-500">Eventz community and account policy</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm leading-6 text-gray-600">
            Last updated: May 29, 2026. Please review these terms before using Eventz.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Contact</h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-purple-700"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Account Deletion</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            You can request or complete account deletion from the public deletion page.
          </p>
          <Link to={ACCOUNT_DELETION_URL} className="mt-3 inline-flex text-sm font-medium text-purple-700">
            Delete account
          </Link>
        </section>

        <div className="mt-5 text-center text-sm">
          <Link to={switchTo} className="font-medium text-purple-700">
            View {switchLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
