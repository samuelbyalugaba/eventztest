# Play Store Data Safety Draft

Use this as a starting point for the Play Console Data Safety form. Final answers must match production behavior and third-party services.

## Data Collected

- Account info: email, user ID, display name, username.
- Profile info: avatar, bio, category, optional location, creator status.
- User content: posts, comments, media uploads, event details, chat messages, reports.
- App activity: follows, likes, saved events/posts, tickets, live stream participation, wallet/ticket records.
- Approximate location: only when the user chooses location-based event features.
- Photos/videos/audio: when the user uploads posts, event covers, or streams.
- Device or diagnostics: app errors, performance, and abuse prevention data where supported by infrastructure providers.

## Purpose

- App functionality.
- Account management.
- Event discovery and ticketing.
- Messaging and live/community features.
- Safety, fraud prevention, moderation, and support.
- Analytics and diagnostics.

## Sharing

- Supabase and infrastructure providers process app data to run backend, auth, storage, and database services.
- Payment/ticketing providers may process transaction details where used.
- Public content may be visible to other users.
- Reports may be reviewed by the Eventz team or organizer/admin roles.

## Security Practices

- Data is transmitted over HTTPS.
- Row Level Security and authenticated access policies are used for app data.
- Users can request account deletion in app and through the public deletion page.

## Important Policy Flags

- Declare user-generated content.
- Declare account creation.
- Declare account deletion.
- Declare location only if enabled in the production build.
- Declare photos/videos/audio if uploads or live streaming remain enabled.
- Do not declare paid digital goods unless Android Play Billing is implemented or the feature remains disabled on Android.
