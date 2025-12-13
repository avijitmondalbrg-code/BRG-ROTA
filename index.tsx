
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary to catch render crashes
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Explicitly destructure children from this.props to resolve the TS error
    const { children } = this.props;

    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#ef4444', backgroundColor: '#fff' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Something went wrong.</h2>
          <p>Please check the console for details.</p>
          <details style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return children; 
  }
}

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
