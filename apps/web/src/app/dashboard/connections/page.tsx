'use client';

import { useState, useEffect } from 'react';
import { SOCIAL_PROVIDERS } from '@kaizen/shared';

type Account = { id: string; provider: string; providerUsername: string; status: string; connectedAt: string; metadata?: any };

export default function ConnectionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Modals state
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [telegramForm, setTelegramForm] = useState({ botToken: '', channelId: '' });
  const [whatsappForm, setWhatsappForm] = useState({ accessToken: '', phoneNumberId: '', channelId: '' });
  const [connecting, setConnecting] = useState(false);

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
    } else if (params.get('success') === 'telegram') {
      setStatusMsg('✅ ¡Telegram conectado exitosamente!');
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (params.get('success') === 'whatsapp') {
      setStatusMsg('✅ ¡WhatsApp conectado exitosamente!');
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (params.get('error') === 'elite_failed') {
      setStatusMsg('❌ Error al conectar Elite — intenta de nuevo');
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (params.get('error') === 'elite_oauth_denied') {
      setStatusMsg('⚠️ Conexión cancelada');
      window.history.replaceState({}, '', '/dashboard/connections');
    }
  }, []);

  // Telegram connect handler
  async function handleTelegramConnect() {
    if (!telegramForm.botToken || !telegramForm.channelId) {
      setStatusMsg('⚠️ Completa todos los campos de Telegram');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/social/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramForm),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`✅ Telegram conectado: @${data.data.botUsername} → ${data.data.channelTitle}`);
        setShowTelegramModal(false);
        setTelegramForm({ botToken: '', channelId: '' });
        // Refresh accounts
        fetch('/api/social').then((r) => r.json()).then((d) => setAccounts(d.data || []));
      } else {
        setStatusMsg(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  }

  // WhatsApp connect handler
  async function handleWhatsappConnect() {
    if (!whatsappForm.accessToken || !whatsappForm.phoneNumberId) {
      setStatusMsg('⚠️ Completa los campos requeridos de WhatsApp');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/social/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappForm),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`✅ WhatsApp conectado: ${data.data.displayName} (${data.data.phoneNumber})`);
        setShowWhatsappModal(false);
        setWhatsappForm({ accessToken: '', phoneNumberId: '', channelId: '' });
        fetch('/api/social').then((r) => r.json()).then((d) => setAccounts(d.data || []));
      } else {
        setStatusMsg(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  }

  const eliteAccount = accounts.find((a) => a.provider === 'ELITE');
  const telegramAccount = accounts.find((a) => a.provider === 'TELEGRAM');
  const whatsappAccount = accounts.find((a) => a.provider === 'WHATSAPP');
  const socialProviders = Object.entries(SOCIAL_PROVIDERS).filter(
    ([key]) => !['ELITE', 'TELEGRAM', 'WHATSAPP'].includes(key),
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Redes sociales y canales</h1>
      <p className="text-muted-foreground mb-8">Conecta tus redes y canales de mensajería para publicación automática.</p>

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

      {/* ── Messaging Channels (Telegram + WhatsApp) ────── */}
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">📢</span> Canales de Mensajería
        <span className="text-xs font-normal text-muted-foreground ml-2">— Envía noticias, banners y escritos automáticamente</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Telegram Card */}
        <div className={`relative overflow-hidden rounded-2xl border-2 ${telegramAccount ? 'border-green-500' : 'border-[#26A5E4]'} bg-gradient-to-br from-[#26A5E4]/10 via-card to-[#26A5E4]/5 p-5`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#26A5E4] flex items-center justify-center text-white shadow-lg shadow-[#26A5E4]/30">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Telegram</h3>
              {telegramAccount ? (
                <p className="text-sm text-green-400 mt-0.5">✓ {telegramAccount.providerUsername}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">Publica noticias y banners en tu canal</p>
              )}
            </div>
            {telegramAccount ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                ✓ Conectado
              </span>
            ) : (
              <button
                onClick={() => setShowTelegramModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#26A5E4] text-white font-semibold text-sm hover:bg-[#1e95d4] transition shadow-lg shadow-[#26A5E4]/25"
              >
                Conectar
              </button>
            )}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#26A5E4]/20 text-xs text-muted-foreground">
            <span>📝 Escritos con IA</span>
            <span>🎨 Banners automáticos</span>
            <span>🎬 Videos compartidos</span>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className={`relative overflow-hidden rounded-2xl border-2 ${whatsappAccount ? 'border-green-500' : 'border-[#25D366]'} bg-gradient-to-br from-[#25D366]/10 via-card to-[#25D366]/5 p-5`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-[#25D366]/30">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">WhatsApp</h3>
              {whatsappAccount ? (
                <p className="text-sm text-green-400 mt-0.5">✓ {whatsappAccount.providerUsername}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">Envía contenido a tus canales de WhatsApp</p>
              )}
            </div>
            {whatsappAccount ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                ✓ Conectado
              </span>
            ) : (
              <button
                onClick={() => setShowWhatsappModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1ec558] transition shadow-lg shadow-[#25D366]/25"
              >
                Conectar
              </button>
            )}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#25D366]/20 text-xs text-muted-foreground">
            <span>📝 Noticias diarias</span>
            <span>🎨 Banners con marca</span>
            <span>📱 WhatsApp Business</span>
          </div>
        </div>
      </div>

      {/* ── Other Social Networks ─────────────────────────── */}
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Otras redes sociales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socialProviders.map(([key, config]) => {
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

      {/* ── Telegram Connection Modal ──────────────────── */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTelegramModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#26A5E4] flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Conectar Telegram</h2>
                <p className="text-sm text-muted-foreground">Conecta un bot a tu canal de Telegram</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border text-sm">
              <h4 className="font-semibold text-[#26A5E4]">📋 Pasos para configurar:</h4>
              <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                <li>Abre Telegram y busca <strong>@BotFather</strong></li>
                <li>Envía <code className="bg-muted px-1 rounded">/newbot</code> y sigue las instrucciones</li>
                <li>Copia el <strong>token del bot</strong> que te da BotFather</li>
                <li>Crea un canal (o usa uno existente)</li>
                <li>Agrega tu bot como <strong>administrador</strong> del canal</li>
                <li>Pega el token y el @nombre del canal abajo</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token del Bot</label>
                <input
                  type="password"
                  placeholder="123456789:ABCDefGhIJKlmNOpQRStUvWxYz..."
                  value={telegramForm.botToken}
                  onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:border-[#26A5E4] focus:ring-1 focus:ring-[#26A5E4] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ID del Canal</label>
                <input
                  type="text"
                  placeholder="@mi_canal o -1001234567890"
                  value={telegramForm.channelId}
                  onChange={(e) => setTelegramForm({ ...telegramForm, channelId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:border-[#26A5E4] focus:ring-1 focus:ring-[#26A5E4] outline-none transition"
                />
                <p className="text-xs text-muted-foreground mt-1">Usa @username del canal público o el ID numérico para canales privados</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTelegramModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleTelegramConnect}
                disabled={connecting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#26A5E4] text-white text-sm font-semibold hover:bg-[#1e95d4] transition disabled:opacity-50 shadow-lg shadow-[#26A5E4]/25"
              >
                {connecting ? '⏳ Verificando...' : '🔗 Conectar Canal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Connection Modal ──────────────────── */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWhatsappModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Conectar WhatsApp</h2>
                <p className="text-sm text-muted-foreground">Conecta tu cuenta de WhatsApp Business</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border text-sm">
              <h4 className="font-semibold text-[#25D366]">📋 Pasos para configurar:</h4>
              <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                <li>Ve a <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-[#25D366] underline">Meta Business Suite</a></li>
                <li>Configura WhatsApp Business API en tu cuenta</li>
                <li>Ve a <strong>Configuración → API</strong> y genera un token permanente</li>
                <li>Copia el <strong>Phone Number ID</strong> de tu número verificado</li>
                <li>Pega ambos valores abajo</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token de Acceso (permanente)</label>
                <input
                  type="password"
                  placeholder="EAABsb..."
                  value={whatsappForm.accessToken}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={whatsappForm.phoneNumberId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Channel ID <span className="text-muted-foreground">(opcional)</span></label>
                <input
                  type="text"
                  placeholder="ID del canal de WhatsApp (si tienes uno)"
                  value={whatsappForm.channelId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, channelId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWhatsappModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleWhatsappConnect}
                disabled={connecting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ec558] transition disabled:opacity-50 shadow-lg shadow-[#25D366]/25"
              >
                {connecting ? '⏳ Verificando...' : '🔗 Conectar WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
