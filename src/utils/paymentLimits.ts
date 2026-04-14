export const MOBILE_MONEY_MINIMUM_TZS = 1000;

export const isBelowMobileMoneyMinimum = (amount: number, provider: string) => {
  return provider !== 'Wallet' && amount > 0 && amount < MOBILE_MONEY_MINIMUM_TZS;
};

export const getMobileMoneyMinimumMessage = (amount?: number) => {
  const fallback = `Use Wallet for amounts below TSh ${MOBILE_MONEY_MINIMUM_TZS.toLocaleString()}.`;
  const guidance = typeof amount === 'number' && amount > 0
    ? `Add more tickets or use Wallet for amounts below TSh ${MOBILE_MONEY_MINIMUM_TZS.toLocaleString()}.`
    : fallback;

  return `Minimum mobile amount is TSh ${MOBILE_MONEY_MINIMUM_TZS.toLocaleString()}. ${guidance}`;
};