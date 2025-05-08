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
          <CardTitle className="text-3xl font-bold">Welcome to pulseERP</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your streamlined solution for tenant management.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6">
            Efficiently manage your tenants, access dashboards, and configure settings all in one place.
          </p>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/manage-tenants">
              Manage Tenants
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
