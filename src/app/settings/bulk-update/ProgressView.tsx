import styles from './page.module.css';

interface ProgressViewProps {
  data: {
    progress: {
      total: number;
      processed: number;
      percentComplete: number;
      autoMatched: number;
      manualApproved: number;
      skipped: number;
      failed: number;
    };
    currentGameId?: string;
    currentGameTitle?: string;
    pauseReason?: string;
    secondsLeft?: number;
    consecutiveFailures?: number;
  };
  onPause: () => void;
  onCancel: () => void;
  onStop?: () => void;
  onViewResults?: () => void;
}

export function ProgressView({ data, onPause, onCancel, onStop, onViewResults }: ProgressViewProps) {
  const { progress } = data;
  const isRateLimited = data.pauseReason === 'rate_limit';
  
  // Handle missing progress data gracefully
  if (!progress) {
    return (
      <div className={styles.viewContainer}>
        <h2 className={styles.viewTitle}>Updating Games from BGG</h2>
        <p>Loading progress...</p>
        <div className={styles.actions}>
          <button 
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.viewContainer}>
      <h2 className={styles.viewTitle}>Updating Games from BGG</h2>
      
      {isRateLimited && (
        <div className={styles.rateLimitBanner} style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>⏳ Rate Limited by BoardGameGeek</h3>
          <p style={{ margin: '0', color: '#856404' }}>
            Resuming automatically in {data.secondsLeft || 10} seconds...
          </p>
        </div>
      )}
      
      {data.consecutiveFailures && data.consecutiveFailures > 0 && !isRateLimited && (
        <div className={styles.warningBanner} style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: '0', color: '#856404' }}>
            ⚠️ {data.consecutiveFailures} consecutive failure(s)
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#856404', fontSize: '0.875rem' }}>
            Will stop after 3 consecutive failures
          </p>
        </div>
      )}
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
        />
      </div>
      
      <p className={styles.progressText}>
        {Math.min(progress.percentComplete, 100)}% complete
      </p>
      
      {data.currentGameId && !isRateLimited && (
        <div className={styles.section}>
          <p>
            Currently processing: <strong>{data.currentGameTitle || 'Unknown'}</strong>
            <span style={{ color: '#666', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
              (ID: {data.currentGameId})
            </span>
          </p>
        </div>
      )}
      
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.autoMatched}</div>
          <div className={styles.statLabel}>Auto-Matched</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.manualApproved}</div>
          <div className={styles.statLabel}>Manual-Approved</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.skipped}</div>
          <div className={styles.statLabel}>Skipped</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.failed}</div>
          <div className={styles.statLabel}>Failed</div>
        </div>
      </div>
      
      {progress.processed >= progress.total && onViewResults ? (
        <div className={styles.actions}>
          <button 
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onViewResults}
            style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}
          >
            View Results
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          <button 
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onPause}
            disabled={isRateLimited}
          >
            Pause
          </button>
          {onStop && !isRateLimited && (
            <button 
              className={`${styles.button} ${styles.buttonWarning}`}
              onClick={onStop}
              title="Stop after current game completes"
            >
              Stop After Current
            </button>
          )}
          <button 
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
      
      <p className={styles.hint}>
        You can leave this page. You&apos;ll get a browser notification when complete.
      </p>
    </div>
  );
}