
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ClipboardList, CalendarClock, CalendarX, CalendarCheck2, Loader2, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetProjects } from '@/hooks/useProjects';
import type { Project, ProjectTask, TaskStatus, Milestone } from '@/types';
import { taskStatusLabels } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isBefore, isAfter, addDays, startOfDay, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type EnrichedTask = ProjectTask & {
  projectId: string;
  projectName: string;
  tenantId: string;
  milestoneName?: string;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Kein Datum";
  try {
    const date = parseISO(dateString);
    return format(date, "dd.MM.yyyy", { locale: de });
  } catch (e) {
    return "Ungültiges Datum";
  }
};

const TaskItem: React.FC<{ task: EnrichedTask }> = ({ task }) => {
  const getStatusColor = (status: TaskStatus) => {
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
    <Card className="p-3 mb-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <Link href={`/tenants/${task.tenantId}/projects/${task.projectId}`} className="hover:underline">
            <h4 className="font-medium text-base">{task.name}</h4>
          </Link>
          <p className="text-xs text-muted-foreground">
            Projekt: <Link href={`/tenants/${task.tenantId}/projects/${task.projectId}`} className="hover:underline text-primary">{task.projectName}</Link>
          </p>
        </div>
        <Badge className={cn("text-xs", getStatusColor(task.status))}>{taskStatusLabels[task.status]}</Badge>
      </div>
      {task.description && <p className="text-sm text-muted-foreground mt-1 mb-2">{task.description}</p>}
      <div className="flex justify-between items-center mt-2">
        <p className={cn(
          "text-xs",
          task.dueDate && isBefore(parseISO(task.dueDate), startOfDay(new Date())) && task.status !== 'Completed' ? "text-destructive font-semibold" : "text-muted-foreground"
        )}>
          Fällig: {formatDate(task.dueDate)}
        </p>
        {task.milestoneId && task.milestoneName && (
          <Badge variant="outline" className="text-xs">
            Meilenstein: {task.milestoneName}
          </Badge>
        )}
      </div>
    </Card>
  );
};


export default function AllTasksPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [clientLoaded, setClientLoaded] = useState(false);
  useEffect(() => setClientLoaded(true), []);

  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useGetProjects(tenantId, undefined);

  const allNonCompletedTasks = useMemo(() => {
    if (!projects) return [];
    
    const taskList: EnrichedTask[] = [];
    
    projects.forEach(project => {
      const milestoneMap = new Map<string, string>();
      project.milestones.forEach(milestone => {
        milestoneMap.set(milestone.id, milestone.name);
      });

      (project.tasks || [])
        .filter(task => task.status !== 'Completed')
        .forEach(task => {
          taskList.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
            tenantId: project.tenantId,
            milestoneName: task.milestoneId ? milestoneMap.get(task.milestoneId) : undefined,
          });
        });
    });
    return taskList.sort((a,b) => { // Sort all tasks by due date primarily
        if (a.dueDate && b.dueDate) return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
        if (a.dueDate) return -1; 
        if (b.dueDate) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [projects]);

  const categorizedTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);

    const overdue: EnrichedTask[] = [];
    const dueSoon: EnrichedTask[] = [];
    const noDueDate: EnrichedTask[] = [];

    allNonCompletedTasks.forEach(task => {
      if (!task.dueDate) {
        noDueDate.push(task);
      } else {
        const dueDate = startOfDay(parseISO(task.dueDate));
        if (isBefore(dueDate, today)) {
          overdue.push(task);
        } else if (isWithinInterval(dueDate, { start: today, end: sevenDaysFromNow })) {
          dueSoon.push(task);
        }
      }
    });
    
    // Sorting is already done in allNonCompletedTasks, so no need to re-sort here
    return {
      overdue,
      dueSoon,
      noDueDate,
    };
  }, [allNonCompletedTasks]);

  const isLoading = isLoadingProjects && !clientLoaded;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-8 mr-3 rounded-full" />
          <Skeleton className="h-8 w-1/3" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={`summary-skeleton-${i}`}>
            <CardHeader><Skeleton className="h-7 w-1/4" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Aufgaben</h2>
        <p>{projectsError.message}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Zurück
        </Button>
      </div>
    );
  }
  
  if (!projects && !isLoadingProjects && clientLoaded) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Keine Projekte gefunden</h2>
        <p>Für diesen Mandanten wurden keine Projekte gefunden, um Aufgaben anzuzeigen.</p>
      </div>
    );
  }

  const getStatusBadge = (status: TaskStatus) => {
    const statusConfig = {
      Open: { label: taskStatusLabels.Open, color: "bg-blue-100 text-blue-700" },
      InProgress: { label: taskStatusLabels.InProgress, color: "bg-yellow-100 text-yellow-700" },
      InReview: { label: taskStatusLabels.InReview, color: "bg-purple-100 text-purple-700" },
      Blocked: { label: taskStatusLabels.Blocked, color: "bg-red-100 text-red-700" },
      Completed: { label: taskStatusLabels.Completed, color: "bg-green-100 text-green-700" }, // Though completed are filtered out
    };
    return <Badge className={cn("text-xs whitespace-nowrap", statusConfig[status]?.color || "bg-gray-100 text-gray-700")}>{statusConfig[status]?.label || status}</Badge>;
  };


  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center">
        <ClipboardList className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Aufgabenübersicht</h1>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Dies ist eine globale Aufgabenübersicht aller nicht erledigten Aufgaben.
          Detaillierte Aufgabenverwaltung und Kanban-Boards finden Sie direkt in den einzelnen <Link href={`/tenants/${tenantId}/projects`} className="text-primary hover:underline">Projekten</Link>.
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center space-x-2">
            <CalendarX className="h-6 w-6 text-destructive" />
            <CardTitle>Überfällig ({categorizedTasks.overdue.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {categorizedTasks.overdue.length > 0 ? (
              categorizedTasks.overdue.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-muted-foreground">Keine überfälligen Aufgaben.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center space-x-2">
            <CalendarClock className="h-6 w-6 text-yellow-500" />
            <CardTitle>Bald fällig ({categorizedTasks.dueSoon.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {categorizedTasks.dueSoon.length > 0 ? (
              categorizedTasks.dueSoon.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-muted-foreground">Keine bald fälligen Aufgaben.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center space-x-2">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <CardTitle>Ohne Fälligkeitsdatum ({categorizedTasks.noDueDate.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {categorizedTasks.noDueDate.length > 0 ? (
              categorizedTasks.noDueDate.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-muted-foreground">Keine Aufgaben ohne Fälligkeitsdatum.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {allNonCompletedTasks.length > 0 && (
        <Card className="shadow-lg mt-8">
          <CardHeader>
            <div className="flex items-center">
              <List className="h-6 w-6 mr-2 text-primary" />
              <CardTitle>Alle offenen Aufgaben ({allNonCompletedTasks.length})</CardTitle>
            </div>
            <CardDescription>Übersicht aller Aufgaben, die noch nicht als "Abgeschlossen" markiert wurden.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aufgabe</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Meilenstein</TableHead>
                    <TableHead>Fällig am</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allNonCompletedTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <Link href={`/tenants/${task.tenantId}/projects/${task.projectId}`} className="hover:underline">
                          {task.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tenants/${task.tenantId}/projects/${task.projectId}`} className="hover:underline text-primary">
                          {task.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>{task.milestoneName || '-'}</TableCell>
                      <TableCell
                        className={cn(
                          task.dueDate && isBefore(parseISO(task.dueDate), startOfDay(new Date())) && task.status !== 'Completed' ? "text-destructive font-semibold" : ""
                        )}
                      >
                        {formatDate(task.dueDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

       {allNonCompletedTasks.length === 0 && !isLoadingProjects && clientLoaded && (
         <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Für diesen Mandanten wurden keine offenen Aufgaben in den Projekten gefunden.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

