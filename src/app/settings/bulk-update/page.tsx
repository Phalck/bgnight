'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { PreviewView } from './PreviewView';
import { ApprovalView } from './ApprovalView';
import { ProgressView } from './ProgressView';
import { ResultsView } from './ResultsView';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import styles from './page.module.css';

interface BulkUpdateState {
  sessionId: string | null;
  status: 'loading' | 'preview' | 'approval' | 'running' | 'paused' | 'completed' | 'error';
  data: {
    preview?: {
      totalGames: number;
      gamesWithBggId: number;
      gamesNeedingSearch: number;
      gamesWithManualEdits: number;
      manualEditGames: Array<{
        gameId: string;
        title: string;
        editedFields: string[];
        editedAt: Date;
      }>;
    };
    existingSession?: {
      id: string;
      status: string;
      canResume: boolean;
      progress: {
        total: number;
        processed: number;
        percentComplete: number;
      };
    };
    games?: Array<{
      gameId: string;
      title: string;
      editedFields: string[];
      editedAt: Date;
    }>;
    progress?: {
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
    skippedGames?: Array<{
      gameId: string;
      title: string;
      reason: string;
    }>;
    failedGames?: Array<{
      gameId: string;
      title: string;
      error: string;
    }>;
    error?: string;
    pauseReason?: string;
    secondsLeft?: number;
    consecutiveFailures?: number;
  } | null;
}

export default function BulkUpdatePage() {
  const router = useRouter();
  const [state, setState] = useState<BulkUpdateState>({
    sessionId: null,
    status: 'loading',
    data: null
  });

  // Refs for tracking
  const prevProcessedRef = useRef<number>(0);
  const stopRequestedRef = useRef<boolean>(false);

  // Define functions first before they're used in effects
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  }, []);

  const fetchStatus = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/games/bulk-update/status?sessionId=${sessionId}`);
    return response.json();
  }, []);

  const checkExistingSession = useCallback(async () => {
    try {
      const response = await fetch('/api/games/bulk-update/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwriteManual: false })
      });
      
      const data = await response.json();
      
      if (!data.canStart && data.existingSession) {
        setState({
          sessionId: data.existingSession.id,
          status: data.existingSession.canResume ? 'running' : 'completed',
          data: data.existingSession
        });
      } else {
        setState({
          sessionId: null,
          status: 'preview',
          data: data
        });
      }
    } catch (_error) {
      setState({
        sessionId: null,
        status: 'error',
        data: { error: 'Failed to load' }
      });
    }
  }, []);

  const processNext = useCallback(async (sessionId: string) => {
    try {
      await fetch('/api/games/bulk-update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      console.error('Process error:', error);
    }
  }, []);

  const handleStart = useCallback(async (overwriteManual: boolean, retryStrategy: string, approvedGameIds?: string[]) => {
    try {
      // Reset refs when starting new session
      prevProcessedRef.current = 0;
      stopRequestedRef.current = false;
      
      const response = await fetch('/api/games/bulk-update/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overwriteManual,
          retryStrategy,
          approvedManualEditGameIds: approvedGameIds
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'needs-approval') {
        setState({
          sessionId: null,
          status: 'approval',
          data: result.needsApproval
        });
      } else {
        setState({
          sessionId: result.sessionId,
          status: 'running',
          data: result
        });
        
        processNext(result.sessionId);
      }
    } catch (error) {
      console.error('Start error:', error);
    }
  }, [processNext]);

  const handleApprove = useCallback(async (approvedGameIds: string[]) => {
    await handleStart(false, 'skip', approvedGameIds);
  }, [handleStart]);

  const handlePause = useCallback(async () => {
    if (!state.sessionId) return;
    
    await fetch('/api/games/bulk-update/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
    
    const status = await fetchStatus(state.sessionId);
    setState(prev => ({ ...prev, data: status }));
  }, [state.sessionId, fetchStatus]);

  const handleResume = useCallback(async () => {
    if (!state.sessionId) return;
    
    await fetch('/api/games/bulk-update/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
    
    setState(prev => ({ ...prev, status: 'running' }));
    processNext(state.sessionId);
  }, [state.sessionId, processNext]);

  const handleCancel = useCallback(async () => {
    if (!state.sessionId) {
      router.push('/collection');
      return;
    }
    
    await fetch('/api/games/bulk-update/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
    
    router.push('/collection');
  }, [state.sessionId, router]);

  const handleStopAfterCurrent = useCallback(() => {
    stopRequestedRef.current = true;
  }, []);

  const handleRetryFailed = useCallback(async (gameIds: string[]) => {
    console.log('Retrying:', gameIds);
  }, []);

  const handleExport = useCallback(async () => {
    if (!state.sessionId) return;
    
    const response = await fetch(`/api/games/bulk-update/export?sessionId=${state.sessionId}`);
    const report = await response.json();
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bgnight-bulk-update-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.sessionId]);

  // Initial load effect - now functions are defined above
  useEffect(() => {
    checkExistingSession();
    requestNotificationPermission();
  }, [checkExistingSession, requestNotificationPermission]);

  // Polling effect for running status
  useEffect(() => {
    if ((state.status === 'running' || state.status === 'paused') && state.sessionId) {
      // Initialize prevProcessedRef if not set
      if (prevProcessedRef.current === 0 && state.data?.progress?.processed) {
        prevProcessedRef.current = state.data.progress.processed;
      }
      
      const interval = setInterval(async () => {
        try {
          const status = await fetchStatus(state.sessionId!);
          
          // Check if the response contains an error
          if (status.error) {
            console.error('Bulk update API error:', status.error);
            setState(prev => ({ 
              ...prev, 
              data: { 
                ...prev.data, 
                apiError: status.error 
              } 
            }));
            return;
          }
          
          // Handle rate limit pause
          if (status.status === 'paused' && status.pauseReason === 'rate_limit') {
            const resumeTime = new Date(status.rateLimitExpiry).getTime();
            const now = Date.now();
            const secondsLeft = Math.max(0, Math.ceil((resumeTime - now) / 1000));
            
            if (secondsLeft <= 0) {
              // Auto-resume
              await handleResume();
            } else {
              setState(prev => ({ 
                ...prev, 
                status: 'paused',
                data: { 
                  ...status, 
                  pauseReason: 'rate_limit',
                  secondsLeft 
                } 
              }));
            }
            return;
          }
          
          setState(prev => ({ ...prev, data: status }));
          
          // Check if processing is complete (status says completed OR processed >= total)
          const isComplete = status.status === 'completed' || 
            (status.progress && status.progress.processed >= status.progress.total);
          
          if (isComplete && state.status !== 'completed') {
            console.log('Bulk update complete! Processed:', status.progress?.processed, 'of', status.progress?.total);
            showBrowserNotification('Bulk Update Complete', 
              `Updated ${status.progress?.processed || 0} games`);
            setState(prev => ({ ...prev, status: 'completed' }));
            clearInterval(interval);
            return;
          }
          
          // Check if a game just finished processing and we should continue
          if (status.status === 'running' && status.progress) {
            const currentProcessed = status.progress.processed;
            
            if (currentProcessed > prevProcessedRef.current) {
              prevProcessedRef.current = currentProcessed;
              
              // Check if stop was requested
              if (stopRequestedRef.current) {
                console.log('Stop requested after current game');
                stopRequestedRef.current = false;
                await handlePause();
                return;
              }
              
              // Check if not completed yet
              if (currentProcessed < status.progress.total) {
                // Wait 100ms then process next game
                setTimeout(() => {
                  processNext(state.sessionId!);
                }, 100);
              }
            }
          }
          
          // Keep the original check as backup
          if (status.status === 'completed') {
            showBrowserNotification('Bulk Update Complete', 
              `Updated ${status.progress.processed} games`);
            setState(prev => ({ ...prev, status: 'completed' }));
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error fetching status:', error);
          setState(prev => ({ 
            ...prev, 
            data: { 
              ...prev.data, 
              apiError: 'Failed to fetch update status' 
            } 
          }));
        }
      }, 1000); // Poll every second for accurate countdown
      
      return () => clearInterval(interval);
    }
  }, [state.status, state.sessionId, fetchStatus, showBrowserNotification, handleResume, handlePause, processNext]);

  return (
    <div className={styles.page}>
      <Header />
      
      <main className={styles.main}>
        <h1 className={styles.title}>Bulk Update from BoardGameGeek</h1>
        
        {state.status === 'loading' && (
          <div className={styles.loading}>
            <LoadingSpinner size="large" />
            <p>Loading...</p>
          </div>
        )}
        
        {state.status === 'preview' && state.data && (
          <PreviewView 
            data={state.data}
            onStart={handleStart}
            onResume={handleResume}
          />
        )}
        
        {state.status === 'approval' && (
          <ApprovalView 
            games={state.data?.games || []}
            onApprove={handleApprove}
            onCancel={() => setState({ sessionId: null, status: 'preview', data: null })}
          />
        )}
        
        {(state.status === 'running' || state.status === 'paused') && state.data && (
          <ProgressView 
            data={{
              progress: state.data.progress!,
              currentGameId: state.data.currentGameId,
              currentGameTitle: state.data.currentGameTitle,
              pauseReason: state.data.pauseReason,
              secondsLeft: state.data.secondsLeft,
              consecutiveFailures: state.data.consecutiveFailures
            }}
            onPause={handlePause}
            onCancel={handleCancel}
            onStop={handleStopAfterCurrent}
            onViewResults={state.data.progress && state.data.progress.processed >= state.data.progress.total ? () => {
              setState(prev => ({ ...prev, status: 'completed' }));
            } : undefined}
          />
        )}
        
        {state.status === 'completed' && state.data && (
          <ResultsView 
            data={{
              progress: state.data.progress!,
              skippedGames: state.data.skippedGames,
              failedGames: state.data.failedGames
            }}
            onRetryFailed={handleRetryFailed}
            onExport={handleExport}
            onClose={() => router.push('/collection')}
            onReset={async () => {
              // Clear the completed session first
              if (state.sessionId) {
                await fetch('/api/games/bulk-update/cancel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: state.sessionId })
                });
              }
              // Reset state and reload preview
              setState({
                sessionId: null,
                status: 'loading',
                data: null
              });
              checkExistingSession();
            }}
          />
        )}
        
        {state.status === 'error' && (
          <div className={styles.error}>
            <p>Error: {state.data?.error}</p>
            <button onClick={() => router.push('/collection')}>
              Back to Collection
            </button>
          </div>
        )}
      </main>
    </div>
  );
}