import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              K
            </div>
            <span className="text-xl font-bold">Kaizen AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-6 pt-24 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
            🚀 AI-Powered Marketing on Autopilot
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Generate & Publish
            <br />
            <span className="text-primary">Daily Video Content</span>
            <br />
            Automatically
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Connect your social networks, define your brand, and let Kaizen AI create and publish
            engaging video content every day. Pay with KairosCoin.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="px-8 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition text-lg"
            >
              See How It Works
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🎬',
              title: 'AI Video Generation',
              desc: 'Generates scripts, voiceover, and avatar videos daily — no editing required.',
            },
            {
              icon: '📱',
              title: 'Multi-Platform Publishing',
              desc: 'Auto-publishes to Instagram, Facebook, TikTok, YouTube, and X simultaneously.',
            },
            {
              icon: '🪙',
              title: 'Pay with KairosCoin',
              desc: 'Buy credits using KairosCoin from your Kairos Wallet. Fast, secure, no credit cards.',
            },
            {
              icon: '🎯',
              title: 'Brand Consistency',
              desc: 'Define your tone, style, and master prompt once. AI stays on-brand every time.',
            },
            {
              icon: '📊',
              title: 'Dashboard & Analytics',
              desc: 'Track every post, view metrics, manage your content calendar in one place.',
            },
            {
              icon: '🔄',
              title: 'Set It & Forget It',
              desc: 'Toggle auto-post ON and Kaizen handles everything daily. You just review.',
            },
          ].map((feature) => (
            <div key={feature.title} className="p-6 rounded-xl border border-border bg-card">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <a href="https://wallet.kairos-777.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
              Kairos Wallet
            </a>
            <span className="text-border">·</span>
            <a href="https://kairos-777.com/buy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
              Buy KairosCoin
            </a>
            <span className="text-border">·</span>
            <a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
              Kairos Ecosystem
            </a>
          </div>
          <p>© {new Date().getFullYear()} Kaizen AI Marketing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
