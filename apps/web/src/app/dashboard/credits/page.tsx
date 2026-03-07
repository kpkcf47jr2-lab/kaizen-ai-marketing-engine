'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CREDIT_PACKAGES } from '@kaizen/shared';
import KairosLogo, { KairosLogoBadge } from '@/components/kairos-logo';

/* ── Types ────────────────────────────────────────── */
type LedgerEntry = {
  id: string; type: string; amount: number;
  balanceAfter: number; description: string; createdAt: string;
};

/* ── Constants ────────────────────────────────────── */
const KAIROS_TOKEN_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const MERCHANT_WALLET      = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS || '0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B';
const BSC_CHAIN_ID         = '0x38'; // 56 in hex
const BSC_CHAIN_ID_DEC     = 56;

const _ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/* ── Web3 wallet type helpers ── */
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isKairosWallet?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

/* ── KairosPay SDK types ── */
interface KairosPaySDK {
  init: (config: {
    merchantWallet: string;
    chain: number;
    currencies: string[];
    theme: string;
    locale: string;
    onSuccess: (payment: { txHash: string }) => void;
  }) => void;
  checkout: (options: { amount: number; memo: string }) => void;
}

/** Get KairosPay SDK from window (loaded via kairos-pay.js script) */
function getKairosPay(): KairosPaySDK | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).KairosPay;
}

const KAIROS_WALLET_URL  = 'https://wallet.kairos-777.com';

/* ── Tabs ─────────────────────────────────────────── */
type Tab = 'buy' | 'kairos' | 'history';

/* ══════════════════════════════════════════════════════
   Credits Page — Direct Web3 Payment + KairosCoin Hub
   ══════════════════════════════════════════════════════ */
export default function CreditsPage() {
  const [balance, setBalance]   = useState(0);
  const [history, setHistory]   = useState<LedgerEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('buy');
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [krcBalance, setKrcBalance] = useState<string | null>(null);
  const pendingPkgRef = useRef<typeof CREDIT_PACKAGES[number] | null>(null);
  const fetchDataRef  = useRef<() => void>(() => {});
  const [status, setStatus]     = useState<{
    type: 'success' | 'error' | 'info'; message: string;
  } | null>(null);

  /* ── Fetch balance & history ── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/credits');
      const d = await res.json();
      setBalance(d.data?.balance || 0);
      setHistory(d.data?.history || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  fetchDataRef.current = fetchData;

  /* ── Initialize KairosPay SDK ── */
  useEffect(() => {
    const tryInit = () => {
      const kp = getKairosPay();
      if (!kp) return false;
      kp.init({
        merchantWallet: MERCHANT_WALLET,
        chain: 56,
        currencies: ['KAIROS', 'USDT', 'USDC'],
        theme: 'dark',
        locale: 'es',
        onSuccess: async (payment) => {
          const pkg = pendingPkgRef.current;
          if (!pkg) return;
          setStatus({ type: 'info', message: '⏳ Pago confirmado por KairosPay. Verificando en blockchain...' });
          try {
            const res = await fetch('/api/wallet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'pay',
                txHash: payment.txHash,
                packageId: pkg.id,
                chainId: BSC_CHAIN_ID_DEC,
                fromAddress: 'kairos-pay-sdk',
              }),
            });
            const data = await res.json();
            if (data.success) {
              setStatus({
                type: 'success',
                message: `✅ ¡${pkg.credits.toLocaleString()} créditos añadidos exitosamente!`,
              });
              pendingPkgRef.current = null;
              setTimeout(() => fetchDataRef.current(), 3000);
            } else {
              setStatus({ type: 'error', message: data.error || 'Error verificando el pago' });
            }
          } catch {
            setStatus({ type: 'error', message: 'Error de red. Contacta soporte con txHash: ' + payment.txHash });
          }
        },
      });
      return true;
    };
    if (!tryInit()) {
      const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 500);
      return () => clearInterval(iv);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Check if Kairos Wallet / Web3 wallet already connected ── */
  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts?.[0]) {
          setWalletAddr(accounts[0]);
          loadKrcBalance(accounts[0]);
        }
      } catch { /* silent */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load KRC balance for connected wallet ── */
  async function loadKrcBalance(address: string) {
    if (!window.ethereum) return;
    try {
      // ERC20 balanceOf(address) — encoded manually to avoid importing ethers on client
      const data = '0x70a08231' + address.slice(2).padStart(64, '0');
      const raw = await window.ethereum.request({
        method: 'eth_call',
        params: [{ to: KAIROS_TOKEN_ADDRESS, data }, 'latest'],
      }) as string;
      const wei = BigInt(raw);
      const whole = wei / BigInt(10 ** 18);
      const frac  = (wei % BigInt(10 ** 18)).toString().padStart(18, '0').slice(0, 2);
      setKrcBalance(`${whole.toLocaleString()}.${frac}`);
    } catch { /* silent */ }
  }

  /* ── Connect Kairos Wallet — returns address or null ── */
  async function connectWallet(): Promise<string | null> {
    if (!window.ethereum) {
      setStatus({ type: 'info', message: '🔗 No se detectó wallet en el navegador. Usa la opción "Pagar con Kairos Wallet" para pagar sin conexión.' });
      return null;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.[0]) return null;

      const addr = accounts[0];
      setWalletAddr(addr);
      loadKrcBalance(addr);

      // Ensure BSC network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      if (chainId !== BSC_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BSC_CHAIN_ID }],
          });
        } catch (switchErr: unknown) {
          const err = switchErr as { code?: number };
          if (err?.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: BSC_CHAIN_ID,
                chainName: 'BNB Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              }],
            });
          }
        }
      }

      setStatus({ type: 'success', message: '✅ Wallet conectada correctamente' });

      // Save to backend (don't await)
      fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', walletAddress: addr, chainId: BSC_CHAIN_ID_DEC }),
      }).catch(() => {});

      return addr;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setStatus({ type: 'error', message: e?.message || 'Error al conectar wallet' });
      return null;
    }
  }

  /* ── Pay with KairosPay SDK (checkout popup) ── */
  function handlePayWithKairos(pkg: typeof CREDIT_PACKAGES[number]) {
    const kp = getKairosPay();
    if (!kp) {
      setStatus({ type: 'error', message: '⚠️ KairosPay aún no está listo. Recarga la página e intenta de nuevo.' });
      return;
    }
    pendingPkgRef.current = pkg;
    kp.checkout({
      amount: parseFloat(pkg.priceKairosCoin),
      memo: `KAME ${pkg.credits} créditos — Plan ${pkg.id}`,
    });
    setStatus({ type: 'info', message: `🪙 Confirma el pago de ${pkg.priceKairosCoin} KRC en la ventana de KairosPay...` });
  }

  /* ── Buy credits — direct ERC20 transfer via connected wallet ── */
  async function handleBuyDirect(packageId: string, priceKairos: string, credits: number, priceWei: string) {
    // If no wallet connected, connect first
    let currentAddr = walletAddr;
    if (!currentAddr) {
      if (!window.ethereum) {
        // No Web3 in browser — suggest invoice method
        setStatus({ type: 'info', message: '💡 No tienes wallet en el navegador. Usa el botón "Pagar con Kairos Wallet" para pagar sin conexión.' });
        return;
      }
      currentAddr = await connectWallet();
      if (!currentAddr) return;
    }

    setBuying(packageId);
    setStatus(null);

    try {
      // Ensure BSC
      const chainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string;
      if (chainId !== BSC_CHAIN_ID) {
        await window.ethereum!.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_CHAIN_ID }],
        });
      }

      // Encode ERC20 transfer(address,uint256)
      const amountHex = BigInt(priceWei).toString(16).padStart(64, '0');
      const toHex     = MERCHANT_WALLET.slice(2).toLowerCase().padStart(64, '0');
      const txData    = '0xa9059cbb' + toHex + amountHex;

      setStatus({ type: 'info', message: '🔐 Confirma la transacción en tu wallet...' });

      // Send ERC20 transfer
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: currentAddr,
          to: KAIROS_TOKEN_ADDRESS,
          data: txData,
          value: '0x0',
        }],
      }) as string;

      setStatus({ type: 'info', message: '⏳ Pago enviado. Verificando en blockchain...' });

      // Send txHash to backend for on-chain verification
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay',
          txHash,
          packageId,
          chainId: BSC_CHAIN_ID_DEC,
          fromAddress: currentAddr,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus({
          type: 'success',
          message: `✅ ¡${credits.toLocaleString()} créditos se añadirán tras la confirmación on-chain!`,
        });
        setTimeout(fetchData, 5000);
        loadKrcBalance(currentAddr);
      } else {
        setStatus({ type: 'error', message: data.error || 'Error en la verificación del pago' });
      }
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e?.code === 4001) {
        setStatus({ type: 'info', message: 'Pago cancelado por el usuario.' });
      } else {
        setStatus({ type: 'error', message: e?.message || 'Error en el pago. Inténtalo de nuevo.' });
      }
    } finally {
      setBuying(null);
    }
  }

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <KairosLogo size={36} />
        <h1 className="text-3xl font-bold">Créditos</h1>
      </div>
      <p className="text-muted-foreground mb-6">Compra y gestiona tus créditos de generación de contenido.</p>

      {/* ── Status Banner ── */}
      {status && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
          status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          status.type === 'error'   ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {status.message}
        </div>
      )}

      {/* ── Balance + Wallet Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Balance */}
        <div className="p-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <p className="text-sm text-muted-foreground">Saldo disponible</p>
          <p className="text-4xl font-bold mt-1">{loading ? '...' : balance.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">créditos KAME</p>
        </div>
        {/* Kairos Wallet Status */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <KairosLogoBadge size={16} />
            <p className="text-sm text-muted-foreground">Kairos Wallet</p>
          </div>
          {walletAddr ? (
            <div>
              <p className="font-mono text-sm truncate text-foreground">{walletAddr}</p>
              {krcBalance && (
                <div className="flex items-center gap-2 mt-2">
                  <KairosLogoBadge size={18} />
                  <span className="text-lg font-semibold text-yellow-400">{krcBalance} KRC</span>
                </div>
              )}
              <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> BSC conectada
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 transition text-sm font-medium"
              >
                <KairosLogoBadge size={20} />
                Conectar Kairos Wallet
              </button>
              <a
                href={KAIROS_WALLET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                ¿No tienes wallet? Créala gratis en segundos →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border mb-8">
        {([
          { key: 'buy' as Tab, label: '🪙 Comprar Créditos', },
          { key: 'kairos' as Tab, label: '💎 KairosCoin & Wallet', },
          { key: 'history' as Tab, label: '📋 Historial', },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === t.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          TAB 1: BUY CREDITS
          ═══════════════════════════════════════════════ */}
      {activeTab === 'buy' && (
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <KairosLogoBadge size={22} />
            Comprar créditos con KairosCoin
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Paga con KAIROS, USDT o USDC — automático e instantáneo con KairosPay.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div key={pkg.id} className={`p-5 rounded-xl border bg-card flex flex-col relative overflow-hidden ${
                pkg.popular ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}>
                {pkg.popular && (
                  <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    ⭐ POPULAR
                  </span>
                )}
                <h3 className="font-semibold text-lg">{pkg.name}</h3>
                <p className="text-3xl font-bold mt-2">{pkg.credits.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">créditos</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <KairosLogoBadge size={16} />
                  <span className="text-lg font-semibold text-yellow-400">{pkg.priceKairosCoin} KRC</span>
                </div>

                {/* Payment buttons */}
                <div className="mt-auto pt-4 space-y-2">
                  {/* PRIMARY: Pay with KairosPay SDK */}
                  <button
                    onClick={() => handlePayWithKairos(pkg)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white hover:from-yellow-500 hover:to-orange-500 shadow-lg shadow-yellow-500/20"
                  >
                    <KairosLogoBadge size={16} />
                    🪙 Pagar con Crypto
                  </button>

                  {/* SECONDARY: Direct pay via connected wallet (for advanced users) */}
                  {walletAddr ? (
                    <button
                      onClick={() => handleBuyDirect(pkg.id, pkg.priceKairosCoin, pkg.credits, pkg.priceWei)}
                      disabled={buying === pkg.id}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      {buying === pkg.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Procesando...
                        </>
                      ) : (
                        <>🔗 Pagar directo (wallet conectada)</>
                      )}
                    </button>
                  ) : (
                    <p className="text-center text-[10px] text-muted-foreground/70 pt-1">
                      ¿Tienes wallet en el navegador?{' '}
                      <button onClick={connectWallet} className="text-primary hover:underline">Conectar</button>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">💡 ¿Cómo funciona?</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Haz clic en <strong className="text-yellow-400">&quot;🪙 Pagar con Crypto&quot;</strong> — se abre la ventana de KairosPay.</li>
              <li>Confirma el pago con <strong>KAIROS, USDT o USDC</strong> desde tu wallet.</li>
              <li>Los créditos se añaden <strong>automáticamente</strong> tras la confirmación en BSC (~15 seg).</li>
              <li>¡Listo! Usa tus créditos para generar contenido de marketing con IA.</li>
            </ol>
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-xs">
              <p>
                💎 <strong className="text-foreground">¿No tienes KairosCoin?</strong>{' '}
                <a href="https://kairos-777.com/buy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Compra KRC aquí</a>
              </p>
              <p>
                🔗 <strong className="text-foreground">¿Tienes MetaMask/Trust Wallet?</strong>{' '}
                <button onClick={connectWallet} className="text-primary hover:underline">Conecta tu wallet</button>{' '}
                para pagar directo desde el navegador.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB 2: KAIROSCOIN & WALLET
          ═══════════════════════════════════════════════ */}
      {activeTab === 'kairos' && (
        <div>
          {/* Hero KairosCoin */}
          <div className="relative p-8 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-transparent mb-8 overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <KairosLogo size={80} />
              <div>
                <h2 className="text-2xl font-bold text-foreground">Kairos Coin (KRC)</h2>
                <p className="text-muted-foreground mt-1 max-w-lg">
                  La criptomoneda oficial del ecosistema Kairos. Token BEP20 en BNB Smart Chain
                  diseñado para pagos rápidos, seguros y sin intermediarios.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    BEP20
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    BSC Network
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    Pagos Instantáneos
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Comisiones Mínimas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Buy KRC */}
            <div className="p-6 rounded-xl border border-border bg-card group hover:border-yellow-500/30 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Comprar KairosCoin</h3>
                  <p className="text-xs text-muted-foreground">Adquiere KRC de forma rápida y segura</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Compra KairosCoin directamente con tarjeta de crédito, transferencia bancaria o intercambio
                de otras criptomonedas. Proceso sencillo en menos de 2 minutos.
              </p>
              <a
                href="https://kairos-777.com/buy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium text-sm hover:from-yellow-400 hover:to-orange-400 transition shadow-lg shadow-yellow-500/20"
              >
                <KairosLogoBadge size={18} />
                Comprar KRC ahora
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Kairos Wallet */}
            <div className="p-6 rounded-xl border border-border bg-card group hover:border-purple-500/30 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Kairos Wallet</h3>
                  <p className="text-xs text-muted-foreground">Tu wallet digital segura</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                La forma más segura de guardar, enviar y recibir KairosCoin. Crea tu wallet en segundos,
                sin complicaciones. Compatible con BSC, Ethereum y más.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://wallet.kairos-777.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium text-sm hover:from-purple-400 hover:to-indigo-400 transition shadow-lg shadow-purple-500/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Kairos Wallet
                </a>
                <a
                  href="https://wallet.kairos-777.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition"
                >
                  Abrir Web Wallet →
                </a>
              </div>
            </div>
          </div>

          {/* Token Info Card */}
          <div className="p-6 rounded-xl border border-border bg-card mb-8">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <KairosLogoBadge size={18} />
              Información del Token
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-3 rounded-lg bg-muted/20">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium">Kairos Coin (KRC)</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/20">
                <span className="text-muted-foreground">Red</span>
                <span className="font-medium">BNB Smart Chain (BEP20)</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/20">
                <span className="text-muted-foreground">Decimales</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/20">
                <span className="text-muted-foreground">Contrato</span>
                <a
                  href={`https://bscscan.com/token/${KAIROS_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline text-xs"
                >
                  {KAIROS_TOKEN_ADDRESS.slice(0, 10)}...{KAIROS_TOKEN_ADDRESS.slice(-8)}
                </a>
              </div>
            </div>
          </div>

          {/* Compatible Wallets */}
          <div className="p-6 rounded-xl border border-border bg-muted/10">
            <h3 className="font-semibold mb-3">🔗 Wallets compatibles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Recomendamos <strong className="text-yellow-400">Kairos Wallet</strong> para la mejor experiencia. También puedes usar cualquier wallet BSC (BEP20):
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                ⭐ Kairos Wallet — Recomendada
              </span>
              {['MetaMask', 'Trust Wallet', 'Binance Wallet', 'SafePal', 'TokenPocket'].map((w) => (
                <span key={w} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB 3: TRANSACTION HISTORY
          ═══════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Historial de transacciones</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Descripción</th>
                  <th className="text-right p-3 font-medium">Cantidad</th>
                  <th className="text-right p-3 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <KairosLogo size={48} className="opacity-30" />
                        <p>No hay transacciones todavía</p>
                        <button
                          onClick={() => setActiveTab('buy')}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Comprar créditos →
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {history.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="p-3">{new Date(entry.createdAt).toLocaleDateString('es-ES')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        entry.type === 'PURCHASE' || entry.type === 'BONUS' || entry.type === 'REFUND'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {entry.type === 'PURCHASE' ? 'COMPRA' :
                         entry.type === 'BONUS' ? 'BONUS' :
                         entry.type === 'REFUND' ? 'REEMBOLSO' :
                         entry.type === 'USAGE' ? 'USO' : entry.type}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{entry.description}</td>
                    <td className={`p-3 text-right font-mono ${
                      entry.amount > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono">{entry.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
