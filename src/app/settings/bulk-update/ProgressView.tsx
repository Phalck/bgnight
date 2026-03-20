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
    pauseReason?: string;
    secondsLeft?: number;
    consecutiveFailures?: number;
  };
  onPause: () => void;
  onCancel: () => void;
  onResume?: () => void;
}

export function ProgressView({ data, onPause, onCancel, onResume }: ProgressViewProps) {
  const { progress } = data;
  const isRateLimited = data.pauseReason === 'rate_limit';
  
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
          <p style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>
            BGG imposes a 1 request per 5 second rate limit.
          </p>
          <p style={{ margin: '0 0 1rem 0', color: '#856404', fontWeight: 'bold' }}>
            Resuming automatically in {data.secondsLeft} seconds...
          </p>
          {onResume && (
            <button 
              className={styles.button}
              onClick={onResume}
              disabled={data.secondsLeft ? data.secondsLeft > 0 : false}
              style={{ 
                opacity: data.secondsLeft && data.secondsLeft > 0 ? 0.5 : 1,
                cursor: data.secondsLeft && data.secondsLeft > 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Resume Now
            </button>
          )}
        </div>
      )}
      
      {data.consecutiveFailures && data.consecutiveFailures > 0 && (
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
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      
      <p className={styles.progressText}>
        {progress.processed} of {progress.total} games ({progress.percentComplete}%)
      </p>
      
      {data.currentGameId && !isRateLimited && (
        <div className={styles.section}>
          <p>Currently processing game ID: {data.currentGameId}</p>
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
      
      <div className={styles.actions}>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onPause}
          disabled={isRateLimited}
        >
          Pause
        </button>
        <button 
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      
      <p className={styles.hint}>
        You can leave this page. You&apos;ll get a browser notification when complete.
      </p>
    </div>
  );
}