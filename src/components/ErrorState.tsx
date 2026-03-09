import React from 'react';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  icon?: string;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message,
  onRetry,
  icon = '⚠️'
}: ErrorStateProps) {
  return (
    <div className={styles.errorState}>
      <span className={styles.icon}>{icon}</span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className={styles.retryBtn}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className={styles.inlineError}>
      <span className={styles.inlineIcon}>⚠️</span>
      <span className={styles.inlineMessage}>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className={styles.inlineRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
