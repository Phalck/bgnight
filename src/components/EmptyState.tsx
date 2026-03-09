import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon = '🎲', 
  title, 
  description, 
  action,
  secondaryAction 
}: EmptyStateProps) {
  const ActionComponent = action?.href ? 'a' : 'button';
  
  return (
    <div className={styles.emptyState}>
      <span className={styles.icon}>{icon}</span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      
      {(action || secondaryAction) && (
        <div className={styles.actions}>
          {action && (
            <ActionComponent
              {...(action.href ? { href: action.href } : { onClick: action.onClick })}
              className={styles.primaryBtn}
            >
              {action.label}
            </ActionComponent>
          )}
          
          {secondaryAction && (
            <button 
              onClick={secondaryAction.onClick}
              className={styles.secondaryBtn}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
