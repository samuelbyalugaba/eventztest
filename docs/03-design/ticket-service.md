# Ticket Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- Ticket purchasing with mobile money (nTZS)
- Ticket validation and scanning
- Ticket management for organizers
- Virtual ticket verification for live streams

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getUserTickets` | Get user's purchased tickets | `tickets.ts` |
| `hasActiveVirtualTicket` | Check if user has virtual ticket for event | `tickets.ts` |
| `createTicket` | Create ticket (after payment verification) | `tickets.ts` |
| `scanTicket` | Validate and mark ticket as used | `tickets.ts` |

## RPC Functions

| Function | Purpose | Security |
|---|---|---|
| `purchase_ticket` | Purchase ticket with idempotency | SECURITY DEFINER, FOR UPDATE locking |
| `scan_ticket` | Validate barcode, mark as used | SECURITY DEFINER |

## Purchase Flow

```
User selects ticket tier
    ↓
Client sends to nTZS API (ntzs-proxy Edge Function)
    ↓
User approves payment on phone
    ↓
Webhook confirms payment (ntzs-webhook)
    ↓
Transaction record created with status='completed'
    ↓
createTicket() called with transaction_id
    ↓
createTicket verifies transaction status
    ↓
purchase_ticket RPC called:
  - FOR UPDATE lock on events row
  - Decrement tier quantity in JSONB
  - INSERT ticket record
  - Return ticket ID
    ↓
Confirmation email sent (send-email Edge Function)
    ↓
Push notification sent (send-push-notification)
```

## Ticket Scanning Flow

```
Organizer opens scanner
    ↓
Scans QR code / enters barcode
    ↓
scan_ticket RPC called:
  - Validates barcode exists
  - Checks ticket status is 'active'
  - Marks status as 'used'
  - Returns ticket details
    ↓
Scanner shows success/failure
```

## Edge Cases

| Edge Case | Handling |
|---|---|
| Race condition (2 users buy last ticket) | FOR UPDATE row lock prevents overselling |
| Payment fails after charge | Transaction stays 'pending', no ticket created |
| Duplicate purchase attempt | Idempotency key prevents double charge |
| Ticket already scanned | scan_ticket returns error |
| Event cancelled | Tickets remain valid, refund handled separately |
| Virtual ticket for live stream | hasActiveVirtualTicket checks ticket_type='Virtual' |

## Performance Considerations

- **Row locking** on purchase prevents race conditions but reduces concurrency
- **JSONB tier quantities** prevent proper constraints but enable flexible tier definitions
- **Index missing** on `stream_chat_messages.event_id` affects stream chat performance
