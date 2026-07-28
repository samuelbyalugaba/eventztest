# Payment Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- nTZS mobile money integration (Airtel Money, Mpesa, Mixx/Tigo)
- Wallet balance management
- Transaction recording and verification
- Virtual gift processing
- Ticket payment processing

## Edge Functions

| Function | Purpose | Secrets |
|---|---|---|
| `ntzs-proxy` | Proxy nTZS API calls (charge, status, balance) | NTZS_API_KEY, NTZS_SECRET |
| `ntzs-webhook` | Receive payment status webhooks | NTZS_WEBHOOK_SECRET |
| `wallet-ticket-payment` | Process wallet-based ticket purchase | SERVICE_ROLE_KEY |
| `send-gift` | Send virtual gift via wallet | NTZS_API_KEY, NTZS_SECRET |

## Payment Flow (Ticket Purchase)

```
User enters phone number
    ↓
Client calls ntzs-proxy (charge)
    ↓
nTZS sends STK push to user's phone
    ↓
User enters PIN to approve
    ↓
nTZS sends webhook (ntzs-webhook)
    ↓
Webhook creates transaction record (status='completed')
    ↓
Client polls transaction status (waitForTransactionCompletion)
    ↓
Transaction confirmed → createTicket() with transaction_id
    ↓
Ticket created → confirmation email + push notification
```

## Payment Flow (Virtual Gift)

```
User selects gift for broadcaster
    ↓
Client calls send-gift Edge Function
    ↓
send-gift:
  1. Validates amount and recipient
  2. Deducts from sender's wallet
  3. Credits to recipient's wallet
  4. Creates transaction records
  5. Returns success
    ↓
Gift notification sent to recipient
```

## Transaction States

```
pending → completed
    ↓
  failed
    ↓
  refunded
```

## Security Considerations

| Issue | Status | Risk |
|---|---|---|
| No idempotency on send-gift | Open | Duplicate charges possible |
| CORS * on all Edge Functions | Open | Any origin can invoke payment functions |
| No rate limiting on financial functions | Open | Spam attacks possible |
| Transaction verification before ticket | Mitigated | purchase_ticket checks transaction status |

## Wallet Management

- Balance tracked in `profiles` table (JSONB or separate column)
- Deductions happen atomically in Edge Functions
- Rollback on failure (if wallet deduction succeeds but ticket creation fails)
- Transaction history in `transactions` table

## API Functions

| Function | Purpose | File |
|---|---|---|
| `createTransaction` | Create transaction record | `transactions.ts` |
| `waitForTransactionCompletion` | Poll transaction status | `transactions.ts` |
| `sendGift` | Send virtual gift | `events.ts` |
