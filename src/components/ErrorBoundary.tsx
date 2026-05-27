import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

const CHUNK_RELOAD_KEY = 'eventz-chunk-reload-attempted-at';
const CHUNK_RELOAD_WINDOW_MS = 60_000;

const isDynamicImportError = (error: Error | null) => {
  const message = String(error?.message || '');
  const name = String((error as any)?.name || '');

  return (
    name.includes('ChunkLoadError') ||
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /loading chunk \d+ failed/i.test(message)
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    componentStack: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  public componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack || null });
    void this.recoverFromChunkLoadError(_error);
  }

  private async recoverFromChunkLoadError(error: Error) {
    if (!isDynamicImportError(error)) return;

    const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < CHUNK_RELOAD_WINDOW_MS) {
      return;
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('eventz-'))
            .map((cacheName) => caches.delete(cacheName))
        );
      }

      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registrations || []).map((registration) => registration.update()));
    } catch {
      // Best-effort cleanup; reload still gives the browser a chance to fetch the new bundle.
    }

    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      const isRecoverableBundleError = isDynamicImportError(this.state.error);

      if (isRecoverableBundleError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Refreshing EVENTZ</h1>
              <p className="text-gray-600 mb-6">
                The app is updating. Refresh once to load the latest version.
              </p>
              {import.meta.env.DEV && (
                <div className="bg-gray-100 p-4 rounded overflow-auto mb-6 max-h-48">
                  <code className="text-sm text-gray-700 break-words">
                    {this.state.error?.message}
                  </code>
                </div>
              )}
              <button
                onClick={() => {
                  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                  window.location.reload();
                }}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Refresh now
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The application encountered an unexpected error.
            </p>
            <div className="bg-gray-100 p-4 rounded overflow-auto mb-6 max-h-48">
              <code className="text-sm text-red-500 break-words">
                {this.state.error?.message}
              </code>
            </div>
            {import.meta.env.DEV && this.state.componentStack && (
              <div className="bg-gray-100 p-4 rounded overflow-auto mb-6 max-h-48">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {this.state.componentStack.trim().split('\n').slice(0, 25).join('\n')}
                </pre>
              </div>
            )}
            {import.meta.env.DEV && this.state.error?.stack && (
              <div className="bg-gray-100 p-4 rounded overflow-auto mb-6 max-h-48">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {this.state.error.stack.trim().split('\n').slice(0, 25).join('\n')}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
