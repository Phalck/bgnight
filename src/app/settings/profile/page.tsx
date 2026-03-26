'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  allowPlayerLinking: boolean;
  showEmailInSearch: boolean;
}

export default function ProfileSettingsPage() {
  const { data: session, update } = useSession();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        addToast('Failed to load profile', 'error');
      }
    } catch (error) {
      addToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllowLinking = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowPlayerLinking: !profile.allowPlayerLinking }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Update session to reflect changes
        await update({ allowPlayerLinking: data.allowPlayerLinking });
        addToast(
          `Others can ${data.allowPlayerLinking ? 'now' : 'no longer'} add you as a player`,
          'success'
        );
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (error) {
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShowEmail = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showEmailInSearch: !profile.showEmailInSearch }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Update session to reflect changes
        await update({ showEmailInSearch: data.showEmailInSearch });
        addToast(
          `Email will ${data.showEmailInSearch ? 'be shown' : 'be hidden'} in player search`,
          'success'
        );
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (error) {
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }

  if (!profile) {
    return <div className={styles.error}>Failed to load profile</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile Settings</h1>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <div className={styles.settingIcon}>🔗</div>
            <div className={styles.settingInfo}>
              <h3>Allow Player Linking</h3>
              <p>Let others link their players to your account</p>
            </div>
          </div>
          
          <div className={styles.settingControl}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={profile.allowPlayerLinking}
                onChange={handleToggleAllowLinking}
                disabled={saving}
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span className={styles.toggleLabel}>
              {profile.allowPlayerLinking ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className={styles.settingDescription}>
            When enabled, other users can link their created players to your account. 
            This is useful for tracking games where you participated but didn't create the player entry.
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <div className={styles.settingIcon}>📧</div>
            <div className={styles.settingInfo}>
              <h3>Show Email in Search</h3>
              <p>Display your email when others search for users</p>
            </div>
          </div>
          
          <div className={styles.settingControl}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={profile.showEmailInSearch}
                onChange={handleToggleShowEmail}
                disabled={saving || !profile.allowPlayerLinking}
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span className={styles.toggleLabel}>
              {profile.showEmailInSearch ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className={styles.settingDescription}>
            When enabled, your email address will be visible to users searching to link players. 
            This helps distinguish between users with similar names. Only users who allow player linking can be searched.
          </div>
          
          {!profile.allowPlayerLinking && (
            <div className={styles.warning}>
              Player linking must be enabled to show your email in search.
            </div>
          )}
        </div>
      </div>

      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>Your Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Name:</span>
            <span className={styles.infoValue}>
              {profile.name || 'Not set'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email:</span>
            <span className={styles.infoValue}>
              {profile.email}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Player Linking:</span>
            <span className={`${styles.infoValue} ${profile.allowPlayerLinking ? styles.active : styles.inactive}`}>
              {profile.allowPlayerLinking ? '✅ Allowed' : '🚫 Disabled'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email Visibility:</span>
            <span className={`${styles.infoValue} ${profile.showEmailInSearch ? styles.active : ''}`}>
              {profile.showEmailInSearch ? '👁️ Visible' : '🔒 Hidden'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
