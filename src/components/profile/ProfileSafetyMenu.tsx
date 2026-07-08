import { Ban, Menu, ShieldAlert } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function ProfileSafetyMenu({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Profile actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[80] min-w-[170px] rounded-xl border-gray-100 bg-white p-1.5 shadow-lg">
        <DropdownMenuItem
          onClick={onReport}
          className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
        >
          <ShieldAlert className="h-4 w-4" />
          Report profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={onBlock}
          className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <Ban className="h-4 w-4" />
          Block profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
