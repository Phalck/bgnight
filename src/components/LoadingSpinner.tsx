import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function LoadingSpinner({ size = 'medium', className = '' }: LoadingSpinnerProps) {
  const sizeClass = styles[size];
  
  return (
    <div className={`${styles.spinner} ${sizeClass} ${className}`}>
      <div className={styles.spinnerInner}></div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({ message = 'Loading...', children }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayContent}>
        <LoadingSpinner size="large" />
        <p className={styles.overlayMessage}>{message}</p>
        {children}
      </div>
    </div>
  );
}

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function Skeleton({ width = '100%', height = '20px', className = '', circle = false }: SkeletonProps) {
  return (
    <div 
      className={`${styles.skeleton} ${className}`}
      style={{ 
        width, 
        height,
        borderRadius: circle ? '50%' : '4px'
      }}
    />
  );
}

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 4 }: SkeletonCardProps) {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <Skeleton height="200px" className={styles.skeletonImage} />
          <div className={styles.skeletonContent}>
            <Skeleton height="24px" width="80%" />
            <Skeleton height="16px" width="60%" />
            <Skeleton height="16px" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}
