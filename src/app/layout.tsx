import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// Removed SidebarProvider, Header, AppSidebar imports as they are now conditionally rendered by AuthGuard
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/providers';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'pulseERP',
  description: 'Mandantenverwaltungssystem von Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AppProviders>
            {/* AuthGuard will now conditionally render the main layout or just the page content */}
            <AuthGuard>
              {children}
            </AuthGuard>
            <Toaster /> {/* Global Toaster, available on all pages including auth */}
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
