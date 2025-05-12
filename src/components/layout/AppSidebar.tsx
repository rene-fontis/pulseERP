"use client";

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Building2, LayoutDashboard, Settings, HomeIcon, BookOpen, Users, FileText as FileTextIcon, CalendarDays, BarChartBig, Briefcase, Clock, Package, Receipt, ClipboardList } from 'lucide-react'; 
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
  const isBudgetingActive = pathname.startsWith(`/tenants/${currentTenantId}/budgeting`);
  const isContactsActive = pathname.startsWith(`/tenants/${currentTenantId}/contacts`);
  const isProjectsActive = pathname.startsWith(`/tenants/${currentTenantId}/projects`) || pathname.startsWith(`/tenants/${currentTenantId}/tasks`);
  const isTimeTrackingActive = pathname.startsWith(`/tenants/${currentTenantId}/time-tracking`);
  const isInventoryActive = pathname.startsWith(`/tenants/${currentTenantId}/inventory`);
  const isInvoicingActive = pathname.startsWith(`/tenants/${currentTenantId}/invoicing`);
  
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
  
  const adminImportButton = (
     <SidebarMenuItem>
        <SidebarMenuButton
            asChild
            isActive={pathname === '/admin/import'}
            tooltip="Vorlagen Importieren"
            disabled={true} // Disabled as per previous request
        >
            <Link href="/admin/import">
                <Users /> 
                <span>Vorlagen Importieren</span>
            </Link>
        </SidebarMenuButton>
    </SidebarMenuItem>
  );


  const renderTenantSpecificLinks = () => {
    if (!currentTenantId) return null;

    if (isLoadingActiveTenant && clientLoaded) { 
      return (
        <>
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
           <SidebarMenuSkeleton showIcon />
           <SidebarMenuSkeleton showIcon />
           <SidebarMenuSkeleton showIcon />
           <SidebarMenuSkeleton showIcon />
           <SidebarMenuSkeleton showIcon />
        </>
      );
    }

    if (!activeTenant && !isLoadingActiveTenant && clientLoaded) { 
      return (
          <SidebarMenuItem>
            <div className={cn(
              "px-4 py-2 text-xs text-sidebar-foreground/70",
              (sidebarState === 'collapsed' && !isMobile) && "hidden"
            )}>
              Mandant nicht gefunden.
            </div>
          </SidebarMenuItem>
      );
    }
    
    if (!clientLoaded && isLoadingActiveTenant) {
        return null;
    }
    
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
                        <AccordionTrigger className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isAccountingActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg:not(.no-override)]:text-sidebar-primary-foreground"
                        )}>
                           <div className="flex items-center w-full">
                                <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Buchhaltung</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/accounting` || pathname === `/tenants/${currentTenantId}/accounting/overview` }>
                                      <Link href={`/tenants/${currentTenantId}/accounting`}>Übersicht</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/accounting/journal`}>
                                    <Link href={`/tenants/${currentTenantId}/accounting/journal`}>Journal</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(`/tenants/${currentTenantId}/accounting/accounts`)}>
                                      <Link href={`/tenants/${currentTenantId}/accounting/accounts`}>Konten</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/accounting/reports`}>
                                        <Link href={`/tenants/${currentTenantId}/accounting/reports`}>Berichte</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <Accordion type="single" collapsible className="w-full" defaultValue={isBudgetingActive ? "budgeting-item" : undefined}>
                    <AccordionItem value="budgeting-item" className="border-none">
                        <AccordionTrigger className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isBudgetingActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg:not(.no-override)]:text-sidebar-primary-foreground"
                        )}>
                           <div className="flex items-center w-full">
                                <BarChartBig className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Budgeting</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                           <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/budgeting` || (pathname.startsWith(`/tenants/${currentTenantId}/budgeting/`) && !pathname.includes('/entries') && !pathname.endsWith('/reports')) }>
                                      <Link href={`/tenants/${currentTenantId}/budgeting`}>Budgetübersicht</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                {/* Sub-item for entries is handled by clicking on a budget from the overview */}
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/budgeting/reports`}>
                                      <Link href={`/tenants/${currentTenantId}/budgeting/reports`}>Berichte</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isContactsActive}
                    tooltip="Kontakte"
                >
                    <Link href={`/tenants/${currentTenantId}/contacts`}>
                    <Users />
                    <span>Kontakte</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <Accordion type="single" collapsible className="w-full" defaultValue={isProjectsActive ? "projects-item" : undefined}>
                    <AccordionItem value="projects-item" className="border-none">
                        <AccordionTrigger className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isProjectsActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg:not(.no-override)]:text-sidebar-primary-foreground"
                        )}>
                           <div className="flex items-center w-full">
                                <Briefcase className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Projekte</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                           <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/projects` || pathname.startsWith(`/tenants/${currentTenantId}/projects/`) }>
                                      <Link href={`/tenants/${currentTenantId}/projects`}>Projektübersicht</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/tasks`}>
                                      <Link href={`/tenants/${currentTenantId}/tasks`}><ClipboardList className="mr-1 h-3.5 w-3.5"/> Aufgabenübersicht</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isTimeTrackingActive}
                    tooltip="Zeiterfassung"
                >
                    <Link href={`/tenants/${currentTenantId}/time-tracking`}>
                    <Clock />
                    <span>Zeiterfassung</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isInventoryActive}
                    tooltip="Warenwirtschaft"
                >
                    <Link href={`/tenants/${currentTenantId}/inventory`}>
                    <Package />
                    <span>Warenwirtschaft</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isInvoicingActive}
                    tooltip="Kundenrechnungen"
                >
                    <Link href={`/tenants/${currentTenantId}/invoicing`}>
                    <Receipt />
                    <span>Kundenrechnungen</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>


            <SidebarMenuItem>
                 <Accordion type="single" collapsible className="w-full" defaultValue={isSettingsActive ? "settings-item" : undefined}>
                    <AccordionItem value="settings-item" className="border-none">
                        <AccordionTrigger className={cn(
                            "w-full justify-between p-2 h-auto font-normal text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isSettingsActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 [&>svg:not(.no-override)]:text-sidebar-primary-foreground"
                        )}>
                            <div className="flex items-center w-full">
                                <Settings className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 text-left">Einstellungen</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-2 pr-0 pt-1">
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/settings` || pathname === `/tenants/${currentTenantId}/settings/overview`}>
                                    <Link href={`/tenants/${currentTenantId}/settings`}>Übersicht</Link>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
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
                                <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === `/tenants/${currentTenantId}/settings/fiscal-years`}>
                                    <Link href={`/tenants/${currentTenantId}/settings/fiscal-years`}>Geschäftsjahre</Link>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenuItem>
        </>
    );

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
                    isActive={isBudgetingActive}
                    tooltip="Budgeting"
                >
                    <Link href={`/tenants/${currentTenantId}/budgeting`}>
                        <BarChartBig />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isContactsActive}
                    tooltip="Kontakte"
                >
                    <Link href={`/tenants/${currentTenantId}/contacts`}>
                    <Users />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isProjectsActive}
                    tooltip="Projekte"
                >
                    <Link href={`/tenants/${currentTenantId}/projects`}>
                    <Briefcase />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isTimeTrackingActive}
                    tooltip="Zeiterfassung"
                >
                    <Link href={`/tenants/${currentTenantId}/time-tracking`}>
                    <Clock />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isInventoryActive}
                    tooltip="Warenwirtschaft"
                >
                    <Link href={`/tenants/${currentTenantId}/inventory`}>
                    <Package />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isInvoicingActive}
                    tooltip="Kundenrechnungen"
                >
                    <Link href={`/tenants/${currentTenantId}/invoicing`}>
                    <Receipt />
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

  const [clientLoaded, setClientLoaded] = React.useState(false);
  React.useEffect(() => {
    setClientLoaded(true);
  }, []);

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-2 justify-center">
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
                <SidebarMenuItem className="mt-4">
                  {sidebarState === 'expanded' || isMobile ? ( 
                    <div className={cn(
                      "px-4 py-2 text-sm font-semibold text-sidebar-foreground truncate",
                    )}>
                      {clientLoaded && isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                    </div>
                  ) : sidebarState === 'collapsed' && !isMobile ? ( 
                    <SidebarMenuButton 
                      tooltip={clientLoaded && isLoadingActiveTenant ? "Lade Mandant..." : (activeTenant?.name || "Aktiver Mandant")}
                      asChild={false} 
                      className="flex items-center justify-center w-full pointer-events-none"
                      isActive={pathname.startsWith(`/tenants/${currentTenantId}`)}
                    >
                        <Building2 />
                    </SidebarMenuButton>
                  ) : null }
                </SidebarMenuItem>

                {renderTenantSpecificLinks()}
                
                {((sidebarState === 'expanded' || isMobile) || (sidebarState === 'collapsed' && !isMobile && (activeTenant || (clientLoaded && isLoadingActiveTenant)) )) && 
                    <div className="my-2 border-t border-sidebar-border mx-2"></div>
                }
                <SidebarMenuItem className="mt-2 text-xs font-semibold text-sidebar-foreground/70 px-4 py-1 group-data-[collapsible=icon]:hidden">
                    Verwaltung
                </SidebarMenuItem>
                {commonMandantenVerwaltenButton}
                {commonVorlagenVerwaltenButton}
                {adminImportButton}
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
                {adminImportButton}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}
