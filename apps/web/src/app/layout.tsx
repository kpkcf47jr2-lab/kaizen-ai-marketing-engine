import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Providers from './providers';
import AIAssistant from '@/components/ai-assistant';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KAME — AI Marketing Engine | Generate & Publish Content Automatically',
  description: 'The #1 AI-powered marketing platform. Generate professional videos, scripts, and social media content daily — automatically published across all your networks. Pay with KairosCoin.',
  keywords: ['AI marketing', 'content generation', 'social media automation', 'video marketing', 'KAME', 'KairosCoin'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
          <AIAssistant />
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
