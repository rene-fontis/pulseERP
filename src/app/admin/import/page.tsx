"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2 } from 'lucide-react';
import { seedDefaultChartOfAccountsTemplates } from '@/lib/seedTemplates';
import { useToast } from '@/hooks/use-toast';

export default function ImportTemplatesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSeedTemplates = async () => {
    setIsLoading(true);
    try {
      await seedDefaultChartOfAccountsTemplates();
      toast({
        title: "Erfolg",
        description: "Standard Kontenplan-Vorlagen wurden erfolgreich importiert.",
      });
    } catch (error) {
      console.error("Fehler beim Importieren der Vorlagen:", error);
      toast({
        title: "Fehler",
        description: "Beim Importieren der Vorlagen ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
            <UploadCloud className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold">Kontenplan-Vorlagen importieren</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Importieren Sie die Standard-Kontenplanvorlagen (KMU, Verein, Privat) in das System.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6">
            Durch Klicken auf die Schaltfläche unten werden die vordefinierten Vorlagen in die Datenbank geladen.
            Dies ist in der Regel nur einmal erforderlich. Bestehende Vorlagen mit demselben Namen werden nicht überschrieben.
          </p>
          <Button
            onClick={handleSeedTemplates}
            disabled={isLoading}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importiere...
              </>
            ) : (
              "Vorlagen jetzt importieren"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
