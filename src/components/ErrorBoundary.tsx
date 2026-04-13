import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    componentStack: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack || null });
  }

  public render() {
    if (this.state.hasError) {
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
