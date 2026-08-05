import { database } from '../../../shared/database';
import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  created_at: Date;
}

export const paymentsService = {
  async createTransaction(input: {
    user_id: string;
    amount: number;
    type: string;
    reference?: string;
  }): Promise<Transaction> {
    const [transaction] = await database('transactions')
      .insert({
        ...input,
        status: 'pending',
        created_at: new Date(),
      })
      .returning('*');
    
    return transaction;
  },
  
  async getTransaction(id: number): Promise<Transaction | null> {
    const transaction = await database('transactions').where('id', id).first();
    return transaction || null;
  },
  
  async updateTransactionStatus(id: number, status: string): Promise<Transaction> {
    const [transaction] = await database('transactions')
      .where('id', id)
      .update({ status })
      .returning('*');
    
    return transaction;
  },
  
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return database('transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
  },
  
  async chargeWallet(userId: string, amount: number): Promise<boolean> {
    // Implementation for nTZS wallet charging
    // This would integrate with the nTZS API
    return true;
  },
  
  async getWalletBalance(userId: string): Promise<number> {
    // Calculate balance from transactions
    const result = await database('transactions')
      .where('user_id', userId)
      .andWhere('status', 'completed')
      .sum('amount as balance')
      .first();
    
    return Number(result?.balance) || 0;
  },
};
