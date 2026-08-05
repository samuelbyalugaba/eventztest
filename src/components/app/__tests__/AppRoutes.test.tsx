import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import AppRoutes from '../AppRoutes';

vi.mock('../../legal/LegalPage', () => ({
  LegalPage: ({ type }: { type: string }) => (
    <div>
      <h1>{type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h1>
      <p>{type === 'privacy' ? 'Eventz privacy policy' : 'Eventz terms of use'}</p>
    </div>
  ),
}));

const defaultProps = {
  location: { pathname: '/', search: '', hash: '', state: null, key: '' },
  backgroundLocation: null,
  handleLogout: async () => {},
  handleCreateEvent: () => {},
  handleEditEvent: () => {},
  handleStartOrganizerSetup: () => {},
  handleStartConversation: null,
  handleViewPost: () => {},
};

describe('AppRoutes', () => {
  it('redirects root path to /events', () => {
    render(<AppRoutes {...defaultProps} />);
    expect(window.location.pathname).toBe('/events');
  });

  it('renders privacy route', async () => {
    render(
      <AppRoutes
        {...defaultProps}
        location={{ ...defaultProps.location, pathname: '/privacy' }}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByText(/privacy/i).length).toBeGreaterThan(0);
    });
  });

  it('renders terms route', async () => {
    render(
      <AppRoutes
        {...defaultProps}
        location={{ ...defaultProps.location, pathname: '/terms' }}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByText(/terms/i).length).toBeGreaterThan(0);
    });
  });

  it('renders 404 for unknown routes', () => {
    render(
      <AppRoutes
        {...defaultProps}
        location={{ ...defaultProps.location, pathname: '/nonexistent' }}
      />
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
