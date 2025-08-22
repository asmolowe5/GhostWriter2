import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. Please try refreshing the page.</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
                <summary>Error Details (Development)</summary>
                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '1rem', 
                  marginTop: '0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace'
                }}>
                  <div><strong>Error:</strong> {this.state.error?.message}</div>
                  <div><strong>Stack:</strong> {this.state.error?.stack}</div>
                  {this.state.errorInfo && (
                    <div><strong>Component Stack:</strong> {this.state.errorInfo.componentStack}</div>
                  )}
                </div>
              </details>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;