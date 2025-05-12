"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Briefcase,
  Clock,
  ClipboardList,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Building,
  TagIcon,
  DollarSign,
  Users2,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useGetContactById } from "@/hooks/useContacts";
import { useGetProjects } from "@/hooks/useProjects";
import { useGetTimeEntries } from "@/hooks/useTimeEntries";
import type { Project, ProjectTask, TimeEntry } from "@/types";
import { projectStatusLabels, taskStatusLabels } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency, cn } from "@/lib/utils";
import { useGetSegments } from "@/hooks/useSegments";


const formatDate = (dateString?: string | null, includeTime = false) => {
  if (!dateString) return "-";
  try {
    const formatString = includeTime ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy";
    return format(parseISO(dateString), formatString, { locale: de });
  } catch (e) {
    return "Ungültiges Datum";
  }
};


export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const contactId = params.contactId as string;
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: contact, isLoading: isLoadingContact, error: contactError } = useGetContactById(contactId);
  const { data: allProjects, isLoading: isLoadingProjects, error: projectsError } = useGetProjects(tenantId, undefined); // Fetch all for now, filter client-side or adapt hook
  const { data: allTimeEntries, isLoading: isLoadingTimeEntries, error: timeEntriesError } = useGetTimeEntries(tenantId, { contactId });
  const { data: allSegments, isLoading: isLoadingSegments, error: segmentsError } = useGetSegments(tenantId);


  const contactProjects = useMemo(() => {
    if (!allProjects || !contactId) return [];
    return allProjects.filter(p => p.contactId === contactId);
  }, [allProjects, contactId]);

  const getSegmentNames = (segmentIds?: string[]): string => {
    if (!segmentIds || !allSegments || segmentIds.length === 0) return "-";
    return segmentIds
      .map(id => allSegments.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const isLoading = (isLoadingContact || isLoadingProjects || isLoadingTimeEntries || isLoadingSegments) && !clientLoaded;
  const combinedError = contactError || projectsError || timeEntriesError || segmentsError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        {[...Array(3)].map((_, i) => (
          <Card key={`skeleton-card-${i}`}>
            <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Kontaktdaten</h2>
        <p>{(combinedError as Error).message}</p>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
      </div>
    );
  }

  if (!contact && !isLoadingContact && clientLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Kontakt nicht gefunden</h2>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
      </div>
    );
  }
  
  const getTaskStatusColor = (status: ProjectTask['status']) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'InProgress': return 'bg-yellow-100 text-yellow-700';
      case 'InReview': return 'bg-purple-100 text-purple-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/tenants/${tenantId}/contacts`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontaktübersicht
        </Button>
        <div className="flex items-center">
          <User className="h-10 w-10 mr-4 text-primary p-2 bg-primary/10 rounded-full" />
          <div>
            <h1 className="text-3xl font-bold">{contact?.firstName} {contact?.name}</h1>
            {contact?.companyName && <p className="text-lg text-muted-foreground">{contact.companyName}</p>}
          </div>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Kontaktdetails</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex items-center">
            <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
            <span className="font-semibold mr-2">E-Mail:</span> 
            {contact?.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : "-"}
          </div>
          <div className="flex items-center">
            <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
            <span className="font-semibold mr-2">Telefon:</span> 
            {contact?.phone ? <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a> : "-"}
          </div>
          <div className="flex items-start md:col-span-2">
            <MapPin className="h-5 w-5 mr-3 text-muted-foreground mt-1" />
            <span className="font-semibold mr-2">Adresse:</span> 
            <div>
              {contact?.address?.street || "-"} <br />
              {contact?.address?.zip || ""} {contact?.address?.city || ""} <br />
              {contact?.address?.country || ""}
            </div>
          </div>
           <div className="flex items-center">
            <TagIcon className="h-5 w-5 mr-3 text-muted-foreground" />
            <span className="font-semibold mr-2">Segmente:</span> {getSegmentNames(contact?.segmentIds)}
          </div>
          {contact?.isClient && contact?.hourlyRate && (
            <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="font-semibold mr-2">Stundensatz:</span> {formatCurrency(contact.hourlyRate)}
            </div>
          )}
          <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
            <span className="font-semibold mr-2">Typ:</span>
            {contact?.isClient && <Badge variant="outline">Kunde</Badge>}
            {contact?.isSupplier && <Badge variant="secondary">Lieferant</Badge>}
            {contact?.isPartner && <Badge variant="default" className="bg-purple-500 text-white">Partner</Badge>}
          </div>
          {contact?.notes && (
            <div className="md:col-span-2 mt-2">
                <span className="font-semibold">Notizen:</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Briefcase className="h-5 w-5 mr-2 text-primary"/>Projekte ({contactProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contactProjects.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {contactProjects.map((project) => (
                <AccordionItem value={project.id} key={project.id} className="border bg-muted/30 rounded-md px-3">
                  <AccordionTrigger className="py-3 text-base font-medium hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                        <span>{project.name}</span>
                        <Badge variant={project.status === 'Archived' ? 'secondary' : project.status === 'Completed' ? 'default' : 'outline'}>
                            {projectStatusLabels[project.status || 'Active']}
                        </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-3 space-y-3">
                    <p className="text-sm text-muted-foreground">{project.description || "Keine Beschreibung."}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <p><span className="font-medium">Start:</span> {formatDate(project.startDate)}</p>
                        <p><span className="font-medium">Ende:</span> {formatDate(project.endDate)}</p>
                    </div>
                    <Link href={`/tenants/${tenantId}/projects/${project.id}`} passHref>
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs"><Link2 className="h-3 w-3 mr-1"/>Projektdetails</Button>
                    </Link>
                    {project.tasks && project.tasks.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                            <h5 className="text-sm font-semibold mb-1">Aufgaben ({project.tasks.length}):</h5>
                            <ul className="space-y-1 list-disc list-inside pl-1">
                                {project.tasks.map(task => (
                                    <li key={task.id} className="text-xs">
                                        <span className={cn(task.status === 'Completed' && 'line-through text-muted-foreground')}>{task.name}</span>
                                        <Badge variant="outline" className={cn("ml-2 text-xs h-5", getTaskStatusColor(task.status))}>{taskStatusLabels[task.status]}</Badge>
                                        {task.dueDate && <span className="text-gray-500 text-xs"> (Fällig: {formatDate(task.dueDate)})</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-4">Keine Projekte für diesen Kontakt gefunden.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Clock className="h-5 w-5 mr-2 text-primary"/>Zeiterfassungen ({allTimeEntries?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTimeEntries ? (
            <Skeleton className="h-20 w-full"/>
          ): allTimeEntries && allTimeEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Std.</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Aufgabe</TableHead>
                    <TableHead className="text-right">Satz</TableHead>
                    <TableHead>Verrechenbar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTimeEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date, true)}</TableCell>
                      <TableCell>{entry.hours.toFixed(2)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || "-"}</TableCell>
                      <TableCell>{allProjects?.find(p=>p.id === entry.projectId)?.name || '-'}</TableCell>
                      <TableCell>{allProjects?.flatMap(p => p.tasks).find(t=>t.id === entry.taskId)?.name || '-'}</TableCell>
                      <TableCell className="text-right">{entry.rate ? formatCurrency(entry.rate) : "-"}</TableCell>
                      <TableCell>{entry.isBillable ? "Ja" : "Nein"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Keine Zeiterfassungen für diesen Kontakt gefunden.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
