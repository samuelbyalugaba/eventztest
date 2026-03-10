-- Fix RLS on transactions table to allow inserting 'completed' transactions (for gifts)
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert pending transactions" ON public.transactions;

-- Create a more permissive insert policy for authenticated users
-- This allows users to create transaction records for themselves with any status (needed for instant virtual gifts)
CREATE POLICY "Users can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optionally allow users to view their own transactions (if not already present)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);