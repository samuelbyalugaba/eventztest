// Payments Domain Index
// Manages: Transactions, wallet, charges, refunds, virtual gifts

// API
export { createTransaction, waitForTransactionCompletion } from './api/transactions';

// Constants
export const DOMAIN_NAME = 'payments';
