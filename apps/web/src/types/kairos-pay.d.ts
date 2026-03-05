/**
 * Type declarations for the KairosPay SDK (https://kairos-777.com/kairos-pay.js)
 */

interface KairosPayPayment {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  chainId: number;
}

interface KairosPayInitOptions {
  merchantWallet: string;
  chain: number;
  currencies?: string[];
  theme?: 'dark' | 'light';
  locale?: string;
  onSuccess?: (payment: KairosPayPayment) => void;
  onError?: (error: { code: string; message: string }) => void;
  onCancel?: () => void;
}

interface KairosPayCheckoutOptions {
  amount: number;
  currency?: string;
  memo?: string;
  metadata?: Record<string, string>;
  onSuccess?: (payment: KairosPayPayment) => void;
  onError?: (error: { code: string; message: string }) => void;
  onCancel?: () => void;
}

interface KairosPaySDK {
  init: (options: KairosPayInitOptions) => void;
  checkout: (options: KairosPayCheckoutOptions) => Promise<KairosPayPayment>;
  isReady: () => boolean;
}

declare global {
  interface Window {
    KairosPay: KairosPaySDK;
  }
  const KairosPay: KairosPaySDK;
}

export {};
