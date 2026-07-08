import { CreditCard } from 'lucide-react';
import { BackButton } from './ui/BackButton';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { useWalletData } from '../hooks/useWalletData';
import { WalletTabBar } from './wallet/WalletTabBar';
import { WalletDepositForm } from './wallet/WalletDepositForm';
import { WalletWithdrawForm } from './wallet/WalletWithdrawForm';
import { WalletHistoryList } from './wallet/WalletHistoryList';

export function WalletPage() {
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
  } = useWalletData();

  return (
    <div className="bg-secondary min-h-[100dvh] flex flex-col max-w-[390px] mx-auto">
      <div className="sticky top-0 z-10 bg-secondary px-5 pt-4 pb-3 flex items-center justify-between">
        <BackButton
          className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]"
          iconClassName="w-[18px] h-[18px] text-[#6B21E8]"
        />
        <span className="text-lg font-medium text-foreground">My Wallet</span>
      </div>

      <section className="bg-gradient-to-br from-primary to-[#9333EA] rounded-[18px] p-5 relative overflow-hidden text-white mx-4 mb-5">
        <div className="relative z-[1] text-2xs font-medium text-white/72 flex items-center gap-[6px] mb-[7px] uppercase tracking-[.06em]">
          <CreditCard className="h-3.5 w-3.5" />
          Total wallet balance
        </div>
        <div className="relative z-[1] text-[30px] font-bold tracking-[-1.4px] leading-[1] mb-1">{balance !== null ? `TSh ${balance.toLocaleString()}` : '—'}</div>
        <div className="relative z-[1] text-2xs font-medium text-white/55 mb-[14px]">Live &middot; Updated just now</div>
      </section>

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
  );
}
