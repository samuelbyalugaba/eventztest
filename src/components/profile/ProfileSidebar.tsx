import { Menu, Wallet, User, BarChart3, Settings, LogOut, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '../ui/sheet';
import { UserAvatar } from '../UserAvatar';
import { toast } from 'sonner';

interface ProfileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profileImage?: string;
  displayName: string;
  username?: string;
  isOrganizer: boolean;
  onEditProfile: () => void;
  onSettings: () => void;
  onDashboard: () => void;
  onWallet?: () => void;
  onLogout?: () => Promise<void>;
}

export function ProfileSidebar({
  isOpen,
  onOpenChange,
  profileImage,
  displayName,
  username,
  isOrganizer,
  onEditProfile,
  onSettings,
  onDashboard,
  onWallet,
  onLogout,
}: ProfileSidebarProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <Menu className="w-7 h-7" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 bg-white border-l border-gray-100 h-[75vh] bottom-auto overflow-hidden">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigation menu for wallet, dashboard, settings, and logout.
        </SheetDescription>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden ring-1 ring-gray-100">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserAvatar name={displayName} className="w-full h-full text-base" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-gray-900 text-base leading-tight">{displayName}</h3>
                <p className="truncate text-gray-500 text-sm">@{username || 'user'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <SidebarButton icon={<Wallet className="w-4 h-4 stroke-[1.5]" />} label="Wallet" onClick={() => { onWallet?.(); onOpenChange(false); }} />
            <SidebarButton icon={<User className="w-4 h-4 stroke-[1.5]" />} label="Edit Profile" onClick={() => { onEditProfile(); onOpenChange(false); }} />
            {isOrganizer && (
              <SidebarButton icon={<BarChart3 className="w-4 h-4 stroke-[1.5]" />} label="Professional Dashboard" onClick={() => { onDashboard(); onOpenChange(false); }} />
            )}
            <SidebarButton icon={<Settings className="w-4 h-4 stroke-[1.5]" />} label="Settings" onClick={() => { onSettings(); onOpenChange(false); }} />

            <div className="my-2 border-t border-gray-50" />

            <button
              onClick={() => {
                onOpenChange(false);
                onLogout?.().then(() => toast.success('Logged out'));
              }}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 stroke-[1.5]" />
              <span className="font-medium text-[15px]">Log out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SidebarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3.5 text-gray-700 group-hover:text-gray-900">
        {icon}
        <span className="font-medium text-[15px]">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  );
}
