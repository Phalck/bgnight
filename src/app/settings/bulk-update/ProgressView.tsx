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
  };
  onPause: () => void;
  onCancel: () => void;
}

export function ProgressView({ data, onPause, onCancel }: ProgressViewProps) {
  const { progress } = data;
  
  return (
    <div className={styles.viewContainer}>
      <h2 className={styles.viewTitle}>Updating Games from BGG</h2>
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      
      <p className={styles.progressText}>
        {progress.processed} of {progress.total} games ({progress.percentComplete}%)
      </p>
      
      {data.currentGameId && (
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