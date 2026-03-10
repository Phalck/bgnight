'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface SiteSettings {
  id: string;
  allowRegistration: boolean;
  inviteOnlyMode: boolean;
  updatedAt: string;
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        addToast('Failed to load settings', 'error');
      }
    } catch (error) {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowRegistration: !settings.allowRegistration }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        addToast(
          `Registration ${data.allowRegistration ? 'enabled' : 'disabled'}`,
          'success'
        );
      } else {
        addToast('Failed to update settings', 'error');
      }
    } catch (error) {
      addToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInviteOnly = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteOnlyMode: !settings.inviteOnlyMode }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        addToast(
          `Invite-only mode ${data.inviteOnlyMode ? 'enabled' : 'disabled'}`,
          'success'
        );
      } else {
        addToast('Failed to update settings', 'error');
      }
    } catch (error) {
      addToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading settings...</div>;
  }

  if (!settings) {
    return <div className={styles.error}>Failed to load settings</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Site Settings</h1>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <div className={styles.settingIcon}>📝</div>
            <div className={styles.settingInfo}>
              <h3>User Registration</h3>
              <p>Allow new users to register on the site</p>
            </div>
          </div>
          
          <div className={styles.settingControl}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={handleToggleRegistration}
                disabled={saving}
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span className={styles.toggleLabel}>
              {settings.allowRegistration ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className={styles.settingDescription}>
            When disabled, no new users will be able to create accounts. 
            Existing users can still log in normally.
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <div className={styles.settingIcon}>🔑</div>
            <div className={styles.settingInfo}>
              <h3>Invite-Only Mode</h3>
              <p>Require invite codes for registration</p>
            </div>
          </div>
          
          <div className={styles.settingControl}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.inviteOnlyMode}
                onChange={handleToggleInviteOnly}
                disabled={saving || !settings.allowRegistration}
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span className={styles.toggleLabel}>
              {settings.inviteOnlyMode ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className={styles.settingDescription}>
            When enabled, new users must provide a valid invite code to register. 
            Manage invite codes in the Invite Codes section.
          </div>
          
          {!settings.allowRegistration && (
            <div className={styles.warning}>
              Registration must be enabled to use invite-only mode.
            </div>
          )}
        </div>
      </div>

      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>Current Configuration</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Registration:</span>
            <span className={`${styles.infoValue} ${settings.allowRegistration ? styles.active : styles.inactive}`}>
              {settings.allowRegistration ? '✅ Open' : '🚫 Closed'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Invite Only:</span>
            <span className={`${styles.infoValue} ${settings.inviteOnlyMode ? styles.active : ''}`}>
              {settings.inviteOnlyMode ? '🔑 Required' : '👥 Not Required'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Last Updated:</span>
            <span className={styles.infoValue}>
              {new Date(settings.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}