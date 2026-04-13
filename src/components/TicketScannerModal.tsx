import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { scanTicket } from '../utils/supabase/api';

interface TicketScannerModalProps {
  eventId: number;
  eventTitle: string;
  events?: any[];
  onEventChange?: (event: any) => void;
  onClose: () => void;
}

export function TicketScannerModal({ eventId, eventTitle, events, onEventChange, onClose }: TicketScannerModalProps) {
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'reader';
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowEventSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Initialize scanner
    const initScanner = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          } as any,
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Error starting scanner:", err);
        toast.error("Failed to start camera. Please ensure permissions are granted.");
      }
    };

    if (isScanning) {
      initScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, [isScanning]);

  const onScanSuccess = async (decodedText: string) => {
    if (!scannerRef.current) return;
    
    // Pause scanning while processing
    await scannerRef.current.pause();
    setIsScanning(false);

    try {
      // Decode if it's a JSON string (some systems use JSON QR codes)
      // Otherwise assume it's the raw ticket code (barcode/uuid)
      let ticketCode = decodedText;
      
      // Call API
      const result = await scanTicket(ticketCode, eventId);
      setScanResult(result);
      
      if (result.success) {
        toast.success('Ticket Verified Successfully!');
        // Play success sound if desired
      } else {
        toast.error(result.message || 'Invalid Ticket');
        // Play error sound
      }

    } catch (error: any) {
      console.error("Scan processing error:", error);
      setScanResult({
        success: false,
        message: error.message || "Failed to verify ticket"
      });
    }
  };

  const onScanFailure = (_error: any) => {
    // Ignore frame failures, they happen constantly when no QR is in view
    // console.warn(`Code scan error = ${error}`);
  };

  const handleReset = async () => {
    setScanResult(null);
    setIsScanning(true);
    if (scannerRef.current) {
        try {
            await scannerRef.current.resume();
        } catch (e) {
            // If resume fails (e.g. was stopped), restart logic handled by effect dependency
            // But effect only runs on mount/unmount or isScanning change.
            // Since we set isScanning(true), effect will re-run if it was false.
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 z-10 relative">
          <div className="relative" ref={selectorRef}>
            <h2 className="text-lg font-bold text-gray-900">Scan Ticket</h2>
            {events && onEventChange ? (
              <button 
                onClick={() => setShowEventSelector(!showEventSelector)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#8A2BE2] transition-colors mt-0.5 group"
              >
                <span className="line-clamp-1 max-w-[200px] text-left">{eventTitle}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showEventSelector ? 'rotate-180 text-[#8A2BE2]' : ''}`} />
              </button>
            ) : (
              <p className="text-xs text-gray-500 line-clamp-1">{eventTitle}</p>
            )}

            {/* Event Selector Dropdown */}
            {showEventSelector && events && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 space-y-1">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        onEventChange?.(event);
                        setShowEventSelector(false);
                        // Reset scan result when changing event
                        setScanResult(null);
                        setIsScanning(true);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                        event.id === eventId 
                          ? 'bg-purple-50 text-[#8A2BE2] font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        event.id === eventId ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{event.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {event.id === eventId && <CheckCircle2 className="w-4 h-4 text-[#8A2BE2]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black aspect-square overflow-hidden">
          {!scanResult ? (
            <>
              <div id={regionId} className="w-full h-full" />
              {/* Overlay Guide */}
              <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#8A2BE2] -mt-1 -ml-1 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#8A2BE2] -mt-1 -mr-1 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#8A2BE2] -mb-1 -ml-1 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#8A2BE2] -mb-1 -mr-1 rounded-br-lg"></div>
                </div>
              </div>
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md">
                  Align QR code within frame
                </span>
              </div>
            </>
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center ${
              scanResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg animate-in zoom-in duration-300 ${
                scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {scanResult.success ? (
                  <CheckCircle2 className="w-12 h-12" />
                ) : (
                  <AlertCircle className="w-12 h-12" />
                )}
              </div>
              
              <h3 className={`text-2xl font-bold mb-2 ${
                scanResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {scanResult.success ? 'Valid Ticket' : 'Scan Failed'}
              </h3>
              
              <p className={`text-lg font-medium mb-6 ${
                scanResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {scanResult.message}
              </p>

              {scanResult.data && (
                <div className="bg-white/80 p-4 rounded-xl w-full mb-6 text-left shadow-sm border border-gray-100">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Attendee:</span>
                    <span className="font-semibold text-gray-900 text-right">{scanResult.data.customer_name}</span>
                    
                    <span className="text-gray-500">Type:</span>
                    <span className="font-semibold text-gray-900 text-right">{scanResult.data.ticket_type}</span>
                    
                    {scanResult.data.scanned_at && (
                      <>
                        <span className="text-gray-500">Scanned At:</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {new Date(scanResult.data.scanned_at).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold shadow-lg hover:opacity-90 transition-opacity ${
                  scanResult.success ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                <RefreshCw className="w-5 h-5" />
                Scan Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}