import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/providers';

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
  description: 'Tenant Management System by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>
          <SidebarProvider defaultOpen={true}>
            <div className="flex flex-col min-h-screen">
              <Header />
              <div className="flex flex-1">
                <AppSidebar />
                <main className="flex-1 p-4 lg:p-6 bg-background overflow-auto">
                  {children}
                </main>
              </div>
            </div>
            <Toaster />
          </SidebarProvider>
        </AppProviders>
      </body>
    </html>
  );
}
