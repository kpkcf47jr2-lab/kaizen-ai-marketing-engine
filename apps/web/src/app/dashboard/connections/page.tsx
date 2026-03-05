'use client';

import { useState, useEffect } from 'react';
import { SOCIAL_PROVIDERS } from '@kaizen/shared';

type Account = { id: string; provider: string; providerUsername: string; status: string; connectedAt: string };

export default function ConnectionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch('/api/social').then((r) => r.json()).then((d) => setAccounts(d.data || []));
  }, []);

  function getOAuthUrl(provider: string) {
    if (provider === 'META_INSTAGRAM' || provider === 'META_FACEBOOK') {
      const scopes = [...SOCIAL_PROVIDERS.META_INSTAGRAM.scopes, ...SOCIAL_PROVIDERS.META_FACEBOOK.scopes].join(',');
      return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/social/meta/callback')}&scope=${scopes}&response_type=code`;
    }
    // TODO: Add other providers
    return '#';
  }

  const isConnected = (provider: string) => accounts.some((a) => a.provider === provider);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Social Connections</h1>
      <p className="text-muted-foreground mb-8">Connect your social networks for auto-publishing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(SOCIAL_PROVIDERS) as [string, any][]).map(([key, config]) => {
          const account = accounts.find((a) => a.provider === key);
          return (
            <div key={key} className="p-5 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: config.color }}>
                  {config.name[0]}
                </div>
                <div>
                  <p className="font-medium">{config.name}</p>
                  {account ? (
                    <p className="text-sm text-green-500">@{account.providerUsername || 'connected'}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              {account ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Connected</span>
              ) : (
                <a href={getOAuthUrl(key)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
                  Connect
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
