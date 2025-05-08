"use client";

import Link from 'next/link';
import { Briefcase, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function Header() {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card px-4 text-card-foreground shadow-md sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger />}
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-7 w-7" />
          <h1 className="text-xl font-semibold">pulseERP</h1>
        </Link>
      </div>
      <nav className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/manage-tenants">
            <Settings className="mr-2 h-4 w-4" />
            Mandanten verwalten
          </Link>
        </Button>
        {/* Future user menu can go here */}
      </nav>
    </header>
  );
}
