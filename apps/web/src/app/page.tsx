import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-[128px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-border/30 backdrop-blur-md bg-background/60">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/30">
              K
            </div>
            <span className="text-xl font-bold tracking-tight">KAME</span>
            <span className="hidden sm:inline text-xs text-muted-foreground font-medium tracking-wider uppercase ml-1">
              AI Marketing
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-2">
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-sm px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 text-white"
              style={{
                background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-6 pt-20 md:pt-32 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm text-primary mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>🚀 La plataforma #1 en Marketing con IA</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.95]">
              Tu Marketing en
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, hsl(262, 83%, 68%) 0%, hsl(280, 80%, 60%) 50%, hsl(320, 70%, 60%) 100%)',
                }}
              >
                Piloto Automático
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              KAME genera videos profesionales con IA, crea scripts virales y publica
              automáticamente en <strong className="text-foreground">todas tus redes sociales</strong>.
              Sin experiencia. Sin esfuerzo. Sin límites.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/register"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
                  boxShadow: '0 8px 40px rgba(139, 92, 246, 0.4)',
                }}
              >
                Comenzar Gratis →
              </Link>
              <Link
                href="#como-funciona"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-border text-foreground font-semibold text-lg hover:bg-accent transition"
              >
                ¿Cómo Funciona?
              </Link>
            </div>

            <p className="text-xs text-muted-foreground/60">
              ✓ No necesitas tarjeta de crédito &nbsp;·&nbsp; ✓ Configuración en 2 minutos &nbsp;·&nbsp; ✓ Cancela cuando quieras
            </p>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border/30 bg-card/30 backdrop-blur-sm py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: '6', label: 'Redes Sociales' },
                { number: '30+', label: 'Tipos de Contenido' },
                { number: '24/7', label: 'Publicación Automática' },
                { number: '100%', label: 'Potenciado por IA' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-black text-primary">{stat.number}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tan Fácil Como <span className="text-primary">1, 2, 3</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              No necesitas saber de marketing. KAME hace todo por ti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🎨',
                title: 'Define tu Marca',
                desc: 'Cuéntanos sobre tu negocio: nombre, nicho, tono, audiencia. Solo una vez — KAME recuerda todo.',
              },
              {
                step: '02',
                icon: '🔗',
                title: 'Conecta tus Redes',
                desc: 'Conecta Elite, Instagram, TikTok, YouTube, X o Facebook con un click. OAuth seguro.',
              },
              {
                step: '03',
                icon: '🚀',
                title: 'Activa y Olvídate',
                desc: 'KAME genera videos, scripts y thumbnails con IA. Los publica automáticamente todos los días.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="absolute -top-4 -left-2 text-6xl font-black text-primary/10 group-hover:text-primary/20 transition">
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-card/30 border-y border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Todo lo que Necesitas.{' '}
                <span className="text-primary">Nada que No.</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Una plataforma completa que reemplaza 10 herramientas diferentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: '🎬', title: 'Videos con IA', desc: 'Genera videos HD con avatar, voz y efectos automáticamente. Sin editor de video.' },
                { icon: '✍️', title: 'Scripts Virales', desc: 'GPT-4o crea scripts optimizados para cada red social con tu tono de marca.' },
                { icon: '📱', title: '6 Redes Sociales', desc: 'Publica en Elite, Instagram, Facebook, TikTok, YouTube y X simultáneamente.' },
                { icon: '🤖', title: 'Asistente AI 24/7', desc: 'Nuestro asistente te guía paso a paso. Pregunta lo que quieras sobre marketing.' },
                { icon: '📅', title: 'Calendario Inteligente', desc: 'Programa contenido a las horas de mayor engagement. KAME optimiza por ti.' },
                { icon: '🎯', title: '30 Tipos de Contenido', desc: 'Tutoriales, testimonios, behind-the-scenes, tips, tendencias... nunca se repite.' },
                { icon: '🖼️', title: 'Thumbnails con IA', desc: 'DALL-E genera thumbnails atractivos que aumentan tus clicks y views.' },
                { icon: '📊', title: 'Analíticas en Tiempo Real', desc: 'Métricas de cada post: views, likes, comentarios, shares. Todo en un dashboard.' },
                { icon: '🪙', title: 'Paga con KairosCoin', desc: 'Compra créditos con KRC desde tu Kairos Wallet. Rápido, seguro, sin tarjeta.' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Precios Simples. <span className="text-primary">Sin Sorpresas.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Empieza gratis. Escala cuando estés listo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                tier: 'FREE', price: '0', desc: 'Perfecto para probar', popular: false,
                features: ['Videos con watermark', '1 video/día', '3 redes sociales', 'Asistente AI', 'Dashboard básico'],
                cta: 'Empezar Gratis',
              },
              {
                tier: 'PRO', price: '10', desc: 'Para creadores serios', popular: true,
                features: ['Sin watermark ✨', '2 videos/día', '6 redes sociales', 'Asistente AI Premium', 'Analíticas completas', 'Calendario avanzado'],
                cta: 'Ir a PRO',
              },
              {
                tier: 'ULTRA', price: '50', desc: 'Para empresas y agencias', popular: false,
                features: ['Calidad 4K Premium', 'Videos ilimitados', '6 redes sociales', 'Asistente AI dedicado', 'API access', 'Soporte prioritario'],
                cta: 'Ir a ULTRA',
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? 'border-primary bg-primary/5 scale-105 shadow-xl shadow-primary/10'
                    : 'border-border/50 bg-card/50 hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white bg-primary">
                    ⭐ MÁS POPULAR
                  </div>
                )}
                <div className="text-sm font-bold text-primary tracking-wider mb-2">{plan.tier}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">créditos/video</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${
                    plan.popular ? 'text-white' : 'border border-border text-foreground hover:bg-accent'
                  }`}
                  style={plan.popular ? {
                    background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
                  } : undefined}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-24 md:pb-32">
          <div
            className="relative rounded-3xl p-12 md:p-20 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(262, 83%, 20%) 0%, hsl(280, 60%, 15%) 100%)',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
                ¿Listo para Revolucionar tu Marketing?
              </h2>
              <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
                Únete a KAME y deja que la IA trabaje por ti. Tu primer video se genera en menos de 5 minutos.
              </p>
              <Link
                href="/register"
                className="inline-block px-12 py-4 rounded-2xl font-semibold text-lg text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 80%, 50%) 100%)',
                  boxShadow: '0 8px 40px rgba(139, 92, 246, 0.5)',
                }}
              >
                Crear Mi Cuenta Gratis →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center text-white font-bold text-sm">K</div>
                <span className="font-bold text-lg">KAME</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La plataforma #1 de marketing automatizado con inteligencia artificial.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-primary transition">Empezar Gratis</Link></li>
                <li><Link href="#como-funciona" className="hover:text-primary transition">Cómo Funciona</Link></li>
                <li><a href="https://elite-777.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Elite Network</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Ecosistema Kairos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://wallet.kairos-777.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Kairos Wallet</a></li>
                <li><a href="https://kairos-777.com/buy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Comprar KairosCoin</a></li>
                <li><a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Kairos 777</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-primary transition">Términos de Servicio</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
            <p>© {new Date().getFullYear()} KAME by Kairos 777. All rights reserved.</p>
            <p>Powered by GPT-4o · HeyGen · KairosCoin (BSC)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
