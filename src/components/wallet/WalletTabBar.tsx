import { Plus, ArrowUpRight, History } from 'lucide-react';
import type { WalletTab } from '../../hooks/useWalletData';

interface WalletTabBarProps {
  activeTab: WalletTab;
  onTabChange: (tab: WalletTab) => void;
}

const tabs: { key: WalletTab; label: string }[] = [
  { key: 'deposit', label: 'Deposit' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'history', label: 'History' },
];

const tabIcon = (key: WalletTab) => {
  switch (key) {
    case 'deposit': return Plus;
    case 'withdraw': return ArrowUpRight;
    case 'history': return History;
  }
};

export function WalletTabBar({ activeTab, onTabChange }: WalletTabBarProps) {
  return (
    <div className="flex bg-secondary rounded-[14px] p-[4px] mb-[22px]">
      {tabs.map(tab => {
        const Icon = tabIcon(tab.key);
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 text-center py-[9px] text-xs font-medium rounded-[11px] transition-all duration-[0.18s] flex items-center justify-center gap-1.5 ${
              isActive ? 'bg-primary text-white' : 'text-primary'
            }`}
          >
            <Icon className="w-[15px] h-[15px]" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
