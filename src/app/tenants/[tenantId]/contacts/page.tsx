
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; // Import Link
import { Users, PlusCircle, Edit, Trash2, Tag, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ContactForm, type ContactFormValues } from "@/components/contacts/ContactForm";
import { SegmentForm, type SegmentFormValues } from "@/components/contacts/SegmentForm";
import { useGetContacts, useAddContact, useUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import { useGetSegments, useAddSegment, useUpdateSegment, useDeleteSegment } from "@/hooks/useSegments";
import type { Contact, Segment, NewContactPayload, NewSegmentPayload } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function TenantContactsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: contacts, isLoading: isLoadingContacts, error: contactsError } = useGetContacts(tenantId);
  const { data: segments, isLoading: isLoadingSegments, error: segmentsError } = useGetSegments(tenantId);

  const addContactMutation = useAddContact();
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();

  const addSegmentMutation = useAddSegment(tenantId);
  const updateSegmentMutation = useUpdateSegment(tenantId);
  const deleteSegmentMutation = useDeleteSegment(tenantId);

  const handleAddContact = async (values: ContactFormValues) => {
    const payload: NewContactPayload = { ...values, tenantId };
    try {
      await addContactMutation.mutateAsync(payload);
      toast({ title: "Erfolg", description: "Kontakt erfolgreich erstellt." });
      setIsContactModalOpen(false);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Kontakt konnte nicht erstellt werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactModalOpen(true);
  };

  const handleUpdateContact = async (values: ContactFormValues) => {
    if (!selectedContact) return;
    const payload: Partial<NewContactPayload> = { ...values };
    try {
      await updateContactMutation.mutateAsync({ contactId: selectedContact.id, data: payload });
      toast({ title: "Erfolg", description: "Kontakt erfolgreich aktualisiert." });
      setIsContactModalOpen(false);
      setSelectedContact(null);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Kontakt konnte nicht aktualisiert werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContactMutation.mutateAsync(contactId);
      toast({ title: "Erfolg", description: "Kontakt erfolgreich gelöscht." });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Kontakt konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleAddSegment = async (values: SegmentFormValues) => {
    const payload: NewSegmentPayload = { ...values };
    try {
      await addSegmentMutation.mutateAsync(payload);
      toast({ title: "Erfolg", description: "Segment erfolgreich erstellt." });
      setIsSegmentModalOpen(false);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Segment konnte nicht erstellt werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleEditSegment = (segment: Segment) => {
    setSelectedSegment(segment);
    setIsSegmentModalOpen(true);
  };

  const handleUpdateSegment = async (values: SegmentFormValues) => {
    if (!selectedSegment) return;
     const payload: Partial<NewSegmentPayload> = { ...values };
    try {
      await updateSegmentMutation.mutateAsync({ segmentId: selectedSegment.id, data: payload });
      toast({ title: "Erfolg", description: "Segment erfolgreich aktualisiert." });
      setIsSegmentModalOpen(false);
      setSelectedSegment(null);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Segment konnte nicht aktualisiert werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
     try {
      await deleteSegmentMutation.mutateAsync(segmentId);
      toast({ title: "Erfolg", description: "Segment erfolgreich gelöscht." });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Segment konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };

  const getSegmentNames = (segmentIds?: string[]): string => {
    if (!segmentIds || !segments || segmentIds.length === 0) return "-";
    return segmentIds
      .map(id => segments.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const isLoading = (isLoadingContacts || isLoadingSegments) && !clientLoaded;

  if (contactsError || segmentsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Kontaktdaten</h2>
        <p>{(contactsError || segmentsError)?.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Kontaktverwaltung</h1>
        </div>
        <Dialog
          open={isContactModalOpen}
          onOpenChange={(isOpen) => {
            setIsContactModalOpen(isOpen);
            if (!isOpen) setSelectedContact(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Kontakt erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedContact ? "Kontakt bearbeiten" : "Neuen Kontakt erstellen"}</DialogTitle>
              <DialogDescriptionComponent>
                {selectedContact ? "Aktualisieren Sie die Details des Kontakts." : "Geben Sie die Details für den neuen Kontakt ein."}
              </DialogDescriptionComponent>
            </DialogHeader>
            <ContactForm
              tenantId={tenantId}
              onSubmit={selectedContact ? handleUpdateContact : handleAddContact}
              initialData={selectedContact}
              isSubmitting={addContactMutation.isPending || updateContactMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Kontakte</CardTitle>
          <CardDescription>Liste aller erfassten Kontakte.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <TableHead>Segmente</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts && contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.firstName ? `${contact.firstName} ${contact.name}` : contact.name}</TableCell>
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
                        <TableCell>{getSegmentNames(contact.segmentIds)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditContact(contact)} title="Kontakt bearbeiten">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Kontakt löschen" disabled={deleteContactMutation.isPending && deleteContactMutation.variables === contact.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. Der Kontakt "{contact.name}" wird dauerhaft gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteContact(contact.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteContactMutation.isPending && deleteContactMutation.variables === contact.id}>
                                  {(deleteContactMutation.isPending && deleteContactMutation.variables === contact.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Keine Kontakte gefunden. Erstellen Sie einen, um loszulegen!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Segmente</CardTitle>
            <CardDescription>Verwalten Sie Ihre Kontaktsegmente.</CardDescription>
          </div>
          <Dialog
            open={isSegmentModalOpen}
            onOpenChange={(isOpen) => {
                setIsSegmentModalOpen(isOpen);
                if (!isOpen) setSelectedSegment(null);
            }}
            >
            <DialogTrigger asChild>
                <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Segment erstellen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>{selectedSegment ? "Segment bearbeiten" : "Neues Segment erstellen"}</DialogTitle>
                </DialogHeader>
                <SegmentForm
                onSubmit={selectedSegment ? handleUpdateSegment : handleAddSegment}
                initialData={selectedSegment}
                isSubmitting={addSegmentMutation.isPending || updateSegmentMutation.isPending}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingSegments ? (
             <div className="space-y-2">
                {[...Array(2)].map((_, i) => <Skeleton key={`seg-skel-${i}`} className="h-10 w-full rounded-md" />)}
            </div>
          ) : segments && segments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {segments.map(segment => (
                <Card key={segment.id} className="flex flex-col justify-between p-4 hover:shadow-md transition-shadow">
                  <Link href={`/tenants/${tenantId}/contacts/segments/${segment.id}`} className="flex-grow cursor-pointer">
                    <h3 className="font-semibold text-lg hover:text-primary">{segment.name}</h3>
                    <p className="text-sm text-muted-foreground truncate" title={segment.description}>{segment.description || "Keine Beschreibung"}</p>
                  </Link>
                  <div className="mt-3 flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditSegment(segment)} title="Segment bearbeiten">
                        <Edit className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Segment löschen" disabled={deleteSegmentMutation.isPending && deleteSegmentMutation.variables === segment.id}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Segment "{segment.name}" löschen? Dies entfernt das Segment auch von allen Kontakten.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSegment(segment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteSegmentMutation.isPending && deleteSegmentMutation.variables === segment.id}>
                                {(deleteSegmentMutation.isPending && deleteSegmentMutation.variables === segment.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <p className="text-center py-6 text-muted-foreground">Keine Segmente definiert.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
          <CardHeader>
              <CardTitle>Weitere Funktionen</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground">Zukünftige Funktionen wie CSV-Export, detaillierte Kundenübersichten mit Projekten und Zeiten werden hier verfügbar sein.</p>
                <img 
                    src="https://picsum.photos/seed/contactsAdvanced/1200/300" 
                    data-ai-hint="data export graph"
                    alt="Platzhalter für erweiterte Kontaktfunktionen" 
                    className="mt-4 rounded-lg shadow-md w-full object-cover h-48"
                 />
          </CardContent>
      </Card>

    </div>
  );
}
