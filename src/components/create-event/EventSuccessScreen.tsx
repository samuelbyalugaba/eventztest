import { Calendar, CheckCircle, Sparkles, Share2, Users, Eye, TrendingUp, BarChart3 } from 'lucide-react';
import { ShareModal } from '../ShareModal';
import { handleShare as shareUtil } from '../../utils/share';
import { useState } from 'react';

interface EventSuccessScreenProps {
  formData: {
    title: string;
    date: string;
    time: string;
    location: string;
    price: string;
    coverImage: string | null;
  };
  analytics: any;
  onBack?: () => void;
}

export function EventSuccessScreen({ formData, analytics, onBack }: EventSuccessScreenProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
            <Sparkles className="w-6 h-6 text-pink-400 absolute -bottom-1 -left-1 animate-pulse" />
          </div>
          <h1 className="text-gray-900 text-4xl mb-3">Event Published!</h1>
          <p className="text-gray-600 text-lg">Your event is now live on EVENTZ</p>
        </div>

        {/* Event Summary Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
          <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-600">
            {formData.coverImage ? (
              <img src={formData.coverImage} alt={formData.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Calendar className="w-16 h-16 text-white/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-white text-2xl mb-1">{formData.title || 'Untitled Event'}</h2>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formData.date || 'TBD'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-gray-200 border-y border-gray-200">
            <div className="bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-5 h-5 text-purple-600" />
                <p className="text-gray-900 text-xl">{analytics?.interested?.total || 0}</p>
              </div>
              <p className="text-gray-600 text-xs">Interested</p>
            </div>
            <div className="bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Eye className="w-5 h-5 text-cyan-600" />
                <p className="text-gray-900 text-xl">{analytics?.views?.total || 0}</p>
              </div>
              <p className="text-gray-600 text-xs">Views</p>
            </div>
            <div className="bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Share2 className="w-5 h-5 text-pink-600" />
                <p className="text-gray-900 text-xl">{analytics?.shares?.total || 0}</p>
              </div>
              <p className="text-gray-600 text-xs">Shares</p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-gray-900 mb-2">Boost Your Event</h3>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Share on social media to reach more people</li>
                  <li>• Add engaging photos and videos</li>
                  <li>• Enable live streaming for virtual attendance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={async () => {
              const shared = await shareUtil({
                title: formData.title,
                text: `${formData.date}\nPrice: ${formData.price}`,
                url: window.location.href,
              });
              if (!shared) setShowShareModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition-all"
          >
            <Share2 className="w-5 h-5" />
            Share Event
          </button>
          <button
            onClick={() => { if (onBack) onBack(); }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
          >
            <BarChart3 className="w-5 h-5" />
            View Dashboard
          </button>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={formData.title}
        text={`${formData.date} at ${formData.location}\nPrice: ${formData.price}`}
        url={window.location.href}
      />
    </div>
  );
}
