import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
            <Users className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold">Willkommen bei pulseERP</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Ihre optimierte Lösung für die Mandantenverwaltung.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6">
            Verwalten Sie Ihre Mandanten effizient, greifen Sie auf Dashboards zu und konfigurieren Sie Einstellungen – alles an einem Ort.
          </p>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/manage-tenants">
              Mandanten verwalten
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
