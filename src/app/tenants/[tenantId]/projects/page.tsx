
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

export default function TenantProjectsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Briefcase className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Projektverwaltung</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Projekte</CardTitle>
          <CardDescription>Planen, verfolgen und rechnen Sie Ihre Projekte ab.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Projekte anlegen, Meilensteine definieren,
            Aufgaben erstellen und terminieren sowie den Status von Aufgaben in einem Kanban-Board verwalten.
          </p>
           <img
            src="https://picsum.photos/seed/projectsModule/1200/400"
            alt="Symbolbild Projektmanagement und Aufgabenplanung"
            data-ai-hint="project planning tasks"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
