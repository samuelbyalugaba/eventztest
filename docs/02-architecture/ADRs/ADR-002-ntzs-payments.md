# ADR-002: nTZS for Payments

**Status:** Accepted  
**Date:** July 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs to process ticket payments from users in Tanzania who primarily use mobile money (Airtel Money, Mpesa, Mixx/Tigo) rather than credit cards.

## Decision

Use **nTZS** (ntzs.co.tz) as the primary payment processor for mobile money transactions in Tanzania.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Stripe** | Global standard, excellent API | Limited mobile money support in Tanzania |
| **M-Pesa Direct** | Largest mobile money provider | Only Safaricom, not multi-provider |
| **Flutterwave** | Africa-focused, multi-provider | Higher fees, more complex integration |
| **PesaPal** | East Africa support | Limited documentation |
| **nTZS** | Tanzania-native, multi-provider, simple API | Regional only, smaller company |

## Consequences

### Positive
- **Multi-provider** — Supports Airtel Money, Mpesa, Mixx/Tigo
- **Tanzania-native** — Built for the local market
- **Simple API** — Easy integration with wallet-based payments
- **Low fees** — Competitive rates for local transactions
- **Webhook support** — Real-time payment status updates

### Negative
- **Regional only** — Cannot expand to other countries without another provider
- **Smaller company** — Less documentation, smaller community
- **No international cards** — Cannot process Visa/Mastercard
- **Reliability** — Dependent on nTZS uptime

### Mitigation
- Abstract payment logic behind `payment-service.ts`
- Plan to add Stripe for international payments (see PRD)
- Keep payment records in `transactions` table for portability
