# Specification: Replace AzamPay with Snippe Payment Provider

## 1. Overview
This specification outlines the steps to completely remove AzamPay integration and replace it with Snippe (https://snippe.sh) for payment processing in the Eventz PWA. The integration will support Mobile Money (USSD Push) initially, matching the current functionality.

## 2. Removal of AzamPay
The following components and files will be removed or modified:
- **Backend**: Delete `supabase/functions/azampay-payment`.
- **Frontend**:
  - Remove AzamPay references in `src/utils/supabase/api.ts`.
  - Remove AzamPay references in `src/components/VirtualTicketPurchaseModal.tsx`, `src/components/TierTicketModal.tsx`, `src/components/EventDetails.tsx`.

## 3. Snippe Integration

### 3.1. Backend (Supabase Edge Functions)
Two new Edge Functions will be created:

#### A. `snippe-payment`
- **Purpose**: Initiates a payment request to Snippe API.
- **Endpoint**: `POST /snippe-payment`
- **Request Body**:
  ```json
  {
    "amount": number,
    "phoneNumber": string, // Format: 255...
    "provider": string, // 'Airtel', 'Tigo', 'Halopesa', 'Mpesa'
    "eventId": number,
    "ticketId": number,
    "userId": string,
    "metadata": object
  }
  ```
- **Logic**:
  1.  Validate input.
  2.  Create a record in `transactions` table with status `pending` and provider `Snippe`.
  3.  Call Snippe API `POST https://api.snippe.sh/v1/payments`.
      - Map `provider` to Snippe specific requirements if any (Snippe seems to auto-detect from phone number or just needs the number).
      - Include `webhook_url` pointing to the `snippe-webhook` function.
      - Pass `transaction_id` (from step 2) in `metadata`.
  4.  Update `transactions` table with Snippe's `reference`.
  5.  Return `transactionId` and Snippe `reference` to the client.

#### B. `snippe-webhook`
- **Purpose**: Receives payment status updates from Snippe.
- **Endpoint**: `POST /snippe-webhook`
- **Logic**:
  1.  Verify webhook signature (using `X-Webhook-Signature`).
  2.  Extract `reference` and `status` (completed/failed) and `metadata` (containing internal `transaction_id`).
  3.  Update the `transactions` table:
      - Set `status` to `success` (if completed) or `failed`.
      - Update `updated_at`.
  4.  Return `200 OK`.

### 3.2. Database
- No schema changes required for `transactions` table.
- Ensure `provider` column uses 'Snippe'.

### 3.3. Frontend (`src/utils/supabase/api.ts`)
- **Add**: `initiateSnippePayment(amount, phoneNumber, eventId, ticketId, ...)`
- **Logic**: Calls `supabase.functions.invoke('snippe-payment', ...)`
- **Keep**: `waitForTransactionCompletion(transactionId)` (This polling mechanism is still valid as it checks the DB).

### 3.4. UI Components
- Update `VirtualTicketPurchaseModal.tsx`, `TierTicketModal.tsx`, `EventDetails.tsx`.
- **Supported Providers**: Update list to:
  - Airtel Money
  - Tigo Pesa
  - HaloPesa
  - M-Pesa
  - (Remove AzamPesa)
- **Input**: Ensure phone number input expects valid Tanzanian format (starts with 255 or 0). Snippe likely prefers 255 or 07... (Docs say "07..." in examples, but usually 255 is safer for APIs. We will normalize to what Snippe expects).

## 4. Environment Variables
The following secrets need to be set in Supabase:
- `SNIPPE_API_KEY`: The API Key from Snippe Dashboard.
- `SNIPPE_WEBHOOK_SECRET`: The secret for verifying webhooks.

## 5. Verification Plan
- **Mocking**: Since we might not have a live Snippe account/sandbox active immediately, we will verify that:
  - The Edge Function is called.
  - The `transactions` table entry is created.
  - The UI handles the 'pending' state and polls correctly.
