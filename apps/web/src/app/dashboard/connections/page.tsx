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
    const redirectBase = window.location.origin;

    if (provider === 'ELITE') {
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_ELITE_CLIENT_ID || '',
        redirect_uri: `${redirectBase}/api/social/elite/callback`,
        response_type: 'code',
        scope: 'posts:write media:upload profile:read',
      });
      return `https://api.elite-777.com/oauth/authorize?${params.toString()}`;
    }

    if (provider === 'META_INSTAGRAM' || provider === 'META_FACEBOOK') {
      const scopes = [...SOCIAL_PROVIDERS.META_INSTAGRAM.scopes, ...SOCIAL_PROVIDERS.META_FACEBOOK.scopes].join(',');
      return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(redirectBase + '/api/social/meta/callback')}&scope=${scopes}&response_type=code`;
    }

    return '#';
  }

  // Check for success/error in URL params
  const [statusMsg, setStatusMsg] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'elite') {
      setStatusMsg('✅ ¡Elite conectada exitosamente!');
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (params.get('error') === 'elite_failed') {
      setStatusMsg('❌ Error al conectar Elite — intenta de nuevo');
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (params.get('error') === 'elite_oauth_denied') {
      setStatusMsg('⚠️ Conexión cancelada');
      window.history.replaceState({}, '', '/dashboard/connections');
    }
  }, []);

  const eliteAccount = accounts.find((a) => a.provider === 'ELITE');
  const otherProviders = Object.entries(SOCIAL_PROVIDERS).filter(([key]) => key !== 'ELITE');

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Redes sociales</h1>
      <p className="text-muted-foreground mb-8">Conecta tus redes para publicación automática.</p>

      {/* Status message */}
      {statusMsg && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card text-sm">
          {statusMsg}
        </div>
      )}

      {/* ── Elite — Featured Card ─────────────────────────── */}
      <div className="mb-8">
        <div className={`relative overflow-hidden rounded-2xl border-2 ${eliteAccount ? 'border-green-500' : 'border-purple-500'} bg-gradient-to-br from-purple-500/10 via-card to-indigo-500/10 p-6`}>
          {/* Featured badge */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500 text-white shadow-lg shadow-purple-500/30">
              ⭐ Recomendada
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Elite logo */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/30">
              E
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Elite
                <span className="text-purple-400 text-sm font-normal">— La red social del futuro</span>
              </h2>
              {eliteAccount ? (
                <p className="text-sm text-green-400 mt-1">✓ Conectada como @{eliteAccount.providerUsername}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Inicia sesión con tu cuenta de Elite para publicar automáticamente</p>
              )}
            </div>

            {eliteAccount ? (
              <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                ✓ Conectada
              </span>
            ) : (
              <a
                href={getOAuthUrl('ELITE')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm hover:from-purple-600 hover:to-indigo-700 transition shadow-lg shadow-purple-500/25"
              >
                Conectar Elite
              </a>
            )}
          </div>

          {/* Mini features */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-purple-500/20 text-xs text-muted-foreground">
            <span>🎬 Videos HD con IA</span>
            <span>📊 Métricas en tiempo real</span>
            <span>🚀 Máximo alcance orgánico</span>
            <span>💎 Comunidad exclusiva</span>
          </div>
        </div>
      </div>

      {/* ── Other Social Networks ─────────────────────────── */}
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Otras redes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {otherProviders.map(([key, config]) => {
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
                    <p className="text-sm text-muted-foreground">No conectada</p>
                  )}
                </div>
              </div>
              {account ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Conectada</span>
              ) : (
                <a href={getOAuthUrl(key)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
                  Conectar
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
