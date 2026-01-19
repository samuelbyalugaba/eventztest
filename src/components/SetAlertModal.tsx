import { useState } from 'react';
import { X, Bell, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SetAlertModalProps {
  event: {
    title?: string;
    name?: string;
    date: string;
    time?: string;
    location?: string;
  };
  onClose: () => void;
}

type ReminderTime = '24hours' | '2days' | '1week' | 'custom';

export function SetAlertModal({ event, onClose }: SetAlertModalProps) {
  const [selectedReminder, setSelectedReminder] = useState<ReminderTime>('24hours');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');

  const quickOptions: { id: ReminderTime; label: string; time: string }[] = [
    { id: '24hours', label: '24 Hours', time: '24 hours' },
    { id: '2days', label: '2 Days', time: '2 days' },
    { id: '1week', label: '1 Week', time: '1 week' },
  ];

  const handleSetAlert = () => {
    if (selectedReminder === 'custom' && (!customDate || !customTime)) {
      toast.error('Please select a date and time for your custom reminder');
      return;
    }

    const message = selectedReminder === 'custom' 
      ? `Alert set for ${new Date(customDate).toLocaleDateString()} at ${customTime}`
      : `You'll be reminded ${quickOptions.find(opt => opt.id === selectedReminder)?.time} before ${event.title || event.name}`;
    
    toast.success(message);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with Gradient */}
        <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 px-6 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 pointer-events-none"></div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors z-10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-white pointer-events-none" />
          </button>

          <div className="relative pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white text-2xl mb-2">Set Event Alert</h2>
            <p className="text-white/90 text-sm">Never miss this event! Choose when you'd like to be reminded.</p>
          </div>
        </div>

        {/* Event Info Card */}
        <div className="px-6 pt-6">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 mb-6">
            <h3 className="text-gray-900 mb-2 line-clamp-1">{event.title || event.name}</h3>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>{event.date}{event.time ? ` at ${event.time}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Options */}
        <div className="px-6 pb-6">
          <h3 className="text-gray-900 text-sm mb-3">Remind me:</h3>
          
          {/* Quick Options - 3 in a row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {quickOptions.map((option) => {
              const isSelected = selectedReminder === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedReminder(option.id)}
                  className={`py-3 px-2 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm text-center">{option.label}</div>
                </button>
              );
            })}
          </div>

          {/* Custom Date & Time Section */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            selectedReminder === 'custom'
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 bg-white'
          }`}>
            <button
              onClick={() => setSelectedReminder('custom')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <Bell className={`w-5 h-5 ${selectedReminder === 'custom' ? 'text-purple-600' : 'text-gray-600'}`} />
                <span className={`text-sm ${selectedReminder === 'custom' ? 'text-gray-900' : 'text-gray-700'}`}>
                  Custom Date & Time
                </span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                selectedReminder === 'custom'
                  ? 'border-purple-600 bg-purple-600'
                  : 'border-gray-300'
              }`}>
                {selectedReminder === 'custom' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </button>

            {/* Date/Time Inputs - Show when custom is selected */}
            {selectedReminder === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-200">
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 block">Time</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSetAlert}
              className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Set Alert
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 pb-6">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900">
              You'll receive a push notification at your chosen time. Make sure notifications are enabled in your device settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}