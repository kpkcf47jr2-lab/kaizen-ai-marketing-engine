'use client';

import { useState, useEffect } from 'react';

type UserRow = { id: string; name: string | null; email: string; role: string; createdAt: string; _count: { contentJobs: number; posts: number } };

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, totalPosts: 0, failures: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Add /api/admin endpoint. Placeholder data for now.
    setLoading(false);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
      <p className="text-muted-foreground mb-8">Platform management and monitoring.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
          { label: 'Content Jobs', value: stats.totalJobs, icon: '⚙️' },
          { label: 'Published Posts', value: stats.totalPosts, icon: '📤' },
          { label: 'Failures (24h)', value: stats.failures, icon: '❌' },
        ].map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{loading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition text-left">
          <p className="font-medium">🔄 Retry Failed Jobs</p>
          <p className="text-sm text-muted-foreground mt-1">Re-queue all failed content generation jobs</p>
        </button>
        <button className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition text-left">
          <p className="font-medium">📊 Export Analytics</p>
          <p className="text-sm text-muted-foreground mt-1">Download platform analytics as CSV</p>
        </button>
        <button className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition text-left">
          <p className="font-medium">🔧 System Health</p>
          <p className="text-sm text-muted-foreground mt-1">Check Redis, DB, and storage connections</p>
        </button>
      </div>

      {/* Users Table */}
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Jobs</th>
              <th className="text-left p-3 font-medium">Posts</th>
              <th className="text-left p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                {loading ? 'Loading...' : 'No users found. Connect the admin API to see data.'}
              </td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <p className="font-medium">{u.name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">{u._count.contentJobs}</td>
                <td className="p-3">{u._count.posts}</td>
                <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
