# Performance Budget

## Core Web Vitals Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Not measured | Needs audit |
| **FID** (First Input Delay) | < 100ms | Not measured | Needs audit |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Not measured | Needs audit |
| **TTFB** (Time to First Byte) | < 800ms | Not measured | Needs audit |
| **INP** (Interaction to Next Paint) | < 200ms | Not measured | Needs audit |

## Bundle Size Targets

| Chunk | Target | Current | Notes |
|-------|--------|---------|-------|
| **Initial bundle** (main) | < 200 KB gzipped | Unknown | Needs measurement |
| **React core** | < 50 KB gzipped | ~45 KB | Manual chunk |
| **Radix UI** | < 80 KB gzipped | Unknown | Manual chunk |
| **Supabase** | < 40 KB gzipped | Unknown | Manual chunk |
| **App code** | < 150 KB gzipped | Unknown | Needs measurement |
| **Total first load** | < 400 KB gzipped | Unknown | Needs measurement |

### Code Splitting

The app uses manual chunks via Vite config:

| Chunk Name | Contents |
|------------|----------|
| `react` | React core + ReactDOM |
| `radix` | Radix UI primitives (25 packages) |
| `supabase` | Supabase JS client |
| `charts` | Recharts library |
| `icons` | Lucide React icons |
| `agora` | Agora RTC SDK |
| `hls` | HLS.js player |

### Route-Level Splitting

Routes are lazy-loaded via `React.lazy()`:

```typescript
const Feed = lazy(() => import('./pages/Feed'));
const Events = lazy(() => import('./pages/Events'));
const Profile = lazy(() => import('./pages/Profile'));
```

## Current Performance Findings

### From Production Analysis Audit

| Finding | Impact | Recommendation |
|---------|--------|----------------|
| `App.tsx` (705 lines) | Large initial parse | Split into smaller route components |
| `PostCard.tsx` (896 lines) | Heavy component | Extract sub-components |
| No virtualization in Feed | DOM grows unbounded | Add `react-window` or `@tanstack/react-virtual` |
| 25+ hardcoded hex colors | Bypasses theme caching | Use CSS custom properties |
| 93 `!important` declarations | CSS specificity battles | Refactor to proper specificity |
| Google Fonts blocking render | FOUT/FOIT | Use `font-display: swap` + preconnect |

### From Frontend Analysis Audit

| Finding | Impact | Recommendation |
|---------|--------|----------------|
| 129+ inline `style={{}}` objects | Prevents CSS optimization | Move to Tailwind classes |
| 427+ long className strings | Bundle size, readability | Extract to component variants |
| No `og:image` or `twitter:image` | Blank social share cards | Add OpenGraph images |
| `canonical` hardcoded to `/` | All pages treated as same for SEO | Dynamic canonical URLs |

## Image Optimization Strategy

### Current Approach

| Source | Strategy | Notes |
|--------|----------|-------|
| Supabase Storage | Original quality | No transformation applied |
| wsrv.nl | External CDN proxy | Used for image optimization |
| App icons | Multiple sizes + WebP | PWA-optimized |

### Recommended Improvements

1. **Supabase Storage**: Use Supabase image transformations
   ```
   /storage/v1/object/public/images/photo.png?width=800&height=600
   ```

2. **Lazy Loading**: Native `loading="lazy"` on all images below the fold

3. **WebP/AVIF**: Serve modern formats with PNG fallback
   - Icons already have WebP variants
   - User-uploaded images should be converted

4. **Responsive Images**: Use `srcset` for different viewport sizes

## Caching Strategy

### Service Worker Caches

| Cache | Strategy | Max | TTL |
|-------|----------|-----|-----|
| `eventz-static-v8` | Pre-cache | Unlimited | Until new deploy |
| `eventz-runtime-v8` | Network-first | Unlimited | Session |
| `eventz-images-v8` | Cache-first | 200 | LRU eviction |

### HTTP Caching

| Resource | Cache-Control | Notes |
|----------|---------------|-------|
| HTML (`index.html`) | `no-cache` | Always fresh |
| JS/CSS bundles | `max-age=31536000, immutable` | Hashed filenames |
| Images | `max-age=86400` | 1 day |
| API responses | `no-store` | Always fresh |

### CDN Caching

- **Vercel Edge**: Static assets cached globally
- **Cloudflare Stream**: Video content cached at edge
- **Supabase Storage**: Files served from CDN

## Lazy Loading Approach

### Route-Level

```typescript
const Checkout = lazy(() => import('./pages/Checkout'));
const LiveStream = lazy(() => import('./pages/LiveStream'));
```

### Component-Level

```typescript
const EventMap = lazy(() => import('./components/EventMap'));
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
```

### Intersection Observer

Used for:
- Infinite scroll in Feed
- Image lazy loading
- Video autoplay on viewport entry

### Deferred Bootstrap

```typescript
// src/main.tsx — Non-critical init deferred to idle
const runIdle = (cb) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 500);
  }
};
```

## Performance Monitoring

### Sentry Performance

```typescript
Sentry.init({
  // Automatically tracks:
  // - Page load time
  // - HTTP requests
  // - React component renders
  // - Core Web Vitals
});
```

### Manual Measurement

```typescript
// Measure specific operations
performance.mark('event-load-start');
await loadEvent(id);
performance.mark('event-load-end');
performance.measure('event-load', 'event-load-start', 'event-load-end');
```

## Budget Enforcement

### CI Integration (Recommended)

Add bundle size checks to CI:

```yaml
- name: Bundle Size
  run: |
    npm run build
    npx bundlesize --config .bundlesizerc.json
```

### Monitoring Dashboard

Track over time:
- Initial bundle size (gzipped)
- Total JavaScript size
- Largest contentful paint
- Time to interactive
- Total blocking time
