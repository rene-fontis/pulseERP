"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Tenant Data</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Tenant Not Found</h2>
        <p>The requested tenant could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-2">
            <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
            <CardTitle className="text-3xl font-bold">Dashboard: {tenant.name}</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Overview and key metrics for {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">1,234</p>
                <p className="text-sm text-muted-foreground">+5.2% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">$56,789</p>
                <p className="text-sm text-muted-foreground">+12.8% from last month</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="text-sm">User John Doe signed up.</li>
                  <li className="text-sm">Invoice #INV-001 paid.</li>
                  <li className="text-sm">New support ticket #TKT-102 opened.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
