import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';

async function getAdminStats() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalGames,
      totalPlays,
      totalInviteCodes,
      usedInviteCodes,
      activeInviteCodes,
      usersByMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.game.count(),
      prisma.playLog.count(),
      prisma.inviteCode.count(),
      prisma.inviteCode.count({ where: { usedBy: { not: null } } }),
      prisma.inviteCode.count({ where: { usedBy: null, isActive: true } }),
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      
      const count = usersByMonth.filter(u => {
        const userDate = new Date(u.createdAt);
        return userDate.getMonth() === monthDate.getMonth() &&
               userDate.getFullYear() === monthDate.getFullYear();
      }).reduce((sum, u) => sum + u._count.id, 0);
      
      monthlyData.push({ month: `${monthName} ${year}`, count });
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
        growthByMonth: monthlyData,
      },
      content: { games: totalGames, plays: totalPlays },
      inviteCodes: { total: totalInviteCodes, used: usedInviteCodes, active: activeInviteCodes },
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return null;
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }
  
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