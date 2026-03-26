import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import styles from './layout.module.css';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className={styles.settingsLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>Settings</h1>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/settings/profile" className={styles.navLink}>
            <span className={styles.icon}>👤</span>
            Profile
          </Link>
          <Link href="/settings/players" className={styles.navLink}>
            <span className={styles.icon}>🎮</span>
            Manage Players
          </Link>
          <Link href="/settings/bulk-update" className={styles.navLink}>
            <span className={styles.icon}>🔄</span>
            Bulk Update from BGG
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            ← Back to App
          </Link>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
