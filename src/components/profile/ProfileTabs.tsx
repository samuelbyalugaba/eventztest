import { LayoutGrid, Ticket as TicketIcon, Calendar, Bookmark } from 'lucide-react';

export type ProfileTab = 'tickets' | 'events' | 'media' | 'streamed' | 'saved' | 'my_events' | 'upcoming';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isOwnProfile: boolean;
  isOrganizer: boolean;
}

export function ProfileTabs({ activeTab, onTabChange, isOwnProfile, isOrganizer }: ProfileTabsProps) {
  return (
    <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6 overflow-x-auto scrollbar-hide">
      <TabButton active={activeTab === 'media'} onClick={() => onTabChange('media')} icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Posts" />

      {isOwnProfile && !isOrganizer && (
        <TabButton active={activeTab === 'tickets'} onClick={() => onTabChange('tickets')} icon={<TicketIcon className="w-3.5 h-3.5" />} label="Tickets" />
      )}

      {isOrganizer && (
        <TabButton active={activeTab === 'upcoming'} onClick={() => onTabChange('upcoming')} icon={<Calendar className="w-3.5 h-3.5" />} label="Upcoming" />
      )}

      {isOwnProfile && (
        <TabButton active={activeTab === 'saved'} onClick={() => onTabChange('saved')} icon={<Bookmark className="w-3.5 h-3.5" />} label="Saved" />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
