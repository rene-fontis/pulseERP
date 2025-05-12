// src/components/layout/AuthGuard.tsx
"use client";

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/AppSidebar';

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loadingAuth) return; 

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (!user && !isPublicPath) {
      router.replace('/auth/login');
    } else if (user && isPublicPath) {
      router.replace('/'); 
    }
  }, [user, loadingAuth, pathname, router]);

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // User is not authenticated AND is on a public auth page (login/register)
  if (!user && isPublicPath) {
    // Render only the children (the auth page itself, e.g., Login form)
    return <>{children}</>;
  }

  // User is authenticated AND on a protected page (not a public auth path)
  if (user && !isPublicPath) {
    // Render the full application layout
    return (
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
      </SidebarProvider>
    );
  }
  
  // Fallback / intermediate state (e.g., user logged in but on /auth/login, redirecting)
  // Or user not logged in and on protected path, redirecting
  // Show a loader to prevent flashing content and ensure layout consistency during transition
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
