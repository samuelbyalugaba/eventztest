import { useState } from 'react';
import { HelpCircle, MessageCircle, Heart, ChevronRight, Mail, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../utils/legal';

const supportMailHref = (subject: string, body = '') => (
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`
);

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

export function HelpSupportView() {
  const [showFaqs, setShowFaqs] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 mb-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-gray-900 font-medium mb-1">We're Here to Help</p>
            <p className="text-gray-600 text-sm">Get assistance with your EVENTZ account and find answers to common questions</p>
          </div>
        </div>
      </div>

      <a
        href={supportMailHref('EVENTZ Support Request', 'Hi EVENTZ Support,\n\nI need help with:\n\n')}
        className="block w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium text-sm mb-1">Contact Support</p>
            <p className="text-gray-500 text-xs">Get help from our support team</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
        </div>
      </a>

      <button
        type="button"
        aria-expanded={showFaqs}
        onClick={() => setShowFaqs((current) => !current)}
        className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
            <HelpCircle className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium text-sm mb-1">FAQs</p>
            <p className="text-gray-500 text-xs">Find answers to common questions</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
        </div>
      </button>
      {showFaqs && (
        <div className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
          {SUPPORT_FAQS.map((faq) => (
            <div key={faq.question} className="border-b border-cyan-100 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-gray-900">{faq.question}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      )}

      <a
        href={supportMailHref('EVENTZ Feedback', 'Hi EVENTZ Team,\n\nMy feedback is:\n\n')}
        className="block w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
            <Heart className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium text-sm mb-1">Send Feedback</p>
            <p className="text-gray-500 text-xs">Help us improve EVENTZ</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
        </div>
      </a>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
        <p className="text-gray-900 font-medium text-sm mb-4">Contact Information</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-600 text-sm hover:text-purple-700">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-gray-600 text-sm hover:text-purple-700">
              {SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={TERMS_OF_SERVICE_URL}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 hover:border-purple-200 hover:bg-purple-50"
        >
          Terms
        </a>
        <a
          href={PRIVACY_POLICY_URL}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 hover:border-purple-200 hover:bg-purple-50"
        >
          Privacy
        </a>
      </div>

      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-5 border border-purple-200 text-center">
        <p className="text-gray-700 font-medium mb-2">EVENTZ</p>
        <p className="text-gray-600 text-sm mb-1">Version 1.0.0</p>
      </div>
    </div>
  );
}
