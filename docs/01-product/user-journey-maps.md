# User Journey Maps — Eventz

**Last Updated:** July 2026

---

## Journey 1: Event Discovery → Ticket Purchase

```
Discovery → Event Detail → Ticket Selection → Payment → Confirmation
```

| Step | User Action | System Response | Channel |
|---|---|---|---|
| 1. Discovery | Browses feed or searches | Shows relevant events | Feed, Search |
| 2. Interest | Taps on event card | Loads event detail page | Event Detail |
| 3. Evaluation | Reads description, checks date/location | Shows organizer info, attendees | Event Detail |
| 4. Decision | Taps "Get Tickets" | Shows ticket tiers and prices | Ticket Selection |
| 5. Purchase | Selects tier, enters phone number | Initiates nTZS charge | Payment |
| 6. Authorization | Approves payment on phone | Polls transaction status | nTZS |
| 7. Confirmation | Receives ticket with barcode | Sends confirmation email + push | Notification |
| 8. Pre-Event | Receives reminder 24h before | Sends push notification | Notification |
| 9. Check-In | Shows barcode at venue | Scanner validates ticket | Ticket Scan |

---

## Journey 2: Account Creation → First Event

```
Sign Up → Profile Setup → Browse → Follow → Create First Event
```

| Step | User Action | System Response | Channel |
|---|---|---|---|
| 1. Sign Up | Chooses Google/Apple/email | Creates account, sends verification | Auth |
| 2. Profile | Enters name, username, avatar | Saves profile, checks uniqueness | Profile |
| 3. Onboarding | Sees empty feed | Shows suggested users and events | Feed |
| 4. Discovery | Browses events | Personalizes based on location | Events |
| 5. Social | Follows an organizer | Updates feed with their posts | Social |
| 6. Inspiration | Sees organizer's event | Taps "Create Event" | Event Creation |
| 7. Creation | Fills event form, uploads image | Creates event, publishes | Event |
| 8. Promotion | Shares event to feed | Post appears in followers' feeds | Feed |

---

## Journey 3: Organizer Setup → Payout

```
Become Organizer → Setup Profile → Create Event → Sell Tickets → Receive Payout
```

| Step | User Action | System Response | Channel |
|---|---|---|---|
| 1. Apply | Taps "Become Organizer" | Calls `become_organizer` RPC | Profile |
| 2. Setup | Fills organizer profile | Saves cover, bio, social links | Organizer Setup |
| 3. Create | Creates first event | Event goes live | Event Creation |
| 4. Promote | Event appears in discovery | Users find and save event | Discovery |
| 5. Sell | Users purchase tickets | Tickets created, money in wallet | Tickets |
| 6. Track | Views dashboard analytics | Shows views, attendees, revenue | Dashboard |
| 7. Payout | Requests payout | Processes wallet withdrawal | Wallet |

---

## Journey 4: Live Stream Experience

```
Go Live → Viewers Join → Chat → End Stream → VOD
```

| Step | User Action | System Response | Channel |
|---|---|---|---|
| 1. Setup | Organizer taps "Go Live" | Requests Agora token | Streaming |
| 2. Connect | Broadcaster joins Agora channel | Creates Cloudflare Stream input | Agora |
| 3. Broadcast | Streams audio/video | Viewers see live indicator | Real-time |
| 4. Discovery | Live event appears in feed | Push notification to followers | Feed |
| 5. Join | Viewer taps live event | Connects to stream via HLS.js | Streaming |
| 6. Chat | Viewers send messages | Real-time chat messages | Real-time |
| 7. End | Broadcaster ends stream | Stops broadcast, saves VOD | Streaming |
| 8. VOD | Stream processed as video | Available for replay | Cloudflare |

---

## Journey 5: Social Interaction

```
See Post → Like → Comment → Follow → Message
```

| Step | User Action | System Response | Channel |
|---|---|---|---|
| 1. Discovery | Sees post in feed | Loads post with interactions | Feed |
| 2. Engagement | Likes the post | Increments like count | Post |
| 3. Comment | Writes a comment | Adds comment, notifies author | Post |
| 4. Follow | Taps follow on author | Creates follow, updates feed | Social |
| 5. Connection | Sees author is online | Shows online indicator | Presence |
| 6. Message | Starts conversation | Creates chat, sends first message | Messaging |
| 7. Real-time | Messages back and forth | Real-time delivery, read receipts | Real-time |
