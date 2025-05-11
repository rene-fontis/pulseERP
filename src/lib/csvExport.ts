
"use client";

import type { Contact, Segment } from '@/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  let stringField = String(field);
  // If the field contains a comma, newline, or double quote, enclose it in double quotes.
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    // Escape any existing double quotes by doubling them.
    stringField = stringField.replace(/"/g, '""');
    return `"${stringField}"`;
  }
  return stringField;
}

function formatDateForCSV(dateString?: string): string {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), "dd.MM.yyyy HH:mm", { locale: de });
  } catch (e) {
    return dateString; // Return original if parsing fails
  }
}

export function exportContactsToCSV(contacts: Contact[], allSegments: Segment[]): string {
  if (!contacts || contacts.length === 0) {
    return '';
  }

  const segmentMap = new Map(allSegments.map(s => [s.id, s.name]));

  const headers = [
    'Name', 'Vorname', 'Firma', 'Strasse', 'PLZ', 'Ort', 'Land',
    'Telefon', 'E-Mail', 'Segmente', 'Stundensatz',
    'Ist Kunde', 'Ist Lieferant', 'Ist Partner', 'Notizen',
    'Erstellt am', 'Aktualisiert am'
  ];

  const csvRows = [headers.join(',')];

  contacts.forEach(contact => {
    const segmentNames = (contact.segmentIds || [])
      .map(id => segmentMap.get(id))
      .filter(Boolean)
      .join('; '); // Use semicolon for multi-value fields to avoid CSV issues with comma

    const row = [
      escapeCSVField(contact.name),
      escapeCSVField(contact.firstName),
      escapeCSVField(contact.companyName),
      escapeCSVField(contact.address?.street),
      escapeCSVField(contact.address?.zip),
      escapeCSVField(contact.address?.city),
      escapeCSVField(contact.address?.country),
      escapeCSVField(contact.phone),
      escapeCSVField(contact.email),
      escapeCSVField(segmentNames),
      escapeCSVField(contact.hourlyRate === null || contact.hourlyRate === undefined ? '' : contact.hourlyRate.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
      escapeCSVField(contact.isClient ? 'Ja' : 'Nein'),
      escapeCSVField(contact.isSupplier ? 'Ja' : 'Nein'),
      escapeCSVField(contact.isPartner ? 'Ja' : 'Nein'),
      escapeCSVField(contact.notes),
      escapeCSVField(formatDateForCSV(contact.createdAt)),
      escapeCSVField(formatDateForCSV(contact.updatedAt)),
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
