"use client";

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Building2, LayoutDashboard, Settings, HomeIcon, BookOpen, Users, FileText as FileTextIcon, ChevronDown, UploadCloud } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useGetTenantById } from '@/hooks/useTenants';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const currentTenantId = params.tenantId as string | undefined;
  const { data: activeTenant, isLoading: isLoadingActiveTenant } = useGetTenantById(currentTenantId);
  const { state: sidebarState, isMobile } = useSidebar();

  const isSettingsActive = pathname.startsWith(`/tenants/${currentTenantId}/settings`);
  const isAccountingActive = pathname.startsWith(`/tenants/${currentTenantId}/accounting`);
  
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

  const commonVorlagenVerwaltenButton = (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === '/manage-templates'}
        tooltip="Vorlagen verwalten"
      >
        <Link href="/manage-templates">
          <FileTextIcon />
          <span>Vorlagen verwalten</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const commonVorlagenImportierenButton = (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === '/admin/import'}
        tooltip="Vorlagen importieren"
      >
        <Link href="/admin/import">
          <UploadCloud />
          <span>Vorlagen importieren</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );


  const renderTenantSpecificLinks = () => {
    if (!currentTenantId) return null;

    if (isLoadingActiveTenant) {
      return (
        <>
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
        </>
      );
    }

    if (!activeTenant) {
      return (
        !isLoadingActiveTenant && (
          <SidebarMenuItem>
            <div className={cn(
              "px-4 py-2 text-xs text-sidebar-foreground/70",
              (sidebarState === 'collapsed' && !isMobile) && "hidden"
            )}>
              Mandant nicht gefunden.
            </div>
          </SidebarMenuItem>
        )
      );
    }
    
    // For expanded sidebar or mobile view
    const expandedOrMobileContent = (
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
                <Accordion type="single" collapsible className="w-full" defaultValue={isAccountingActive ? "accounting-item" : undefined}>
                    <AccordionItem value="accounting-item" className="border-none">
                        <AccordionTrigger asChild className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isAccountingActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg]:text-sidebar-primary-foreground"
                        )}>
                           <div className="flex items-center w-full">
                                <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Buchhaltung</span>
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-sidebar-foreground group-data-[state=open]:rotate-180 group-data-[state=open]:text-sidebar-accent-foreground group-data-[active=true]:text-sidebar-primary-foreground" />
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/accounting/journal`}>
                                    <Link href={`/tenants/${currentTenantId}/accounting/journal`}>Journal</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                 {/* Placeholder for future reports link */}
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/accounting/reports`} disabled>
                                        <span className="cursor-not-allowed">Berichte (Demn.)</span>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>

            <SidebarMenuItem>
                 <Accordion type="single" collapsible className="w-full" defaultValue={isSettingsActive ? "settings-item" : undefined}>
                    <AccordionItem value="settings-item" className="border-none">
                        <AccordionTrigger asChild className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isSettingsActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg]:text-sidebar-primary-foreground"
                        )}>
                            <div className="flex items-center w-full">
                                <Settings className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Einstellungen</span>
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-sidebar-foreground group-data-[state=open]:rotate-180 group-data-[state=open]:text-sidebar-accent-foreground group-data-[active=true]:text-sidebar-primary-foreground" />
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/settings/basic`}>
                                    <Link href={`/tenants/${currentTenantId}/settings/basic`}>Basis</Link>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/settings/users`}>
                                    <Link href={`/tenants/${currentTenantId}/settings/users`}>Benutzer</Link>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/settings/chart-of-accounts`}>
                                    <Link href={`/tenants/${currentTenantId}/settings/chart-of-accounts`}>Kontenplan</Link>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>
        </>
    );

    // For collapsed sidebar view
    const collapsedContent = (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === `/tenants/${currentTenantId}/dashboard`}
                    tooltip="Dashboard"
                >
                    <Link href={`/tenants/${currentTenantId}/dashboard`}>
                    <LayoutDashboard />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isAccountingActive}
                    tooltip="Buchhaltung"
                >
                    <Link href={`/tenants/${currentTenantId}/accounting`}>
                        <BookOpen />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isSettingsActive} 
                    tooltip="Einstellungen"
                >
                    <Link href={`/tenants/${currentTenantId}/settings`}>
                        <Settings />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </>
    );
    
    return (sidebarState === 'expanded' || isMobile) ? expandedOrMobileContent : collapsedContent;
  };

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
                  {sidebarState === 'expanded' || isMobile ? ( 
                    <div className={cn(
                      "px-4 py-2 text-sm font-semibold text-sidebar-foreground truncate",
                    )}>
                      {isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                    </div>
                  ) : sidebarState === 'collapsed' && !isMobile ? ( 
                    <SidebarMenuButton 
                      tooltip={isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                      asChild={false} 
                      className="flex items-center justify-center w-full pointer-events-none"
                      isActive={pathname.startsWith(`/tenants/${currentTenantId}`)}
                    >
                        <Building2 />
                    </SidebarMenuButton>
                  ) : null }
                </SidebarMenuItem>

                {renderTenantSpecificLinks()}
                
                {((sidebarState === 'expanded' || isMobile) || (sidebarState === 'collapsed' && !isMobile && (activeTenant || isLoadingActiveTenant))) && 
                    <div className="my-2 border-t border-sidebar-border mx-2"></div>
                }
                <SidebarMenuItem className="mt-2 text-xs font-semibold text-sidebar-foreground/70 px-4 py-1 group-data-[collapsible=icon]:hidden">
                    Verwaltung
                </SidebarMenuItem>
                {commonMandantenVerwaltenButton}
                {commonVorlagenVerwaltenButton}
                {commonVorlagenImportierenButton}
              </>
            ) : (
              <>
                <SidebarMenuItem className="mt-4">
                  <div className={cn(
                    "px-4 py-2 text-xs font-semibold text-sidebar-foreground/70",
                    (sidebarState === 'collapsed' && !isMobile) && "hidden" 
                  )}>
                    VERWALTUNG
                  </div>
                  {(sidebarState === 'collapsed' && !isMobile) && <div className="my-2 border-t border-sidebar-border mx-2"></div>}
                </SidebarMenuItem>
                {commonMandantenVerwaltenButton}
                {commonVorlagenVerwaltenButton}
                {commonVorlagenImportierenButton}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}
