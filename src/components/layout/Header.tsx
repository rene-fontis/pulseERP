// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { Briefcase, Settings, ChevronDown, Building2, FileText, Users } from 'lucide-react'; // Added Users icon
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
    if (isClient && currentTenantId && tenants) {
      const tenant = tenants.find(t => t.id === currentTenantId);
      setActiveTenantName(tenant ? tenant.name : null);
    } else if (isClient) {
      setActiveTenantName(null);
    }
  }, [currentTenantId, tenants, pathname, isClient]);

  const getTenantDropdownTriggerLabelContents = () => {
    if (isLoadingTenants && isClient) {
      return <Skeleton className="h-4 w-[150px]" />;
    }
    if (activeTenantName && currentTenantId && pathname.startsWith(`/tenants/${currentTenantId}`)) {
      return activeTenantName;
    }
    return "Mandant wählen...";
  };

  const tenantDropdownTriggerIcon = <Building2 className="h-4 w-4 text-primary" />;

  const headerBaseClasses = "sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card text-card-foreground shadow-md";
  const divBaseClasses = "flex items-center gap-2";
  
  // Always apply w-full to headerBaseClasses
  const headerDynamicClasses = "w-full"; 
  const leftDivPaddingClasses = "pl-4 sm:pl-6";
  const rightDivPaddingClasses = "pr-4 sm:pr-6"; 
  
  const headerClasses = cn(headerBaseClasses, headerDynamicClasses);
  const leftDivClasses = cn(divBaseClasses, leftDivPaddingClasses);
  const rightNavClasses = cn(divBaseClasses, rightDivPaddingClasses);


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
        {isClient ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 min-w-[180px] justify-start px-3">
                  {tenantDropdownTriggerIcon}
                  <span className="truncate">{getTenantDropdownTriggerLabelContents()}</span>
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
                    <DropdownMenuItem key={tenant.id} asChild data-active={tenant.id === currentTenantId && pathname.startsWith(`/tenants/${tenant.id}`)}>
                      <Link href={`/tenants/${tenant.id}/dashboard`}>{tenant.name}</Link>
                    </DropdownMenuItem>
                  ))
                )}
                {(!isLoadingTenants && tenants && tenants.length === 0) && (
                     <DropdownMenuItem disabled>Keine Mandanten verfügbar</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 px-3 ml-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Einstellungen</span>
                  <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Verwaltung</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-active={pathname === '/manage-tenants'}>
                  <Link href="/manage-tenants" className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4" />
                    Mandantenübersicht
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-active={pathname === '/manage-templates'}>
                  <Link href="/manage-templates" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Vorlagen verwalten
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-active={pathname === '/settings/users'}>
                  <Link href="/settings/users" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Benutzerverwaltung
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Skeleton className="h-9 w-[180px] rounded-md" /> 
            <Skeleton className="h-9 w-[150px] ml-2 rounded-md" />
          </>
        )}
      </nav>
    </header>
  );
}
