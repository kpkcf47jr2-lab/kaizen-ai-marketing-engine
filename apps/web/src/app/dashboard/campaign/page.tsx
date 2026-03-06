'use client';

import { useEffect, useState } from 'react';

interface CampaignData {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  videoTier: 'FREE' | 'PRO' | 'ULTRA';
  frequency: number;
  publishHours: number[];
  avatarId: string | null;
  voiceId: string | null;
  language: string;
  autoPublish: boolean;
  totalGenerated: number;
  lastGeneratedAt: string | null;
}

const TIER_INFO = {
  FREE: {
    name: 'Free',
    description: '720p con watermark — 0 créditos',
    color: 'border-gray-500',
    badge: 'bg-gray-500/20 text-gray-300',
    icon: '🎬',
  },
  PRO: {
    name: 'Pro',
    description: '1080p HD sin watermark — 10 créditos',
    color: 'border-primary',
    badge: 'bg-primary/20 text-primary',
    icon: '⚡',
  },
  ULTRA: {
    name: 'Ultra',
    description: 'Avatar IV ultra-realista — 50 créditos',
    color: 'border-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-300',
    icon: '👑',
  },
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export default function CampaignPage() {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [videoTier, setVideoTier] = useState<'FREE' | 'PRO' | 'ULTRA'>('PRO');
  const [frequency, setFrequency] = useState(1);
  const [publishHours, setPublishHours] = useState<number[]>([9]);
  const [language, setLanguage] = useState('es');
  const [autoPublish, setAutoPublish] = useState(true);
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');

  useEffect(() => {
    fetch('/api/campaign')
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) {
          const c = data.campaign as CampaignData;
          setCampaign(c);
          setVideoTier(c.videoTier);
          setFrequency(c.frequency);
          setPublishHours(c.publishHours);
          setLanguage(c.language);
          setAutoPublish(c.autoPublish);
          setAvatarId(c.avatarId || '');
          setVoiceId(c.voiceId || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/campaign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTier,
          frequency,
          publishHours,
          language,
          autoPublish,
          avatarId: avatarId || null,
          voiceId: voiceId || null,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCampaign(data.campaign);
        setMessage('✅ Campaña guardada');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePause() {
    if (!campaign) return;
    setSaving(true);
    try {
      const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const res = await fetch('/api/campaign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) setCampaign(data.campaign);
    } finally {
      setSaving(false);
    }
  }

  function togglePublishHour(hour: number) {
    setPublishHours((prev) => {
      if (prev.includes(hour)) {
        return prev.length > 1 ? prev.filter((h) => h !== hour) : prev;
      }
      return [...prev, hour].sort((a, b) => a - b);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎬 Campaña</h1>
          <p className="text-muted-foreground mt-1">
            Configura tu contenido diario automatizado con HeyGen + GPT-4o
          </p>
        </div>
        {campaign && (
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                campaign.status === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {campaign.status === 'ACTIVE' ? '● Activa' : '⏸ Pausada'}
            </span>
            <button
              onClick={handleTogglePause}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition text-sm"
            >
              {campaign.status === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
            </button>
          </div>
        )}
      </div>

      {/* Stats (if campaign exists) */}
      {campaign && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Videos generados</p>
            <p className="text-2xl font-bold mt-1">{campaign.totalGenerated}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Frecuencia</p>
            <p className="text-2xl font-bold mt-1">{campaign.frequency}x/día</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Último video</p>
            <p className="text-lg font-bold mt-1">
              {campaign.lastGeneratedAt
                ? new Date(campaign.lastGeneratedAt).toLocaleDateString()
                : 'Nunca'}
            </p>
          </div>
        </div>
      )}

      {/* Video Tier Selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Calidad de video</h2>
        <p className="text-sm text-muted-foreground">
          Pagás en KairosCoin (KRC) — nosotros nos encargamos de HeyGen.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(TIER_INFO) as [keyof typeof TIER_INFO, (typeof TIER_INFO)[keyof typeof TIER_INFO]][]).map(
            ([tier, info]) => (
              <button
                key={tier}
                onClick={() => setVideoTier(tier)}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  videoTier === tier
                    ? `${info.color} bg-card shadow-lg scale-[1.02]`
                    : 'border-border bg-card/50 hover:bg-card'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{info.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.badge}`}>
                    {info.name}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Frecuencia</h2>
        <div className="flex gap-4">
          {[1, 2].map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`px-6 py-3 rounded-xl border-2 font-medium transition ${
                frequency === f
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {f}x al día
            </button>
          ))}
        </div>
      </div>

      {/* Publish Hours */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Horarios de publicación</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona las horas en las que quieres que se publique (puedes elegir varias)
        </p>
        <div className="flex flex-wrap gap-2">
          {HOUR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => togglePublishHour(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                publishHours.includes(opt.value)
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Idioma</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-sm"
        >
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇺🇸 English</option>
          <option value="pt">🇧🇷 Português</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="de">🇩🇪 Deutsch</option>
        </select>
      </div>

      {/* Avatar & Voice IDs (advanced) */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Avatar y Voz (opcional)</h2>
        <p className="text-sm text-muted-foreground">
          IDs de HeyGen. Déjalos vacíos para usar los predeterminados.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Avatar ID</label>
            <input
              type="text"
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              placeholder="ej: angela_cfo_16-9"
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Voice ID</label>
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="ej: 1bd001e7e50b421d819..."
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Auto-Publish */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAutoPublish(!autoPublish)}
          className={`relative w-12 h-6 rounded-full transition ${
            autoPublish ? 'bg-primary' : 'bg-border'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
              autoPublish ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium">Auto-publicar</p>
          <p className="text-xs text-muted-foreground">
            Los videos se publican automáticamente en tus redes conectadas
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : campaign ? 'Actualizar campaña' : '🚀 Activar campaña'}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="font-semibold">¿Cómo funciona?</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <span>1️⃣</span>
            <p>GPT-4o genera un guión único diario basado en tu Master Prompt (nunca se repite)</p>
          </div>
          <div className="flex gap-2">
            <span>2️⃣</span>
            <p>HeyGen crea el video con avatar + voz sincronizada (sin TTS separado)</p>
          </div>
          <div className="flex gap-2">
            <span>3️⃣</span>
            <p>DALL-E genera el thumbnail y se programa la publicación automática</p>
          </div>
          <div className="flex gap-2">
            <span>4️⃣</span>
            <p>Pagas en KairosCoin (KRC) — nosotros nos encargamos del resto en USD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
