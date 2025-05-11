
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Tag, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetSegmentById } from "@/hooks/useSegments";
import { useGetContacts } from "@/hooks/useContacts";
import type { Contact, Segment } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const segmentId = params.segmentId as string;

  const [clientLoaded, setClientLoaded] = useState(false);
  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: segment, isLoading: isLoadingSegment, error: segmentError } = useGetSegmentById(segmentId);
  const { data: allContacts, isLoading: isLoadingContacts, error: contactsError } = useGetContacts(tenantId);

  const filteredContacts = useMemo(() => {
    if (!allContacts || !segmentId) return [];
    return allContacts.filter(contact => contact.segmentIds?.includes(segmentId));
  }, [allContacts, segmentId]);

  const isLoading = (isLoadingSegment || isLoadingContacts) && !clientLoaded;
  const combinedError = segmentError || contactsError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Segmentdaten</h2>
        <p>{(combinedError as Error).message}</p>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
      </div>
    );
  }

  if (!segment && !isLoadingSegment && clientLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Segment nicht gefunden</h2>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
        <div className="flex items-center mb-2">
          <Tag className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Segment: {segment?.name}</h1>
        </div>
        {segment?.description && <p className="text-muted-foreground">{segment.description}</p>}
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Zugeordnete Kontakte ({filteredContacts.length})</CardTitle>
          <CardDescription>Kontakte, die diesem Segment zugewiesen sind.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingContacts && clientLoaded ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Typ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                           {/* Link to the contact details page if it exists, or just display name */}
                           {contact.firstName ? `${contact.firstName} ${contact.name}` : contact.name}
                        </TableCell>
                        <TableCell>{contact.companyName || "-"}</TableCell>
                        <TableCell>{contact.email || "-"}</TableCell>
                        <TableCell>{contact.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.isClient && <Badge variant="outline">Kunde</Badge>}
                            {contact.isSupplier && <Badge variant="secondary">Lieferant</Badge>}
                            {contact.isPartner && <Badge variant="default" className="bg-purple-500 text-white">Partner</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Keine Kontakte in diesem Segment gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
