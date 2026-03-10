-- Fix for 403 Forbidden error when creating transactions (Gifts, Tickets, etc.)
-- The previous policy likely restricted INSERTs to specific roles or statuses.
-- This policy allows any authenticated user to insert a transaction record 
-- as long as the user_id matches their own ID.

-- 1. Drop potentially conflicting or restrictive policies
DROP POLICY IF EXISTS "Users can insert pending transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

-- 2. Allow Users to INSERT their own transactions
CREATE POLICY "Users can insert transactions"
ON transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Allow Users to SELECT (view) their own transactions
-- Required because the API returns the inserted row (.select().single())
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
