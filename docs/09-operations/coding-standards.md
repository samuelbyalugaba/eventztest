# Coding Standards

## TypeScript

### Configuration

**File**: `tsconfig.json`

| Setting | Value | Notes |
|---------|-------|-------|
| `strict` | `true` | Full type checking |
| `noUnusedLocals` | `true` | Error on unused variables |
| `noUnusedParameters` | `true` | Error on unused params |
| `noFallthroughCasesInSwitch` | `true` | Prevent switch fallthrough |
| `isolatedModules` | `true` | Required for Vite |
| `target` | ES2020 | Modern browser support |

### Type Annotations

```typescript
// GOOD: Explicit types
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// BAD: Using `any`
function formatPrice(price: any): any {
  return `$${price.toFixed(2)}`;
}
```

**Goal**: Eliminate all `any` types. Current count: 125+ annotations, 69 `as any` casts.

### Interfaces Over Types

```typescript
// GOOD: Interface for object shapes
interface Event {
  id: string;
  title: string;
  date: string;
}

// PREFER: Interface for props
interface EventCardProps {
  event: Event;
  onSelect: (id: string) => void;
}

// USE TYPE: Only for unions/intersections
type EventStatus = 'draft' | 'published' | 'cancelled';
type EventWithLocation = Event & { location: Coordinates };
```

## React

### Component Style

```typescript
// GOOD: Functional component with explicit props
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)} onClick={onClick}>
      {children}
    </button>
  );
}

// BAD: Default export with anonymous function
export default (props) => {
  return <button>{props.children}</button>;
};
```

### Hooks Pattern

```typescript
// GOOD: Custom hook with clear naming
export function useEventDetails(eventId: string) {
  return useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => fetchEvent(eventId),
  });
}

// GOOD: Context hook with prefix
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Context Pattern

```typescript
// GOOD: Typed context with provider
interface AuthContextType {
  user: User | null;
  signIn: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ...
  return (
    <AuthContext.Provider value={{ user, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `EventCard`, `UserProfile` |
| Functions | camelCase | `formatDate`, `fetchEvents` |
| Variables | camelCase | `eventList`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_UPLOAD_SIZE` |
| Files (components) | PascalCase | `EventCard.tsx`, `UserProfile.tsx` |
| Files (utils) | camelCase | `formatDate.ts`, `api.ts` |
| Files (hooks) | camelCase, `use` prefix | `useEventDetails.ts` |
| CSS classes | kebab-case | `event-card`, `user-profile` |
| CSS variables | kebab-case | `--primary-color`, `--spacing-md` |
| Database tables | snake_case | `post_comments`, `user_blocks` |

## File Organization

### Feature-Based Structure

```
src/
├── features/           # Domain modules (recommended future structure)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api.ts
│   ├── events/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api.ts
│   └── messaging/
│       ├── components/
│       ├── hooks/
│       └── api.ts
├── components/         # Shared/reusable components
│   ├── ui/            # Design system primitives
│   └── layout/        # Layout components
├── hooks/             # Shared custom hooks
├── contexts/          # React contexts
├── store/             # Zustand stores
├── utils/             # Utility functions
├── types/             # Global types
└── styles/            # Global CSS
```

### Current Structure

```
src/
├── components/         # 60+ files (flat)
├── contexts/          # 2 files
├── store/             # 2 files
├── hooks/             # 5 files
├── utils/             # 18+ files
├── integrations/      # Supabase client + types
├── types/             # Global types
└── styles/            # globals.css
```

## CSS

### Tailwind Utility Classes

```tsx
// GOOD: Tailwind utilities
<button className="rounded-full bg-[#7C3AED] px-4 py-2 text-white">
  Click me
</button>

// BAD: Inline styles
<button style={{ borderRadius: '9999px', backgroundColor: '#7C3AED', padding: '8px 16px', color: 'white' }}>
  Click me
</button>
```

### Design Tokens

Defined in `src/styles/globals.css`:

```css
:root {
  --primary: #7C3AED;
  --background: #ffffff;
  --foreground: #0f172a;
  --spacing-md: 1rem;
  /* ... */
}
```

### Component Variants

Use `class-variance-authority` (CVA) for component variants:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('rounded-md font-medium', {
  variants: {
    variant: {
      primary: 'bg-purple-600 text-white',
      secondary: 'bg-gray-200 text-gray-900',
    },
    size: {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-base',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

## ESLint Rules

**File**: `eslint.config.js`

| Rule | Setting | Notes |
|------|---------|-------|
| `react-hooks/rules-of-hooks` | error | Enforce hooks rules |
| `react-hooks/exhaustive-deps` | warn | Warn on missing deps |
| `@typescript-eslint/no-explicit-any` | warn | Goal: error |
| `@typescript-eslint/no-unused-vars` | warn | With `_` prefix ignore |
| `no-console` | warn | Remove before production |
| `prefer-const` | warn | Prefer const over let |

## Import Order

```typescript
// 1. External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

// 2. Internal aliases (@/)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// 3. Relative imports
import { formatDate } from './utils';
import type { EventProps } from './types';
```

## Error Handling

```typescript
// GOOD: Proper error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API call failed:', error);
  Sentry.captureException(error);
  throw new Error('Failed to load data');
}

// BAD: Silent catch
try {
  const result = await apiCall();
  return result;
} catch {
  // silent
}
```

### Error Boundaries

```typescript
// Wrap routes in error boundaries
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <Routes>
    {/* ... */}
  </Routes>
</Sentry.ErrorBoundary>
```

## Comments

- Do not add comments unless specifically requested
- Code should be self-documenting through naming
- Complex algorithms may have brief explanation comments
