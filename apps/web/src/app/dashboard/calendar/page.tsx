'use client';

import { useState, useEffect } from 'react';

type PostItem = {
  id: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: string;
  socialAccount: { provider: string; providerUsername: string } | null;
  asset: { type: string; filename: string } | null;
  contentJob: { scriptTitle: string } | null;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts').then((r) => r.json()).then((d) => {
      setPosts(d.data || []);
      setLoading(false);
    });
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      const d = p.scheduledAt || p.publishedAt;
      if (!d) return false;
      const date = new Date(d);
      return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const statusColor: Record<string, string> = {
    PUBLISHED: 'bg-green-500',
    SCHEDULED: 'bg-blue-500',
    FAILED: 'bg-red-500',
    DRAFT: 'bg-gray-500',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Content Calendar</h1>
      <p className="text-muted-foreground mb-8">View and manage your scheduled content.</p>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition">← Prev</button>
        <h2 className="text-xl font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition">Next →</button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-muted/30">
          {DAYS.map((d) => (
            <div key={d} className="p-3 text-center text-sm font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-t border-r border-border bg-muted/10" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayPosts = getPostsForDay(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            return (
              <div key={day} className={`min-h-[100px] border-t border-r border-border p-2 ${isToday ? 'bg-primary/5' : ''}`}>
                <span className={`text-sm font-medium ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full inline-flex items-center justify-center' : ''}`}>
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-xs truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor[p.status] || 'bg-gray-500'}`} />
                      <span className="truncate">{p.contentJob?.scriptTitle || p.socialAccount?.provider || 'Post'}</span>
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{dayPosts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
        {Object.entries(statusColor).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
