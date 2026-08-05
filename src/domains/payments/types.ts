// Payments Domain Types
// Manages: Transactions, wallet, charges, refunds, virtual gifts

export interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  created_at: string;
}
