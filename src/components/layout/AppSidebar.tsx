"use client";

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Building2, LayoutDashboard, Settings, ChevronDown, ChevronRight, HomeIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useGetTenants } from '@/hooks/useTenants';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as React from 'react';

export function AppSidebar() {
  const { data: tenants, isLoading: isLoadingTenants } = useGetTenants();
  const pathname = usePathname();
  const params = useParams();
  const currentTenantId = params.tenantId as string | undefined;
  const { state: sidebarState } = useSidebar();
  const [openTenantSubMenu, setOpenTenantSubMenu] = React.useState<{ [key: string]: boolean }>({});

  const toggleTenantSubMenu = (tenantId: string) => {
    setOpenTenantSubMenu(prev => ({ ...prev, [tenantId]: !prev[tenantId] }));
  };
  
  React.useEffect(() => {
    if (currentTenantId) {
      setOpenTenantSubMenu(prev => ({ ...prev, [currentTenantId]: true }));
    }
  }, [currentTenantId]);


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

            <SidebarMenuItem className="mt-4">
              <div className={cn(
                "px-4 py-2 text-xs font-semibold text-sidebar-foreground/70",
                sidebarState === 'collapsed' && "hidden"
              )}>
                MANDANTEN
              </div>
               {sidebarState === 'collapsed' && <div className="my-2 border-t border-sidebar-border mx-2"></div>}
            </SidebarMenuItem>

            {isLoadingTenants && (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            )}
            
            {tenants?.map((tenant) => (
              <SidebarMenuItem key={tenant.id}>
                <div className="relative">
                  <SidebarMenuButton
                    onClick={() => sidebarState === 'collapsed' ? {} : toggleTenantSubMenu(tenant.id)}
                    isActive={currentTenantId === tenant.id && (pathname.startsWith(`/tenants/${tenant.id}`))}
                    tooltip={tenant.name}
                    className="justify-between"
                  >
                    <Link href={`/tenants/${tenant.id}/dashboard`} className="flex items-center gap-2 w-full" onClick={(e) => sidebarState === 'collapsed' ? null : e.preventDefault() }>
                      <Building2 />
                      <span>{tenant.name}</span>
                    </Link>
                    {sidebarState === 'expanded' && (openTenantSubMenu[tenant.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </SidebarMenuButton>
                </div>
                {sidebarState === 'expanded' && openTenantSubMenu[tenant.id] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === `/tenants/${tenant.id}/dashboard`}
                      >
                        <Link href={`/tenants/${tenant.id}/dashboard`}>
                          <LayoutDashboard size={14} className="mr-1.5" />
                          Dashboard
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === `/tenants/${tenant.id}/settings`}
                      >
                        <Link href={`/tenants/${tenant.id}/settings`}>
                           <Settings size={14} className="mr-1.5" />
                          Einstellungen
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}
