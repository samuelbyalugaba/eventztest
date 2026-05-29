# Eventz App Review / TestFlight Checklist

## Reviewer Demo Setup

- Create one normal attendee account with email/password.
- Create one creator account with a creator profile, profile photo, and optional location left blank.
- Add at least one public physical event with a free or paid in-person ticket tier.
- Add at least one post with an image, one post with a video, and comments from more than one account.
- Add one past hosted event and one follower/following relationship.
- Add App Review notes explaining that physical tickets are for real-world event entry and are not digital content consumed in the app.

## Required Account Tests

- Sign in with email/password.
- Sign in with Google.
- Sign in with Apple after Apple provider credentials are configured in Supabase.
- Sign out and verify toast disappears automatically.
- Delete account from Settings > Privacy & Security and verify the session ends.

## UGC Safety Tests

- Report a post from the post detail menu and confirm a row appears in `public.reports`.
- Report a comment from the comments sheet and confirm a row appears in `public.reports`.
- Report a profile from another user's profile page and confirm a row appears in `public.reports`.
- Block a user from profile and chat, then verify their posts/comments/conversations are hidden where supported.
- Verify support contact is visible in Settings > Help & Support.

## Ticketing / Wallet Tests

- Buy or reserve a free physical ticket.
- Buy a paid physical ticket with wallet balance.
- Attempt a paid physical ticket with insufficient wallet balance and mobile money top-up.
- Open wallet details and verify no red error screen appears.
- Verify Terms and Privacy links are visible in ticket and wallet flows.

## Event / Live Tests

- Open an event from Discover.
- Open an event from a direct `/event/:id` route.
- Open a live stream detail page.
- Verify paid virtual access is reviewed separately before iOS submission. If Apple IAP is not configured, paid virtual access should be disabled or made free for iOS.

## Media Tests

- Post an image.
- Post a small MP4 video.
- Post an iPhone MOV video under 100 MB.
- Verify failed uploads show a useful error and do not create a broken post.

## Native iOS Release Steps

- On Mac: run `npm run build`.
- On Mac: run `npx cap sync ios`.
- Open `ios/App/App.xcodeproj` in Xcode.
- Set the Apple development team and signing profile.
- Configure Supabase redirect allow list for the iOS OAuth redirect URL.
- Archive and upload with Xcode.
- Test the uploaded build in TestFlight on a real iPhone before App Store review.
