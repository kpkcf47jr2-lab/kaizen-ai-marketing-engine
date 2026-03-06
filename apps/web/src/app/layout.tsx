import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kaizen AI Marketing — Automated Content Engine',
  description: 'Generate and publish AI-powered video content daily across all your social networks. Pay with KairosCoin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        {/* KairosPay SDK — crypto payment widget */}
        <Script
          src="https://kairos-777.com/kairos-pay.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
