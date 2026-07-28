# ADR-004: Agora for Live Streaming

**Status:** Accepted  
**Date:** July 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs real-time live streaming for organizers to broadcast events to remote attendees, with low latency and reliable delivery.

## Decision

Use **Agora RTC SDK** for real-time live broadcasting and **Cloudflare Stream** for VOD/ingest.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Raw WebRTC** | No vendor dependency | Must build SFU, scaling is complex |
| **Mux** | Excellent quality, good API | Higher cost, VOD-focused |
| **AWS IVS** | AWS integration, scalable | Complex setup, higher cost |
| **Twilio Video** | Reliable, good docs | Per-minute pricing adds up |
| **Agora** | Low latency, global network, free tier | Vendor dependency, pricing at scale |

## Consequences

### Positive
- **Low latency** — Sub-second latency for live interaction
- **Global network** — Agora's SD-RTN ensures quality worldwide
- **Free tier** — 10,000 minutes free per month
- **SDK support** — React, iOS, Android SDKs available
- **Cloudflare Stream** — VOD storage and playback

### Negative
- **Vendor dependency** — Tied to Agora for live streaming
- **Pricing at scale** — Costs increase with viewer count
- **Complexity** — Two services (Agora + Cloudflare) to manage
- **Token management** — Must generate RTC tokens server-side

### Mitigation
- Abstract streaming logic behind `streaming-service.ts`
- Use Edge Functions for token generation
- Monitor usage and costs
- Plan migration path if needed
