"use client";

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Building2, LayoutDashboard, Settings, HomeIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useGetTenantById } from '@/hooks/useTenants';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as React from 'react';

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const currentTenantId = params.tenantId as string | undefined;
  const { data: activeTenant, isLoading: isLoadingActiveTenant } = useGetTenantById(currentTenantId);
  const { state: sidebarState, isMobile } = useSidebar();

  const commonMandantenVerwaltenButton = (
     <SidebarMenuItem>
        <SidebarMenuButton
            asChild
            isActive={pathname === '/manage-tenants'}
            tooltip="Mandanten verwalten"
        >
            <Link href="/manage-tenants">
                <Building2 /> 
                <span>Mandanten verwalten</span>
            </Link>
        </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-2 justify-center">
         {/* Sidebar trigger is in main Header for mobile */}
      </SidebarHeader>
      <ScrollArea className="flex-1">
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip="Startseite"
              >
                <Link href="/">
                  <HomeIcon />
                  <span>Startseite</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {currentTenantId ? (
              <>
                {/* Active Tenant Section */}
                <SidebarMenuItem className="mt-4">
                  {sidebarState === 'expanded' || isMobile ? ( // Show text if expanded or on mobile (where it's always expanded)
                    <div className={cn(
                      "px-4 py-2 text-sm font-semibold text-sidebar-foreground truncate",
                    )}>
                      {isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                    </div>
                  ) : sidebarState === 'collapsed' && !isMobile ? ( // Show icon button if collapsed and not mobile
                    <SidebarMenuButton 
                      tooltip={isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                      asChild={false} 
                      className="flex items-center justify-center w-full pointer-events-none"
                      isActive={pathname.startsWith(`/tenants/${currentTenantId}`)} // Highlight if on any page of this tenant
                    >
                        <Building2 />
                    </SidebarMenuButton>
                  ) : null }
                </SidebarMenuItem>

                {isLoadingActiveTenant ? (
                  <>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                  </>
                ) : activeTenant ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/tenants/${currentTenantId}/dashboard`}
                        tooltip="Dashboard"
                      >
                        <Link href={`/tenants/${currentTenantId}/dashboard`}>
                          <LayoutDashboard />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/tenants/${currentTenantId}/settings`}
                        tooltip="Einstellungen"
                      >
                        <Link href={`/tenants/${currentTenantId}/settings`}>
                          <Settings />
                          <span>Einstellungen</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : (
                  // Case where tenantId is in URL but tenant not found/error
                  !isLoadingActiveTenant && ( // Only show if not loading and tenant is null/undefined
                     <SidebarMenuItem>
                       <div className={cn(
                          "px-4 py-2 text-xs text-sidebar-foreground/70",
                           (sidebarState === 'collapsed' && !isMobile) && "hidden" // Hide if collapsed on desktop
                        )}>
                         Mandant nicht gefunden.
                       </div>
                     </SidebarMenuItem>
                  )
                )}
                
                {/* Separator after active tenant specific links, visible in expanded mode or if active tenant exists for collapsed mode */}
                {((sidebarState === 'expanded' || isMobile) || (sidebarState === 'collapsed' && !isMobile && (activeTenant || isLoadingActiveTenant))) && 
                    <div className="my-2 border-t border-sidebar-border mx-2"></div>
                }
                {commonMandantenVerwaltenButton}
              </>
            ) : (
              <>
                {/* "Mandanten" Heading when no tenant is active */}
                <SidebarMenuItem className="mt-4">
                  <div className={cn(
                    "px-4 py-2 text-xs font-semibold text-sidebar-foreground/70",
                    (sidebarState === 'collapsed' && !isMobile) && "hidden" // Hide if collapsed on desktop
                  )}>
                    MANDANTEN
                  </div>
                   {/* Separator for collapsed mode */}
                  {(sidebarState === 'collapsed' && !isMobile) && <div className="my-2 border-t border-sidebar-border mx-2"></div>}
                </SidebarMenuItem>
                {commonMandantenVerwaltenButton}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}