# Sequence Diagrams — Eventz

**Last Updated:** July 2026

---

## 1. Purchase Ticket

```
User          Client          nTZS Proxy      nTZS API       Webhook         DB              Email
 │               │               │               │               │              │                │
 │── Select ────→│               │               │               │              │                │
 │               │── Charge ────→│── POST ──────→│               │              │                │
 │               │               │               │── STK Push ──→│              │                │
 │               │               │               │               │              │                │
 │── Enter PIN ──→│               │               │               │              │                │
 │               │               │               │── Confirm ───→│              │                │
 │               │               │               │               │── Webhook ──→│                │
 │               │               │               │               │              │── Transaction ──→│
 │               │── Poll Status ─→               │               │              │                │
 │               │               │               │               │              │←── completed ────│
 │               │── createTicket ───────────────────────────────→│── purchase_ticket RPC ───────→│
 │               │               │               │               │              │── INSERT ticket ─→│
 │               │               │               │               │              │── UPDATE tier ───→│
 │               │←── ticket ────│               │               │              │                │
 │               │── Send Email ──────────────────────────────────────────────────────────────────→│
 │               │── Send Push ──→│               │               │              │                │
 │               │               │               │               │              │                │
 │←── Confirm ───│               │               │               │              │                │
```

## 2. Create Event

```
Client                Storage              DB
 │                      │                   │
 │── Upload Image ─────→│                   │
 │←── Public URL ───────│                   │
 │                      │                   │
 │── INSERT event ──────────────────────────→│
 │                      │                   │
 │←── Event created ────────────────────────│
 │                      │                   │
 │── Invalidate cache ──│                   │
 │                      │                   │
 │── Navigate to event ─│                   │
```

## 3. Send Message

```
Sender         Client          DB            Realtime        Recipient
 │               │              │               │               │
 │── Type msg ──→│              │               │               │
 │── Enter ─────→│              │               │               │
 │               │── Optimistic ─│               │               │
 │               │   UI update  │               │               │
 │               │              │               │               │
 │               │── INSERT ────→│               │               │
 │               │              │── Broadcast ──→│               │
 │               │              │               │── Deliver ───→│
 │               │              │               │               │
 │               │←── Confirm ──│               │               │
 │               │              │               │               │
```

## 4. Go Live

```
Organizer       Client       Agora         CF Stream        Followers
 │               │            │               │               │
 │── Go Live ──→│            │               │               │
 │               │── Token ──→│               │               │
 │               │←── Token ──│               │               │
 │               │            │               │               │
 │               │── Join ────→│               │               │
 │               │            │               │               │
 │               │── Create ──────────────────→│               │
 │               │←── Input ──────────────────│               │
 │               │            │               │               │
 │── Broadcast ─→│── Publish ─→│               │               │
 │               │            │               │               │
 │               │── Update DB ───────────────→│               │
 │               │            │               │── Notify ────→│
 │               │            │               │               │
 │               │            │               │── Live badge ─→│
```

## 5. Receive Notification

```
Event           DB            Realtime       Client         Push Service
 │               │               │              │               │
 │── Trigger ───→│               │              │               │
 │               │── INSERT ────→│              │               │
 │               │               │── Broadcast →│               │
 │               │               │              │               │
 │               │               │              │── Update UI ──│
 │               │               │              │               │
 │               │               │              │── Send Push ──→│
 │               │               │              │               │
 │               │               │              │               │── Deliver ──→ Device
```
