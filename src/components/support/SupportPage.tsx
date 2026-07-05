import { useState } from 'react';
import { ChevronRight, Heart, HelpCircle, Mail, MessageCircle, Phone } from 'lucide-react';
import { BackButton } from '../ui/BackButton';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from '../../utils/legal';

const SUPPORT_FAQS = [
  {
    question: 'How do I update my profile?',
    answer: 'Open Settings, choose Edit Profile, update your details, then tap Save Changes.',
  },
  {
    question: 'How do I create or manage events?',
    answer: 'Use Create Event from your profile. Organizers can manage events from Dashboard.',
  },
  {
    question: 'Where can I find my tickets?',
    answer: 'Open Profile, then use the Tickets tab or Wallet to see your purchased tickets.',
  },
  {
    question: 'How do I report a problem?',
    answer: 'Use Contact Support or Send Feedback here and include the event, account, or payment details involved.',
  },
];

const supportMailHref = (subject: string, body = '') => (
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`
);

export function SupportPage() {
  const [showFaqs, setShowFaqs] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 pt-[var(--eventz-safe-area-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <BackButton fallbackPath="/events" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">Help & Support</h1>
            <p className="text-xs text-gray-500">Get help with your Eventz account</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-purple-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">We're Here to Help</p>
              <p className="text-gray-600 text-sm">Get assistance with your Eventz account and find answers to common questions</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <a
            href={supportMailHref('Eventz Support Request', 'Hi Eventz Support,\n\nI need help with:\n\n')}
            className="block w-full p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <MessageCircle className="h-5 w-5 text-purple-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-0.5">Contact Support</p>
                <p className="text-gray-500 text-xs">Get help from our support team</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 group-hover:text-purple-600" />
            </div>
          </a>

          <button
            type="button"
            aria-expanded={showFaqs}
            onClick={() => setShowFaqs((c) => !c)}
            className="w-full p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 bg-cyan-100 rounded-xl flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                <HelpCircle className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-0.5">FAQs</p>
                <p className="text-gray-500 text-xs">Find answers to common questions</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 group-hover:text-purple-600" />
            </div>
          </button>

          {showFaqs && (
            <div className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
              {SUPPORT_FAQS.map((faq) => (
                <div key={faq.question} className="border-b border-cyan-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-gray-900">{faq.question}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          )}

          <a
            href={supportMailHref('Eventz Feedback', 'Hi Eventz Team,\n\nMy feedback is:\n\n')}
            className="block w-full p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 bg-pink-100 rounded-xl flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-0.5">Send Feedback</p>
                <p className="text-gray-500 text-xs">Help us improve Eventz</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 group-hover:text-purple-600" />
            </div>
          </a>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-sm mb-4">Contact Information</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-600 text-sm hover:text-purple-700">
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-gray-600 text-sm hover:text-purple-700">
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
