import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

async function getAdminStats() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/stats`, {
      headers: {
        cookie: '',
      },
    });
    
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getAdminStats();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      {stats ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.users.total}</span>
                <span className={styles.statLabel}>Total Users</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.users.active}</span>
                <span className={styles.statLabel}>Active Users</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.users.newThisMonth}</span>
                <span className={styles.statLabel}>New This Month</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎮</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.content.games}</span>
                <span className={styles.statLabel}>Total Games</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.content.plays}</span>
                <span className={styles.statLabel}>Total Plays</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🔑</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.inviteCodes.active}</span>
                <span className={styles.statLabel}>Active Invite Codes</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>User Growth</h2>
            <div className={styles.chartContainer}>
              <div className={styles.barChart}>
                {stats.users.growthByMonth.map((month: { month: string; count: number }) => (
                  <div key={month.month} className={styles.barWrapper}>
                    <div 
                      className={styles.bar}
                      style={{
                        height: `${Math.max((month.count / Math.max(...stats.users.growthByMonth.map((m: { count: number }) => m.count))) * 100, 5)}%`,
                      }}
                    >
                      <span className={styles.barValue}>{month.count}</span>
                    </div>
                    <span className={styles.barLabel}>{month.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.error}>
          Failed to load statistics. Please refresh the page.
        </div>
      )}
    </div>
  );
}