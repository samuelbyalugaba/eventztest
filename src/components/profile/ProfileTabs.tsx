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
    <div className="bg-gray-100 p-1 rounded-xl flex mb-5 overflow-x-auto scrollbar-hide">
      <TabButton active={activeTab === 'media'} onClick={() => onTabChange('media')} icon={<LayoutGrid className="w-3 h-3" />} label="Posts" />

      {isOwnProfile && !isOrganizer && (
        <TabButton active={activeTab === 'tickets'} onClick={() => onTabChange('tickets')} icon={<TicketIcon className="w-3 h-3" />} label="Tickets" />
      )}

      {isOrganizer && (
        <TabButton active={activeTab === 'upcoming'} onClick={() => onTabChange('upcoming')} icon={<Calendar className="w-3 h-3" />} label="Upcoming" />
      )}

      {isOwnProfile && (
        <TabButton active={activeTab === 'saved'} onClick={() => onTabChange('saved')} icon={<Bookmark className="w-3 h-3" />} label="Saved" />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-h-8 min-w-[76px] py-1.5 text-[0.72rem] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
