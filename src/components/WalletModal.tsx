import { BackButton } from './ui/BackButton';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { useWalletData } from '../hooks/useWalletData';
import { WalletTabBar } from './wallet/WalletTabBar';
import { WalletDepositForm } from './wallet/WalletDepositForm';
import { WalletWithdrawForm } from './wallet/WalletWithdrawForm';
import { WalletHistoryList } from './wallet/WalletHistoryList';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const {
    activeTab,
    amount,
    balance,
    getTxKind,
    getTxLabel,
    handleDeposit,
    handleWithdraw,
    isOutflow,
    isProcessing,
    loading,
    phone,
    provider,
    quickAmounts,
    setActiveTab,
    setAmount,
    setPhone,
    setProvider,
    totalDeposited,
    totalWithdrawn,
    txs,
  } = useWalletData(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-secondary w-full sm:max-w-[390px] rounded-t-[28px] sm:rounded-[28px] sm:shadow-xl flex flex-col max-h-[95dvh] sm:max-h-[85vh] overflow-y-auto">

        <div className="sticky top-0 z-10 bg-secondary px-5 pt-4 pb-3 flex items-center justify-between">
          <BackButton
            onClick={onClose}
            className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]"
            iconClassName="w-[18px] h-[18px] text-[#6B21E8]"
          />
          <span className="text-lg font-medium text-foreground">My Wallet</span>
        </div>

        <div className="relative mx-4 mb-5 rounded-[24px] overflow-hidden bg-gradient-to-br from-[#5B21B6] via-primary to-[#9333EA] px-6 pt-7 pb-7">
          <div className="absolute -top-[50px] -right-[50px] w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
          <div className="absolute -bottom-[60px] -left-[40px] w-[150px] h-[150px] rounded-full bg-white/[0.05]" />
          <div className="absolute bottom-[30px] right-[30px] w-[80px] h-[80px] rounded-full bg-white/[0.06]" />
          <div className="absolute top-5 right-5 flex gap-[5px]">
            <div className="w-[7px] h-[7px] rounded-full bg-white/90" />
            <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
            <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
          </div>
          <p className="text-2xs font-medium tracking-[1.8px] text-white/60 uppercase mb-2.5 relative z-[1]">
            Total Wallet Balance
          </p>
          <div className="text-[42px] font-medium text-white relative z-[1] tracking-[-1px] mb-1.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-normal opacity-75">TSh</span>
            <span>{balance !== null ? balance.toLocaleString() : '—'}</span>
          </div>
          <div className="text-xs text-white/50 relative z-[1] flex items-center gap-1.5">
            <div className="w-[6px] h-[6px] rounded-full bg-[#4ADE80] shrink-0" />
            Live &middot; Updated just now
          </div>
        </div>

        <div className="bg-white rounded-t-[28px] flex-1 border border-border border-b-0 px-4 pt-[22px] pb-8">
          <WalletTabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'deposit' && (
            <WalletDepositForm
              totalDeposited={totalDeposited}
              loading={loading}
              provider={provider}
              onProviderChange={setProvider}
              amount={amount}
              onAmountChange={setAmount}
              quickAmounts={quickAmounts}
              phone={phone}
              onPhoneChange={setPhone}
              isProcessing={isProcessing}
              onDeposit={handleDeposit}
            />
          )}

          {activeTab === 'withdraw' && (
            <WalletWithdrawForm
              totalWithdrawn={totalWithdrawn}
              loading={loading}
              balance={balance}
              provider={provider}
              onProviderChange={setProvider}
              amount={amount}
              onAmountChange={setAmount}
              phone={phone}
              onPhoneChange={setPhone}
              isProcessing={isProcessing}
              onWithdraw={handleWithdraw}
            />
          )}

          {activeTab === 'history' && (
            <WalletHistoryList
              txs={txs}
              loading={loading}
              getTxKind={getTxKind}
              getTxLabel={getTxLabel}
              isOutflow={isOutflow}
            />
          )}

          <p className="text-center text-xs leading-5 text-gray-500 mt-6">
            Wallet activity is subject to the{' '}
            <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
            {' '}and{' '}
            <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
