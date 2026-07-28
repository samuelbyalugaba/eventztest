# PWA Setup

## Overview

Eventz is a Progressive Web App (PWA) that can be installed on mobile and desktop devices, works offline, and supports push notifications. Native builds are handled via Capacitor for Android and iOS.

## Web App Manifest

**File**: `public/manifest.json`

| Property | Value | Notes |
|----------|-------|-------|
| `name` | `EVENTZ` | Full app name |
| `short_name` | `EVENTZ` | Home screen label |
| `description` | `The Hub of Live Events` | App description |
| `display` | `standalone` | Full-screen experience |
| `background_color` | `#7C3AED` | Purple brand color |
| `orientation` | `portrait-primary` | Portrait lock |
| `categories` | `entertainment`, `lifestyle`, `social` | App store categories |
| `start_url` | `/` | Entry point |

### Icons

Icons are provided in both PNG and WebP formats at multiple sizes:

| Size | Formats | Purpose |
|------|---------|---------|
| 48x48 | PNG, WebP | Favicon |
| 72x72 | PNG, WebP | Splash screen |
| 96x96 | PNG, WebP | Shortcut icons |
| 128x128 | PNG, WebP | Splash screen |
| 144x144 | PNG, WebP | Windows tile |
| 192x192 | PNG, WebP | Home screen |
| 256x256 | WebP | Splash screen |
| 512x512 | PNG, WebP | Splash screen, store |

All icons use `purpose: "any maskable"` for adaptive icon support.

### Shortcuts

| Name | URL | Icon |
|------|-----|------|
| Browse Events | `/events` | 96x96 |
| Live Feed | `/live` | 96x96 |

## Service Worker

**File**: `public/sw.js`

### Cache Strategy

| Cache Name | Purpose | Max Entries |
|------------|---------|-------------|
| `eventz-static-v8` | Static assets (manifest, icons) | Unlimited |
| `eventz-runtime-v8` | API responses, navigation | Unlimited |
| `eventz-images-v8` | Images from Supabase, wsrv.nl | 200 |

### Caching Behaviors

| Request Type | Strategy | Notes |
|-------------|----------|-------|
| **Navigation** | Network-first, fallback to cache | Fresh content preferred |
| **Build assets** (`/assets/*`) | Cache-first | Immutable hashed filenames |
| **Images** (same-origin, Supabase, wsrv.nl) | Cache-first, 200 max | LRU pruning |
| **API/Edge Functions** | Network-only | Never cached |
| **Supabase storage** | Network-only (browser CORS) | Bypassed by SW |

### Service Worker Lifecycle

1. **Install**: Pre-caches static assets (`/`, `/manifest.json`, icons)
2. **Activate**: Cleans up old caches (prefix `eventz-`)
3. **Fetch**: Intercepts requests and applies caching strategies
4. **Message**: Supports `SKIP_WAITING` for immediate activation

### Offline Behavior

- Cached pages are available offline
- API-dependent features require network
- Navigation fallback serves cached `index.html`

## PWA Features

### Install Prompt

The app uses the `beforeinstallprompt` event to show a custom install prompt. Users can install Eventz from:
- Chrome/Edge: Address bar install button
- Safari: Share → Add to Home Screen
- Android Chrome: "Add to Home Screen" banner

### Offline Mode

- Static pages cached for offline access
- Images cached up to 200 entries
- API data requires network connection
- Service worker bypassed in local development

### Background Sync

Not currently implemented. Recommended for:
- Offline message queue
- Deferred ticket purchases
- Sync user actions when network restores

## Capacitor Integration

### Native Builds

| Platform | Package | Build Command |
|----------|---------|---------------|
| Android | `@capacitor/android` v8.x | `npx cap sync android` |
| iOS | `@capacitor/ios` v8.x | `npx cap sync ios` |

### Capacitor Plugins

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle events |
| `@capacitor/browser` | In-app browser |
| `@capacitor/status-bar` | Status bar styling |

### Build Commands

```bash
npm run cap:sync          # Build + sync native projects
npm run cap:open:android  # Open Android Studio
npm run cap:open:ios      # Open Xcode
npm run generate-native-assets  # Generate splash/icon assets
```

### Safe Area Insets

CSS variables handle notch/cutout devices:

```css
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}
```

Used throughout the app via Tailwind utility classes for proper spacing on devices with notches (iPhone X+, Android punch-holes).

## PWA Metadata in index.html

```html
<meta name="theme-color" content="#7C3AED">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico">
```

## Testing PWA

1. Open Chrome DevTools → Application tab
2. Verify manifest loaded correctly
3. Check service worker status (activated, running)
4. Test "Add to Home Screen" prompt
5. Go offline and verify cached content loads
6. Check cache storage contents
