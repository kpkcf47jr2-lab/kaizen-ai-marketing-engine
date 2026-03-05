'use client';

import { useState, useEffect, useCallback } from 'react';
import { CREDIT_PACKAGES } from '@kaizen/shared';

type LedgerEntry = { id: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string };

export default function CreditsPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load balance & history
  const fetchData = useCallback(async () => {
    const res = await fetch('/api/credits');
    const d = await res.json();
    setBalance(d.data?.balance || 0);
    setHistory(d.data?.history || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Initialize KairosPay SDK once loaded
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.KairosPay) {
        window.KairosPay.init({
          merchantWallet: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS || '',
          chain: 56,
          currencies: ['KAIROS', 'USDT', 'USDC'],
          theme: 'dark',
          locale: 'es',
        });
        setSdkReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  async function handleBuy(packageId: string, priceKairos: string, credits: number) {
    if (!sdkReady) {
      setStatus({ type: 'error', message: 'Payment SDK is loading, please wait...' });
      return;
    }

    setBuying(packageId);
    setStatus(null);

    try {
      // 1. Open KairosPay checkout widget
      const payment = await window.KairosPay.checkout({
        amount: parseFloat(priceKairos),
        currency: 'KAIROS',
        memo: `Kaizen credits: ${credits} (${packageId})`,
        metadata: { packageId, credits: String(credits) },
      });

      setStatus({ type: 'info', message: 'Payment detected! Verifying on-chain...' });

      // 2. Send txHash to our backend for on-chain verification + credit
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay',
          txHash: payment.txHash,
          packageId,
          chainId: payment.chainId || 56,
          fromAddress: payment.from,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', message: `✅ ${credits.toLocaleString()} credits will be added after on-chain confirmation!` });
        // Refresh balance after a short delay (confirmation may take a moment)
        setTimeout(fetchData, 5000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Payment verification failed' });
      }
    } catch (err: any) {
      if (err?.code === 'USER_CANCELLED' || err?.message?.includes('cancel')) {
        setStatus({ type: 'info', message: 'Payment cancelled.' });
      } else {
        setStatus({ type: 'error', message: err?.message || 'Payment failed. Please try again.' });
      }
    } finally {
      setBuying(null);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Credits</h1>
      <p className="text-muted-foreground mb-8">Buy and manage your content generation credits.</p>

      {/* Status Banner */}
      {status && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
          status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {status.message}
        </div>
      )}

      {/* Balance Card */}
      <div className="p-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 to-primary/5 mb-8">
        <p className="text-sm text-muted-foreground">Available Balance</p>
        <p className="text-4xl font-bold mt-1">{loading ? '...' : balance.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground mt-1">credits</p>
      </div>

      {/* ── Getting Started (subtle, clean) ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50 mb-8">
        <span className="text-2xl">🪙</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            Need KairosCoin?{' '}
            <a
              href="https://kairos-777.com/buy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Buy KRS
            </a>
            {' · '}
            <a
              href="https://wallet.kairos-777.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Get Kairos Wallet
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The safest way to manage your crypto. Create your wallet in seconds.
          </p>
        </div>
      </div>

      {/* Packages */}
      <h2 className="text-xl font-semibold mb-4">Buy Credits with KairosCoin</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {CREDIT_PACKAGES.map((pkg) => (
          <div key={pkg.id} className={`p-5 rounded-xl border bg-card flex flex-col ${pkg.popular ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
            {pkg.popular && <span className="text-xs font-bold text-primary mb-2">⭐ MOST POPULAR</span>}
            <h3 className="font-semibold text-lg">{pkg.name}</h3>
            <p className="text-3xl font-bold mt-2">{pkg.credits.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">credits</p>
            <p className="text-sm text-muted-foreground mt-2">{pkg.priceKairosCoin} KRS</p>
            <button
              onClick={() => handleBuy(pkg.id, pkg.priceKairosCoin, pkg.credits)}
              disabled={buying === pkg.id}
              className="mt-auto pt-4"
            >
              <span className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition ${
                buying === pkg.id
                  ? 'bg-muted text-muted-foreground cursor-wait'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}>
                {buying === pkg.id ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>🪙 Pay with KairosCoin</>
                )}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* History */}
      <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-right p-3 font-medium">Amount</th>
              <th className="text-right p-3 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions yet</td></tr>
            )}
            {history.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="p-3">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    entry.type === 'PURCHASE' || entry.type === 'BONUS' || entry.type === 'REFUND'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {entry.type}
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
  );
}
