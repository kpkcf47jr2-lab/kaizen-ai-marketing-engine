'use client';

import { useState, useEffect } from 'react';

type AssetItem = {
  id: string;
  type: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  contentJob: { scriptTitle: string; status: string } | null;
};

export default function LibraryPage() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Add /api/assets endpoint. For now, we pull from posts.
    fetch('/api/posts').then((r) => r.json()).then((d) => {
      const posts = d.data || [];
      const extracted: AssetItem[] = posts
        .filter((p: any) => p.asset)
        .map((p: any) => ({ ...p.asset, contentJob: p.contentJob }));
      setAssets(extracted);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'ALL' ? assets : assets.filter((a) => a.type === filter);

  const typeIcon: Record<string, string> = {
    VIDEO: '🎬',
    AUDIO: '🎵',
    SCRIPT: '📝',
    THUMBNAIL: '🖼️',
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Asset Library</h1>
      <p className="text-muted-foreground mb-8">Browse all your generated content.</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'VIDEO', 'AUDIO', 'SCRIPT', 'THUMBNAIL'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            {t === 'ALL' ? '📂 All' : `${typeIcon[t] || ''} ${t.charAt(0) + t.slice(1).toLowerCase()}s`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading assets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-muted-foreground">No assets found. Generate some content first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <div key={asset.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition group">
              {/* Preview area */}
              <div className="aspect-[9/16] rounded-lg bg-muted/30 flex items-center justify-center text-4xl mb-3">
                {typeIcon[asset.type] || '📄'}
              </div>
              <h3 className="font-medium text-sm truncate">{asset.contentJob?.scriptTitle || asset.filename}</h3>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{typeIcon[asset.type]} {asset.type}</span>
                <span>{formatSize(asset.sizeBytes)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(asset.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
