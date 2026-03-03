# App Redesign: Public Access

## Changes Made

### 1. Removed Forced Login
- **File**: `src/App.tsx`
- **Change**: Removed the global blocking check `if (!isAuthenticated)`.
- **Result**: The app now renders the main layout (navigation and tabs) even for unauthenticated users.

### 2. Tab-Specific Authentication
- **File**: `src/App.tsx`
- **Create Tab**: Now checks `!isAuthenticated`. If not logged in, it shows an embedded `AuthScreen` prompting the user to sign in to create events.
- **Profile Tab**: Now checks `!isAuthenticated`. If not logged in, it shows an embedded `AuthScreen` prompting the user to sign in to view their profile.
- **Event & Feed Tabs**: Fully accessible to public users.

### 3. Component Updates
- **AuthScreen (`src/components/AuthScreen.tsx`)**: 
  - Added `embedded` prop to allow it to be rendered inside other components without taking up the full viewport height.
  - Adjusted styling to support transparent backgrounds when embedded.

- **Feed (`src/components/Feed.tsx`)**:
  - Added checks for `currentUser` in interactive features:
    - Messaging (`MessageSquare` button)
    - Notifications (`Bell` button)
    - Starting conversations (`handleStartConversationLocal`)
    - Messaging organizers (`OrganizerProfile`)
  - Interacting with these features now prompts the user to sign in via a toast message.

- **EventDetails (`src/components/EventDetails.tsx`)**:
  - Added checks for `currentUser` when attempting to start a conversation.
  - Ticket purchase already had authentication checks.

## User Experience
- **Public Users**: Can browse events, view the feed, read posts, and see profiles.
- **Interactions**: When a public user tries to Like, Comment, Follow, Buy Tickets, or Message, they are prompted to sign in (or the action is blocked with a friendly error).
- **Login Flow**: Users can sign in via the "Profile" or "Create" tabs, or potentially via modals if we add them later for specific actions.
