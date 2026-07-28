// Payments Domain Index
// Manages: Transactions, wallet, charges, refunds, virtual gifts

// API
export { createTransaction, waitForTransactionCompletion } from './api/transactions';

// Types
export type { Transaction } from './types';

// Constants
export const DOMAIN_NAME = 'payments';
