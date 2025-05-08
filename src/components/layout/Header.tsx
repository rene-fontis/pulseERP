"use client";

import Link from 'next/link';
import { Briefcase, Settings, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetTenants } from '@/hooks/useTenants';
import { useParams, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const { isMobile } = useSidebar();
  const { data: tenants, isLoading: isLoadingTenants } = useGetTenants();
  const params = useParams();
  const pathname = usePathname();
  const currentTenantId = params.tenantId as string | undefined;

  const [activeTenantName, setActiveTenantName] = React.useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (currentTenantId && tenants) {
      const tenant = tenants.find(t => t.id === currentTenantId);
      setActiveTenantName(tenant ? tenant.name : null);
    } else {
      setActiveTenantName(null);
    }
  }, [currentTenantId, tenants]);

  const getTriggerLabel = () => {
    if (isLoadingTenants && !activeTenantName) {
      return <Skeleton className="h-4 w-[150px]" />;
    }
    if (activeTenantName && currentTenantId && pathname.startsWith(`/tenants/${currentTenantId}`)) {
      return activeTenantName;
    }
    return "Mandant wählen...";
  };

  const isTenantSelectedAndOnTenantPage = !!(activeTenantName && currentTenantId && pathname.startsWith(`/tenants/${currentTenantId}`));

  // Base classes that are always present
  const headerBaseClasses = "sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card text-card-foreground shadow-md";
  const divBaseClasses = "flex items-center gap-2";

  // Header itself has no dynamic padding, ensuring it's 100% wide.
  // Padding for inner content is applied consistently on server and client.
  const headerDynamicClasses = "";
  const leftDivPaddingClasses = "pl-4 sm:pl-6";
  const rightDivPaddingClasses = "pr-4 sm:pr-6";

  // Construct class names directly using template literals to ensure explicitness
  const headerClasses = `${headerBaseClasses} ${headerDynamicClasses}`.trim();
  const leftDivClasses = `${divBaseClasses} ${leftDivPaddingClasses}`.trim();
  const rightNavClasses = `${divBaseClasses} ${rightDivPaddingClasses}`.trim();


  return (
    <header className={headerClasses}>
      <div className={leftDivClasses}>
        {isClient && isMobile && <SidebarTrigger />}
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold">pulseERP</h1>
        </Link>
      </div>
      <nav className={rightNavClasses}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 min-w-[180px] justify-start">
              {isTenantSelectedAndOnTenantPage ? <Building2 className="h-4 w-4 text-primary" /> : <Settings className="h-4 w-4" /> }
              <span className="truncate">{getTriggerLabel()}</span>
              <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Mandant auswählen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingTenants ? (
              <DropdownMenuItem disabled>
                <Skeleton className="h-4 w-full" />
              </DropdownMenuItem>
            ) : (
              tenants?.map(tenant => (
                <DropdownMenuItem key={tenant.id} asChild data-active={tenant.id === currentTenantId && pathname.startsWith(`/tenants/${currentTenantId}`)}>
                  <Link href={`/tenants/${tenant.id}/dashboard`}>{tenant.name}</Link>
                </DropdownMenuItem>
              ))
            )}
            {(!isLoadingTenants && tenants && tenants.length === 0) && (
                 <DropdownMenuItem disabled>Keine Mandanten verfügbar</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/manage-tenants" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Alle Mandanten verwalten
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Future user menu can go here */}
      </nav>
    </header>
  );
}