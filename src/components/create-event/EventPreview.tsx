import { EventCard } from '../EventCard';
import { Eye, Calendar, Tag, BarChart3 } from 'lucide-react';
import { BackButton } from '../ui/BackButton';

interface EventPreviewProps {
  formData: {
    title: string;
    category: string;
    subcategory: string;
    date: string;
    time: string;
    location: string;
    price: string;
    description: string;
    coverImage: string | null;
  };
  userProfile: any;
  savedEventId?: number;
  isEditing: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onPublish: () => void;
}

export function EventPreview({
  formData,
  userProfile,
  savedEventId,
  isEditing,
  isSubmitting,
  onBack,
  onPublish,
}: EventPreviewProps) {
  const previewEvent: any = {
    id: savedEventId || 0,
    title: formData.title || 'Untitled Event',
    category: formData.category,
    subcategory: formData.subcategory,
    date: formData.date || 'TBD',
    time: formData.time,
    location: formData.location || 'TBD',
    image_url: formData.coverImage || '',
    price_range: formData.price,
    description: formData.description,
    organizer: userProfile
      ? {
          full_name: userProfile.full_name || userProfile.username || 'You',
          id: userProfile.id,
          avatar_url: userProfile.avatar_url || '',
        }
      : { full_name: 'You', id: 'user', avatar_url: '' },
    streaming: { available: false, isLive: false },
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto animate-in fade-in">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 pt-[calc(1rem+var(--eventz-safe-area-top))] border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <BackButton
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            iconClassName="w-6 h-6 text-gray-900"
          />
          <h2 className="text-xl font-bold text-gray-900">Event Preview</h2>
        </div>
        <button
          onClick={onPublish}
          disabled={isSubmitting}
          className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
        >
          {isEditing ? 'Save Changes' : 'Publish Now'}
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Card Preview
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              This is how your event will appear in the main feed and search results.
            </p>
            <div className="max-w-sm mx-auto md:mx-0 shadow-2xl rounded-2xl transform hover:scale-105 transition-transform duration-300">
              <EventCard event={previewEvent} onClick={() => {}} />
            </div>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Details Preview
            </h3>
            <p className="text-gray-600 text-sm mb-6">Quick summary of your event details.</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formData.title || 'Untitled'}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  {formData.date || 'TBD'} • {formData.time || '--:--'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                  <p className="text-gray-900 mt-1 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-600" />
                    {formData.category}
                    {formData.subcategory && <span className="text-gray-400">/ {formData.subcategory}</span>}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price</label>
                  <p className="text-gray-900 mt-1">
                    <span className="text-purple-600 font-bold text-sm">{formData.price || 'Free'}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                  {formData.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
