import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/utils';
import AppRoutes from '../AppRoutes';

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

  it('renders privacy route', () => {
    render(
      <AppRoutes
        {...defaultProps}
        location={{ ...defaultProps.location, pathname: '/privacy' }}
      />
    );
    expect(screen.getAllByText(/privacy/i).length).toBeGreaterThan(0);
  });

  it('renders terms route', () => {
    render(
      <AppRoutes
        {...defaultProps}
        location={{ ...defaultProps.location, pathname: '/terms' }}
      />
    );
    expect(screen.getAllByText(/terms/i).length).toBeGreaterThan(0);
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
