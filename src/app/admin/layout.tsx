import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import styles from './layout.module.css';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>Admin Panel</h1>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>
            <span className={styles.icon}>📊</span>
            Dashboard
          </Link>
          <Link href="/admin/users" className={styles.navLink}>
            <span className={styles.icon}>👥</span>
            Users
          </Link>
          <Link href="/admin/settings" className={styles.navLink}>
            <span className={styles.icon}>⚙️</span>
            Site Settings
          </Link>
          <Link href="/admin/invite-codes" className={styles.navLink}>
            <span className={styles.icon}>🔑</span>
            Invite Codes
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