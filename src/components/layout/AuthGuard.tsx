// src/components/layout/AuthGuard.tsx
"use client";

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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

  // If user is null and we are on a public path, or if user exists and we are NOT on an auth path, render children.
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  if ((!user && isPublicPath) || (user && !isPublicPath)) {
    return <>{children}</>;
  }
  
  // Otherwise, a redirect is likely pending, show loader to prevent content flash
   return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
}
