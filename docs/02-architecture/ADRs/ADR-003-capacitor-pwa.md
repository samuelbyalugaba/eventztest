# ADR-003: Capacitor for Mobile

**Status:** Accepted  
**Date:** July 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs native mobile apps for Android and iOS to provide better performance, push notifications, and App Store/Play Store distribution.

## Decision

Use **Capacitor 8.x** to wrap the existing React SPA as native mobile apps.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **React Native** | True native, large ecosystem | Complete rewrite, different UI framework |
| **Flutter** | Excellent performance, Dart | Different language, rewrite required |
| **Pure PWA** | No native build needed | Limited push notifications, no App Store |
| **Cordova** | Mature, plugin ecosystem | Declining community, performance issues |
| **Capacitor** | Works with existing React code, web-first | Web wrapper limitations, plugin gaps |

## Consequences

### Positive
- **No rewrite** — Existing React code works as-is
- **Web-first** — PWA features work in native wrapper
- **Native APIs** — Access to camera, file system, push notifications
- **App Store distribution** — Play Store and App Store presence
- **Shared codebase** — One codebase for web + mobile

### Negative
- **Web wrapper** — Not truly native performance
- **Plugin limitations** — Some native features need custom plugins
- **Bundle size** — WebView adds overhead
- **App review** — Store approval process

### Mitigation
- Optimize bundle size with code splitting
- Use Capacitor plugins for common features
- Test on real devices regularly
- Keep PWA as primary platform
