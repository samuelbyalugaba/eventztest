import { X } from 'lucide-react';
import { shareViaWhatsApp, shareViaEmail, copyLinkToClipboard } from '../utils/share';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url?: string;
}

export function ShareModal({ isOpen, onClose, title, text, url }: ShareModalProps) {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    shareViaWhatsApp(title, text, url);
    onClose();
  };

  const handleEmail = () => {
    shareViaEmail(title, text, url);
    onClose();
  };

  const handleCopyLink = async () => {
    await copyLinkToClipboard(url);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Share</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div className="p-4">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="text-gray-900 font-medium">WhatsApp</p>
              <p className="text-gray-500 text-sm">Share via WhatsApp</p>
            </div>
          </button>

          {/* Email */}
          <button
            onClick={handleEmail}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-900 font-medium">Email</p>
              <p className="text-gray-500 text-sm">Share via email</p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-900 font-medium">Copy Link</p>
              <p className="text-gray-500 text-sm">Copy event link</p>
            </div>
          </button>
        </div>

        {/* Bottom Padding for mobile */}
        <div className="h-4 sm:h-2"></div>
      </div>
    </div>
  );
}
