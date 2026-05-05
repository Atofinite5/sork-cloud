import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SORK Cloud',
  description: 'Managed AI security pipeline for Node.js projects.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#22d3ee',
          colorBackground: '#111111',
          colorText: '#fafafa',
          colorTextSecondary: '#a3a3a3',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#fafafa',
          colorNeutral: '#fafafa',
          borderRadius: '8px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontFamilyButtons: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: '14px',
        },
        elements: {
          card: 'shadow-2xl border border-white/10',
          formButtonPrimary:
            'bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition-colors',
          footerActionLink: 'text-cyan-400 hover:text-cyan-300',
          identityPreviewEditButton: 'text-cyan-400',
          formFieldInput:
            'bg-[#1a1a1a] border-white/10 text-white placeholder:text-neutral-500 focus:border-cyan-400',
          dividerLine: 'bg-white/10',
          socialButtonsBlockButton:
            'border-white/10 text-white hover:bg-white/5 transition-colors',
          socialButtonsBlockButtonText: 'font-medium',
        },
      }}
    >
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
