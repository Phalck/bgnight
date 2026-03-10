'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import styles from './page.module.css';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/collection');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.hero}>
        <div className={styles.content}>
          <div className={styles.dice}>🎲</div>
          <h1 className={styles.title}>Board Game Night</h1>
          <p className={styles.subtitle}>
            Manage your board game collection and find the perfect game for any occasion
          </p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📚</span>
              <h3>Track Your Collection</h3>
              <p>Import games from BoardGameGeek and keep track of your growing library</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔍</span>
              <h3>Smart Suggestions</h3>
              <p>Find the perfect game based on player count, time, and preferences</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <h3>Quick Filters</h3>
              <p>Filter by players, play time, mechanics, and categories</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📅</span>
              <h3>Plan your game nights</h3>
              <p>Pick a date, one or more games and send an invite with learn to play videos</p>
            </div>
          </div>
          <div className={styles.adminSection}>
            <span className={styles.adminIcon}>⚙️</span>
            <h2>Site Administration</h2>
            <p>
              Built-in admin tools let you manage users, control site registration settings, 
              and view detailed statistics. The first person to register automatically becomes 
              the site administrator.
            </p>
            <div className={styles.adminFeatures}>
              <span>👥 User Management</span>
              <span>🔧 Site Settings</span>
              <span>📊 Statistics</span>
              <span>💾 Backup & Restore</span>
            </div>
          </div>
          <div className={styles.cta}>
            <a href="/login" className={styles.primaryBtn}>
              Get Started
            </a>
            <a href="/register" className={styles.secondaryBtn}>
              Create Account
            </a>
          </div>
        </div>
        <div className={styles.bggAttribution}>
          <a 
            href="https://boardgamegeek.com" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Visit BoardGameGeek"
          >
            <img 
              src="/pic7779581.webp" 
              alt="BoardGameGeek" 
              className={styles.bggLogo}
            />
          </a>
        </div>
      </main>
    </>
  );
}
