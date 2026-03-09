'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { SettingsMenu } from './SettingsMenu';
import styles from './Header.module.css';

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => pathname === path;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎲</span>
          <span className={styles.logoText}>Board Game Night</span>
        </Link>

        {session && (
          <nav className={styles.nav}>
            <Link
              href="/collection"
              className={`${styles.navLink} ${isActive('/collection') ? styles.active : ''}`}
            >
              My Collection
            </Link>
            <Link
              href="/plan"
              className={`${styles.navLink} ${isActive('/plan') ? styles.active : ''}`}
            >
              Plan BGN
            </Link>
            <Link
              href="/planned-nights"
              className={`${styles.navLink} ${isActive('/planned-nights') ? styles.active : ''}`}
            >
              Planned BGNs
            </Link>
            <Link
              href="/plays"
              className={`${styles.navLink} ${isActive('/plays') ? styles.active : ''}`}
            >
              Past BGNs
            </Link>
          </nav>
        )}

        <div className={styles.user}>
          {session ? (
            <>
              <span className={styles.userName}>{session.user.name || session.user.email}</span>
              <SettingsMenu />
              <button onClick={() => signOut()} className={styles.logoutBtn}>
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
