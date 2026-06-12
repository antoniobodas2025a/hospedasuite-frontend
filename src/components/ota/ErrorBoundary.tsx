'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  /** Optional translated strings for error messages */
  errorTitle?: string;
  errorDescription?: string;
  retryLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable Error Boundary for Channel components.
 * Catches render errors in child tree and displays a graceful fallback
 * instead of crashing the entire page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'unnamed'}]:`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 text-center glass-card border-destructive/20 rounded-[var(--radius-squircle-2xl)]">
          <AlertTriangle size={24} className="text-destructive mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground mb-1">
            {this.props.name
              ? (this.props.errorTitle || `Error in ${this.props.name}`)
              : (this.props.errorTitle || 'Something went wrong')}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {this.props.errorDescription || 'This component could not load correctly.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <RefreshCw size={12} /> {this.props.retryLabel || 'Try again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
