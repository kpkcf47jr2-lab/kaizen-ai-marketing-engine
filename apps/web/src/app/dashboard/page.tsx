import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CreditsService } from '@/services/credits.service';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as any).id;

  const [balance, socialAccounts, recentPosts, brandProfile] = await Promise.all([
    CreditsService.getBalance(userId),
    prisma.socialAccount.findMany({ where: { userId }, select: { provider: true, status: true, providerUsername: true } }),
    prisma.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5, include: { socialAccount: { select: { provider: true } } } }),
    prisma.brandProfile.findUnique({ where: { userId } }),
  ]);

  const stats = [
    { label: 'Credits Balance', value: balance.toLocaleString(), icon: '🪙' },
    { label: 'Connected Networks', value: socialAccounts.length.toString(), icon: '🔗' },
    { label: 'Posts This Month', value: recentPosts.length.toString(), icon: '📝' },
    { label: 'Auto-Post', value: brandProfile ? 'Active' : 'Setup needed', icon: '🤖' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome back! Here's your marketing overview.</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {!brandProfile && (
        <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 mb-8">
          <h2 className="text-lg font-semibold mb-2">🚀 Complete your setup</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your Brand Kit to start generating content automatically.
          </p>
          <a
            href="/dashboard/brand"
            className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            Create Brand Kit →
          </a>
        </div>
      )}

      {/* Recent Posts */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Recent Posts</h2>
        </div>
        {recentPosts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No posts yet. Set up your brand and connections to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentPosts.map((post) => (
              <div key={post.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    post.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-500' :
                    post.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {post.status}
                  </span>
                  <span className="text-sm">{post.socialAccount.provider}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
