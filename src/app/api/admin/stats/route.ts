import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
      // Total users
      prisma.user.count(),
      
      // Active users (not disabled)
      prisma.user.count({ where: { isActive: true } }),
      
      // Admin users
      prisma.user.count({ where: { role: 'ADMIN' } }),
      
      // New users this month (last 30 days)
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      
      // New users this week (last 7 days)
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      
      // Total games
      prisma.game.count(),
      
      // Total plays
      prisma.playLog.count(),
      
      // Total invite codes
      prisma.inviteCode.count(),
      
      // Used invite codes
      prisma.inviteCode.count({
        where: { usedBy: { not: null } },
      }),
      
      // Active (unused) invite codes
      prisma.inviteCode.count({
        where: { usedBy: null, isActive: true },
      }),
      
      // Users registered by month (last 6 months)
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Process users by month for chart data
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
      
      monthlyData.push({
        month: `${monthName} ${year}`,
        count,
      });
    }

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
        growthByMonth: monthlyData,
      },
      content: {
        games: totalGames,
        plays: totalPlays,
      },
      inviteCodes: {
        total: totalInviteCodes,
        used: usedInviteCodes,
        active: activeInviteCodes,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}