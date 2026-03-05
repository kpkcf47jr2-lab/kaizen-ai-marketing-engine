'use client';

import { useState, useEffect } from 'react';
import { TONE_OPTIONS, SUPPORTED_LANGUAGES } from '@kaizen/shared';

export default function BrandKitPage() {
  const [form, setForm] = useState({
    brandName: '', niche: '', language: 'en', tone: '',
    masterPrompt: '', ctas: [''], links: [''], hashtagsDefault: [''],
    styleGuidelines: '', products: '', targetAudience: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/brand').then((r) => r.json()).then((data) => {
      if (data.data) {
        setForm({
          ...data.data,
          ctas: data.data.ctas?.length ? data.data.ctas : [''],
          links: data.data.links?.length ? data.data.links : [''],
          hashtagsDefault: data.data.hashtagsDefault?.length ? data.data.hashtagsDefault : [''],
        });
      }
    });
  }, []);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    const body = {
      ...form,
      ctas: form.ctas.filter(Boolean),
      links: form.links.filter(Boolean),
      hashtagsDefault: form.hashtagsDefault.filter(Boolean),
    };
    await fetch('/api/brand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateArray(field: 'ctas' | 'links' | 'hashtagsDefault', index: number, value: string) {
    const arr = [...form[field]];
    arr[index] = value;
    setForm({ ...form, [field]: arr });
  }

  function addToArray(field: 'ctas' | 'links' | 'hashtagsDefault') {
    setForm({ ...form, [field]: [...form[field], ''] });
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Brand Kit</h1>
          <p className="text-muted-foreground">Define your brand identity for AI-generated content.</p>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition">
          {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Brand Kit'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-semibold text-lg">Brand Identity</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Brand Name *</label>
              <input type="text" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className={inputClass} placeholder="Your Brand" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Niche</label>
              <input type="text" value={form.niche || ''} onChange={(e) => setForm({ ...form, niche: e.target.value })} className={inputClass} placeholder="e.g. Digital Marketing, Fitness, Tech" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Language</label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputClass}>
                  {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tone</label>
                <select value={form.tone || ''} onChange={(e) => setForm({ ...form, tone: e.target.value })} className={inputClass}>
                  <option value="">Select tone...</option>
                  {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Target Audience</label>
              <input type="text" value={form.targetAudience || ''} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className={inputClass} placeholder="e.g. Small business owners, ages 25-45" />
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-semibold text-lg">Products & Services</h2>
            <textarea value={form.products || ''} onChange={(e) => setForm({ ...form, products: e.target.value })} rows={4} className={inputClass} placeholder="Describe your products or services..." />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-semibold text-lg">Master Prompt *</h2>
            <p className="text-xs text-muted-foreground">This is the core instruction for AI. Be specific about what content you want.</p>
            <textarea value={form.masterPrompt} onChange={(e) => setForm({ ...form, masterPrompt: e.target.value })} rows={6} className={inputClass}
              placeholder="e.g. Create daily tips about digital marketing for small businesses. Focus on actionable advice that helps grow their online presence. Always end with a motivating CTA." />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-semibold text-lg">CTAs & Links</h2>
            {form.ctas.map((cta, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={cta} onChange={(e) => updateArray('ctas', i, e.target.value)} className={inputClass} placeholder="e.g. Follow for more tips!" />
              </div>
            ))}
            <button onClick={() => addToArray('ctas')} className="text-sm text-primary hover:underline">+ Add CTA</button>

            <div className="pt-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="url" value={link} onChange={(e) => updateArray('links', i, e.target.value)} className={inputClass} placeholder="https://..." />
                </div>
              ))}
              <button onClick={() => addToArray('links')} className="text-sm text-primary hover:underline">+ Add Link</button>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-semibold text-lg">Default Hashtags</h2>
            <div className="flex flex-wrap gap-2">
              {form.hashtagsDefault.map((tag, i) => (
                <input key={i} type="text" value={tag} onChange={(e) => updateArray('hashtagsDefault', i, e.target.value)} className="px-3 py-1 rounded-lg border border-input bg-background text-sm w-36" placeholder="#hashtag" />
              ))}
            </div>
            <button onClick={() => addToArray('hashtagsDefault')} className="text-sm text-primary hover:underline">+ Add Hashtag</button>
          </div>
        </div>
      </div>
    </div>
  );
}
