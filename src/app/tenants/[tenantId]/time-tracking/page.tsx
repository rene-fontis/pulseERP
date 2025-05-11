
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function TenantTimeTrackingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Clock className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Zeiterfassung</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Zeiterfassung</CardTitle>
          <CardDescription>Erfassen Sie Arbeitszeiten und ordnen Sie diese Kunden oder Projekten zu.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Zeiten für Kunden oder Projekte erfassen.
            Hinterlegte Stundensätze werden automatisch übernommen, können aber angepasst werden.
          </p>
          <img
            src="https://picsum.photos/seed/timeTrackingModule/1200/400"
            alt="Symbolbild Zeiterfassung und Produktivität"
            data-ai-hint="time productivity"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
