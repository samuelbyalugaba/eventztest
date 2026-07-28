# Testing Strategy

## Current State

| Metric | Value |
|--------|-------|
| Test files | 7 |
| Test framework | Vitest v4 + Testing Library |
| Environment | jsdom |
| Coverage tool | v8 (text + html reporters) |
| Codebase size | ~51,000 lines TS/TSX |
| **Test-to-code ratio** | **Critical: ~1 test file per 7,300 lines** |

## Test Configuration

**File**: `vitest.config.ts`

```typescript
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.*', 'src/test/**', 'src/integrations/**', 'src/main.tsx'],
  },
}
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.1.8 | Test runner |
| `@testing-library/react` | 16.3.2 | Component testing |
| `@testing-library/jest-dom` | 6.9.1 | DOM matchers |
| `jsdom` | 29.1.1 | Browser environment simulation |

## Test Types

### Unit Tests

Test individual functions and utilities in isolation.

```typescript
// Example: utils/formatDate.test.ts
import { formatDate } from './formatDate';
test('formats date correctly', () => {
  expect(formatDate('2026-01-15')).toBe('Jan 15, 2026');
});
```

### Integration Tests

Test component interactions with mocked APIs.

```typescript
// Example: components/LoginForm.test.tsx
render(<LoginForm />);
await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
await userEvent.click(screen.getByText(/sign in/i));
expect(mockSignIn).toHaveBeenCalledWith('test@example.com', expect.any(String));
```

### Component Tests

Test React component rendering and behavior.

```typescript
// Example: components/EventCard.test.tsx
render(<EventCard event={mockEvent} />);
expect(screen.getByText('Summer Festival')).toBeInTheDocument();
expect(screen.getByRole('img')).toHaveAttribute('src', mockEvent.image_url);
```

## Current Coverage Areas

Based on the 7 test files:

| Area | Coverage | Notes |
|------|----------|-------|
| Auth flows | Partial | Basic login/signup |
| Event listing | Partial | Card rendering |
| Profile management | Minimal | Basic profile view |
| Utility functions | Minimal | Date formatting, etc. |
| **Payments** | **None** | Critical gap |
| **Messaging** | **None** | Critical gap |
| **Live streaming** | **None** | Critical gap |
| **Ticketing** | **None** | Critical gap |
| **Edge Functions** | **None** | Critical gap |
| **RLS policies** | **None** | Critical gap |

## Testing Patterns

### Setup File

**File**: `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
// Additional test utilities and mocks
```

### Mocking Patterns

```typescript
// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis() })),
  },
}));

// Mock react-router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '123' }),
}));
```

## Recommended Strategy: What to Test First

### Priority 1 — Critical Business Logic (Week 1-2)

| What | Why | Approach |
|------|-----|----------|
| `purchase_ticket` RPC | Financial operations | Integration test with test DB |
| Wallet balance operations | Financial operations | Unit test edge cases |
| Ticket scanning flow | Event entry validation | Integration test |
| Auth flows | Account security | Component + integration |

### Priority 2 — Core Features (Week 3-4)

| What | Why | Approach |
|------|-----|----------|
| Event creation/editing | Core feature | Component test |
| Feed loading | Core feature | Integration test |
| Post creation | Core feature | Component test |
| Profile updates | Core feature | Component test |

### Priority 3 — Supporting Features (Week 5-6)

| What | Why | Approach |
|------|-----|----------|
| Chat messaging | Secondary feature | Component test |
| Push notifications | Secondary feature | Unit test |
| Search/filtering | Secondary feature | Unit test |
| QR code generation | Secondary feature | Unit test |

## How to Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npx vitest

# Run with coverage
npx vitest --coverage

# Run specific test file
npx vitest run src/components/EventCard.test.tsx

# Run tests matching pattern
npx vitest run -t "auth"
```

## Writing New Tests

### Component Test Template

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Utility Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('handles normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction(null)).toBe(null);
  });
});
```

## Coverage Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Line coverage | Unknown | > 60% | High |
| Branch coverage | Unknown | > 50% | Medium |
| Function coverage | Unknown | > 70% | High |
| Critical path coverage | 0% | > 90% | Critical |
