'use client';

import { useState, useEffect } from 'react';
import styles from './VideoPickerModal.module.css';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface VideoPickerModalProps {
  gameTitle: string;
  onClose: () => void;
  onSelect: (video: YouTubeVideo) => void;
  onSkip: () => void;
}

export function VideoPickerModal({ gameTitle, onClose, onSelect, onSkip }: VideoPickerModalProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [gameTitle]);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(gameTitle)}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        setVideos([]);
      } else {
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>Pick a How-To-Play Video</h2>
            <p className={styles.gameName}>{gameTitle}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading videos...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button className={styles.skipBtn} onClick={onSkip}>
                Skip Video Selection
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className={styles.empty}>
              <p>No videos found</p>
              <button className={styles.skipBtn} onClick={onSkip}>
                Skip Video Selection
              </button>
            </div>
          ) : (
            <div className={styles.videosList}>
              {videos.map((video) => (
                <div key={video.id} className={styles.videoItem}>
                  <div className={styles.videoThumbnail}>
                    <img src={video.thumbnail} alt={video.title} />
                    <button 
                      className={styles.selectBtn}
                      onClick={() => onSelect(video)}
                    >
                      Select
                    </button>
                  </div>
                  <div className={styles.videoInfo}>
                    <h4 className={styles.videoTitle}>{video.title}</h4>
                    <p className={styles.videoChannel}>{video.channel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.skipBtn} onClick={onSkip}>
            Skip This Game
          </button>
        </div>
      </div>
    </div>
  );
}
