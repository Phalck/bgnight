'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>
            We&apos;re sorry, but an unexpected error occurred.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className={styles.errorDetails}>
              <p className={styles.errorStack}>{this.state.error.message}</p>
              {this.state.errorInfo && (
                <pre className={styles.errorStackTrace}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className={styles.errorActions}>
            <button onClick={this.handleReset} className={styles.retryBtn}>
              Try Again
            </button>
            <button onClick={() => window.location.reload()} className={styles.reloadBtn}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
