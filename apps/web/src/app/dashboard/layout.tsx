'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Loading...</p></div>;
  }
  if (!session?.user) {
    redirect('/login');
    return null;
  }

  const user = session.user as any;

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/brand', label: 'Brand Kit', icon: '🎨' },
    { href: '/dashboard/campaign', label: 'Campaign', icon: '🎬' },
    { href: '/dashboard/connections', label: 'Connections', icon: '🔗' },
    { href: '/dashboard/credits', label: 'Credits', icon: '🪙' },
    { href: '/dashboard/calendar', label: 'Calendar', icon: '📅' },
    { href: '/dashboard/library', label: 'Library', icon: '📁' },
  ];

  if (user.role === 'ADMIN') {
    navItems.push({ href: '/dashboard/admin', label: 'Admin', icon: '⚙️' });
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              K
            </div>
            <span className="font-bold">Kaizen AI</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent transition"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              {user.name?.[0] || user.email?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
