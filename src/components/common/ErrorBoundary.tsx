import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Log error details for debugging
      console.error('ErrorBoundary Error Details:', {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        name: this.state.error?.name
      });

      return (
        <div className="min-h-screen flex items-center justify-center bg-card p-4">
          <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-2xl">
            <h1 className="text-2xl font-bold text-[#A855F7] mb-4">⚠️ Something went wrong</h1>
            <p className="text-primary mb-2 font-semibold">Error: {this.state.error?.message || 'An unexpected error occurred'}</p>
            {this.state.error?.stack && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-secondary mb-2">Show error details</summary>
                <pre className="text-xs bg-card p-4 rounded overflow-auto max-h-60 text-primary">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/admin/dashboard';
                }}
                className="px-4 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

