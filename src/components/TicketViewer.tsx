import { X, Download, Share2, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { formatPrice } from '../utils/currencies';
import { formatDateDMY } from '../utils/format';
import { toBlob } from 'html-to-image';

interface TicketEvent {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  ticketType: string;
  price: string;
  qrCode: string;
  ticketNumber?: string;
}

interface TicketViewerProps {
  ticket: TicketEvent;
  onClose: () => void;
}

export function TicketViewer({ ticket, onClose }: TicketViewerProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    const toastId = toast.loading('Taking screenshot...');
    
    try {
      const blob = await toBlob(ticketRef.current, { quality: 1, pixelRatio: 2, skipFonts: true });
      if (!blob) throw new Error('Failed to capture');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Eventz-Ticket-${ticket.id}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.dismiss(toastId);
      toast.success('Ticket saved', {
        description: 'Screenshot saved to your device',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      toast.dismiss(toastId);
      toast.error('Failed to take screenshot');
    }
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;
    try {
      if (navigator.share) {
        const toastId = toast.loading('Preparing to share...');
        const blob = await toBlob(ticketRef.current, { quality: 1, pixelRatio: 2, skipFonts: true });
        
        toast.dismiss(toastId);
        
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], `ticket-${ticket.id}.png`, { type: 'image/png' })] })) {
          await navigator.share({
            files: [new File([blob], `ticket-${ticket.id}.png`, { type: 'image/png' })],
            title: `Ticket: ${ticket.name}`,
            text: `Here is my ticket for ${ticket.name}!`,
          });
          toast.success('Shared successfully');
        } else {
           await navigator.share({
            title: `Ticket: ${ticket.name}`,
            text: `I'm going to ${ticket.name}! Join me!`,
            url: window.location.origin
          });
          toast.success('Shared successfully');
        }
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}`);
        toast.success('Link copied to clipboard', {
          description: 'Share your ticket link with friends',
          duration: 2000,
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         toast.error('Failed to share ticket');
      }
    }
  };

  // Use stored ticket number, fall back to stable format
  const ticketNumber = ticket.ticketNumber || `EVTZ-${ticket.id.toString().padStart(6, '0')}`;

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Close Button - Top Right */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[110] w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all flex items-center justify-center group"
      >
        <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Ticket Container */}
      <div className="relative w-full max-w-lg my-8" style={{ animation: 'slideUp 0.4s ease-out' }}>
        {/* Premium Ticket Card */}
        <div ref={ticketRef} className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-3xl shadow-2xl overflow-hidden">
          {/* Animated Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" style={{ animation: 'shimmer 3s infinite' }} />
          
          {/* Top Section - Event Image */}
          <div className="relative h-64 overflow-hidden">
            <ImageWithFallback
              src={ticket.image}
              alt={ticket.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* VIP Badge */}
            {ticket.ticketType === 'VIP' && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full">
                <span className="text-white text-xs font-semibold">VIP ACCESS</span>
              </div>
            )}
            
            {/* Event Category */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
              <span className="text-white text-xs font-medium">{ticket.category}</span>
            </div>
            
            {/* Event Name - Bottom of Image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-white text-2xl font-bold mb-1">{ticket.name}</h2>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <Ticket className="w-4 h-4" />
                <span>{ticket.ticketType}</span>
              </div>
            </div>
          </div>

          {/* Middle Section - Event Details */}
          <div className="p-6 space-y-4">
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs">Date</p>
                  <p className="text-white font-semibold">{formatDateDMY(ticket.date)}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs">Time</p>
                  <p className="text-white font-semibold">{ticket.time}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs">Location</p>
                <p className="text-white font-semibold">{ticket.location}</p>
              </div>
            </div>

            {/* Divider with Notches */}
            <div className="relative h-px bg-white/20 my-6">
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-black/90 rounded-r-full" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-black/90 rounded-l-full" />
              <div className="absolute left-0 right-0 flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex items-center justify-between gap-6">
              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white rounded-2xl p-2 shadow-lg">
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-pink-100 rounded-xl flex items-center justify-center p-2">
                    <QRCode
                      value={ticket.qrCode || `TICKET-${ticket.id}`}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="flex-1">
                <div className="space-y-3">
                  <div>
                    <p className="text-white/70 text-xs mb-1">Ticket Number</p>
                    <p className="text-white text-sm">{ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs mb-1">Price</p>
                    <p className="text-white text-2xl font-bold">{formatPrice(ticket.price)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-white/90 text-xs leading-relaxed">
                <span className="font-semibold">Show this QR code at the entrance.</span> Screenshot or save this ticket for offline access. Valid for one-time entry only.
              </p>
            </div>
          </div>

          {/* Bottom Section - Action Buttons */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-900 rounded-xl font-semibold hover:bg-white/90 transition-all"
            >
              <Download className="w-5 h-5" />
              Screenshot
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* EVENTZ Branding */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm flex items-center justify-center gap-2">
            Powered by <span className="font-bold text-white">EVENTZ</span>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        
        .shimmer-effect {
          animation: shimmer 3s infinite;
        }
      `}} />
    </div>
  );
}
