'use server';

import { addChartOfAccountsTemplate, getChartOfAccountsTemplates } from '@/services/chartOfAccountsTemplateService';
import type { ChartOfAccountsTemplateFormValues, AccountGroupTemplate } from '@/types';

const kmuTemplate: ChartOfAccountsTemplateFormValues = {
  name: "KMU Schweiz",
  description: "Standardkontenplan für kleine und mittlere Unternehmen in der Schweiz, angelehnt an gängige Praktiken.",
  groups: [
    {
      name: "Aktiven",
      mainType: "Asset",
      accounts: [
        { number: "1000", name: "Kasse", description: "Bargeldbestand"},
        { number: "1010", name: "PostFinance-Konto", description: "Guthaben PostFinance"},
        { number: "1020", name: "Bankguthaben", description: "Guthaben bei Bankinstituten"},
        { number: "1060", name: "Wertschriften des Umlaufvermögens", description: "Kurzfristig gehaltene Wertpapiere"},
        { number: "1100", name: "Forderungen aus Lieferungen und Leistungen (FLL)", description: "Offene Kundenrechnungen"},
        { number: "1109", name: "Delkredere", description: "Wertberichtigung auf FLL"},
        { number: "1170", name: "Vorräte", description: "Warenlager, Rohmaterial, etc."},
        { number: "1300", name: "Aktive Rechnungsabgrenzungen (ARA)", description: "Vorausbezahlter Aufwand / Noch nicht fakturierter Ertrag"},
        { number: "1400", name: "Sachanlagen", description: "Mobile Sachanlagen, Maschinen, Fahrzeuge, IT-Infrastruktur"},
        { number: "1500", name: "Immaterielle Anlagen", description: "Patente, Lizenzen, Software"},
      ],
    },
    {
      name: "Passiven & Eigenkapital", // Renamed for clarity
      mainType: "Liability", // Main type remains Liability for group, specific accounts can be Equity
      accounts: [
        { number: "2000", name: "Verbindlichkeiten aus Lieferungen und Leistungen (VLL)", description: "Offene Lieferantenrechnungen"},
        { number: "2100", name: "Kurzfristige verzinsliche Verbindlichkeiten", description: "Kontokorrentkredite Bank"},
        { number: "2300", name: "Passive Rechnungsabgrenzungen (PRA)", description: "Noch nicht bezahlter Aufwand / Im Voraus erhaltener Ertrag"},
        { number: "2400", name: "Langfristige verzinsliche Verbindlichkeiten", description: "Darlehen, Hypotheken"},
        // Sub-grouping within 'Passiven & Eigenkapital' for clarity, or separate main 'Equity' group
        { number: "2800", name: "Eigenkapital (Grund-/Stammkapital)", description: "Gezeichnetes Kapital", isSystemAccount: false }, // This is Equity
        { number: "2900", name: "Reserven", description: "Gesetzliche und freie Reserven", isSystemAccount: false }, // This is Equity
        { number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Geschäftsjahres. Dient dem Bilanzausgleich. Systemkonto.", isSystemAccount: true }, // This is Equity System Account
      ],
    },
    {
      name: "Ertrag",
      mainType: "Revenue",
      accounts: [
        { number: "3000", name: "Produktionserlöse / Dienstleistungserlöse", description: "Erlöse aus Haupttätigkeit"},
        { number: "3200", name: "Handelswarenerlöse", description: "Erlöse aus Verkauf von Handelswaren"},
        { number: "3400", name: "Nebenerträge", description: "Sonstige betriebliche Erträge"},
      ],
    },
    {
      name: "Aufwand",
      mainType: "Expense",
      accounts: [
        { number: "4000", name: "Materialaufwand", description: "Aufwand für Roh-, Hilfs-, Betriebsstoffe"},
        { number: "4200", name: "Warenaufwand", description: "Einstandswert verkaufter Handelswaren"},
        { number: "5000", name: "Personalaufwand", description: "Löhne, Gehälter, Sozialleistungen"},
        { number: "6000", name: "Raumaufwand", description: "Miete, Nebenkosten, Unterhalt Räumlichkeiten"},
        { number: "6100", name: "Unterhalt, Reparaturen, Ersatz (URE)", description: "URE von Mobilien und Maschinen"},
        { number: "6200", name: "Fahrzeug- und Transportaufwand", description: "Leasing, Treibstoff, Reparaturen Fahrzeuge"},
        { number: "6300", name: "Sachversicherungen, Abgaben, Gebühren", description: "Versicherungsprämien, Gebühren"},
        { number: "6400", name: "Energie- und Entsorgungsaufwand", description: "Strom, Wasser, Heizung, Entsorgung"},
        { number: "6500", name: "Verwaltungs- und Informatikaufwand", description: "Büromaterial, Telefon, Softwarelizenzen"},
        { number: "6600", name: "Werbeaufwand", description: "Marketing- und Werbekosten"},
        { number: "6800", name: "Sonstiger Betriebsaufwand", description: "Diverse betriebliche Aufwendungen"},
        { number: "6900", name: "Abschreibungen", description: "Planmässige Abschreibungen auf Sachanlagen"},
        { number: "7500", name: "Finanzaufwand", description: "Zinsaufwand, Bankspesen"},
        { number: "8000", name: "Steuern", description: "Direkte Steuern"},
      ],
    },
  ],
};

const vereinTemplate: ChartOfAccountsTemplateFormValues = {
  name: "Verein Schweiz",
  description: "Standardkontenplan für Vereine in der Schweiz.",
  groups: [
    {
      name: "Aktiven",
      mainType: "Asset",
      accounts: [
        { number: "1000", name: "Kasse", description: "Bargeldbestand des Vereins" },
        { number: "1010", name: "PostFinance", description: "Guthaben bei PostFinance" },
        { number: "1020", name: "Bankguthaben", description: "Guthaben bei Banken" },
        { number: "1100", name: "Forderungen", description: "Offene Forderungen (z.B. Mitgliederbeiträge)" },
      ],
    },
    {
      name: "Passiven & Eigenkapital",
      mainType: "Liability",
      accounts: [
        { number: "2000", name: "Verbindlichkeiten", description: "Kurzfristige Schulden des Vereins" },
        { number: "2800", name: "Vereinsvermögen / Fondskapital", description: "Eigenmittel des Vereins", isSystemAccount: false }, // Equity
        { number: "2850", name: "Zweckgebundene Fonds", description: "Mittel für spezifische Projekte", isSystemAccount: false }, // Equity/Liability depending on nature
        { number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Vereinsjahres. Dient dem Bilanzausgleich. Systemkonto.", isSystemAccount: true }, // Equity System Account
      ],
    },
    {
      name: "Ertrag",
      mainType: "Revenue",
      accounts: [
        { number: "3000", name: "Mitgliederbeiträge", description: "Einnahmen aus Mitgliederbeiträgen" },
        { number: "3100", name: "Spenden und Zuwendungen", description: "Erhaltene Spenden" },
        { number: "3200", name: "Erlöse aus Veranstaltungen", description: "Einnahmen aus Vereinsanlässen" },
        { number: "3300", name: "Subventionen", description: "Öffentliche Beiträge"},
      ],
    },
    {
      name: "Aufwand",
      mainType: "Expense",
      accounts: [
        { number: "4000", name: "Aufwand für Veranstaltungen", description: "Kosten für Vereinsanlässe" },
        { number: "5000", name: "Projektbezogener Aufwand", description: "Kosten für spezifische Vereinsprojekte" },
        { number: "6000", name: "Verwaltungsaufwand", description: "Büromaterial, Porto, Telefon" },
        { number: "6100", name: "Raumaufwand Verein", description: "Miete für Vereinslokalitäten" },
        { number: "6800", name: "Sonstiger Vereinsaufwand", description: "Diverse Aufwendungen des Vereins" },
      ],
    },
  ],
};

const privatTemplate: ChartOfAccountsTemplateFormValues = {
  name: "Privat Schweiz",
  description: "Einfacher Kontenplan für private Finanzen in der Schweiz.",
  groups: [
    {
      name: "Vermögen (Aktiven)",
      mainType: "Asset",
      accounts: [
        { number: "1000", name: "Bargeld / Portemonnaie", description: "Physisches Bargeld" },
        { number: "1020", name: "Bankkonto Privat", description: "Girokonto, Sparkonto" },
        { number: "1040", name: "Wertschriften (Aktien, Fonds)", description: "Anlagen in Wertpapieren" },
        { number: "1070", name: "Säule 3a Guthaben", description: "Gebundene Vorsorge"},
        { number: "1400", name: "Fahrzeuge", description: "Wert des privaten Fahrzeugs/der Fahrzeuge" },
        { number: "1600", name: "Immobilien (selbstgenutzt)", description: "Wert der eigengenutzten Liegenschaft" },
      ],
    },
    {
      name: "Schulden & Eigenmittel (Passiven)",
      mainType: "Liability",
      accounts: [
        { number: "2000", name: "Privatkredite / Darlehen", description: "Konsumkredite, Darlehen von Privatpersonen" },
        { number: "2100", name: "Hypotheken", description: "Schulden für Immobilienfinanzierung" },
        { number: "2800", name: "Eigenmittel / Reinvermögen", description: "Differenz Vermögen - Schulden", isSystemAccount: false }, // Equity
        { number: "2979", name: "Laufender Überschuss/Fehlbetrag", description: "Ergebnis der laufenden Periode. Dient dem Bilanzausgleich. Systemkonto.", isSystemAccount: true }, // Equity System Account
      ],
    },
    {
      name: "Einnahmen (Ertrag)",
      mainType: "Revenue",
      accounts: [
        { number: "3000", name: "Lohn / Gehalt", description: "Nettoeinkommen aus unselbstständiger Erwerbstätigkeit" },
        { number: "3100", name: "Nebeneinkünfte", description: "Einkommen aus Nebenjobs, Vermietung (klein)" },
        { number: "3500", name: "Kapitalerträge", description: "Zinsen, Dividenden" },
      ],
    },
    {
      name: "Ausgaben (Aufwand)",
      mainType: "Expense",
      accounts: [
        { number: "4000", name: "Wohnen und Energie", description: "Miete/Hypothekarzins, Nebenkosten, Strom, Heizung" },
        { number: "4100", name: "Lebensmittel und Getränke", description: "Einkäufe für den täglichen Bedarf" },
        { number: "4200", name: "Mobilität", description: "ÖV-Abo, Benzin, Autounterhalt" },
        { number: "4300", name: "Versicherungen", description: "Krankenkasse, Haushalt-, Privathaftpflichtversicherung" },
        { number: "4400", name: "Kommunikation", description: "Telefon, Internet, TV" },
        { number: "4500", name: "Freizeit und Kultur", description: "Hobbies, Sport, Urlaub, Restaurantbesuche" },
        { number: "4600", name: "Gesundheit und Körperpflege", description: "Arztkosten (nicht KK), Medikamente, Drogerie" },
        { number: "4700", name: "Bekleidung und Schuhe", description: "Ausgaben für Kleidung" },
        { number: "4800", name: "Steuern", description: "Einkommens- und Vermögenssteuern" },
        { number: "4900", name: "Sonstige Ausgaben", description: "Geschenke, Spenden (klein), Unvorhergesehenes" },
      ],
    },
  ],
};

// To create distinct Equity groups if needed, adjust the structure:
// For example, for KMU:
// const kmuEquityGroup: AccountGroupTemplate = {
//   name: "Eigenkapital",
//   mainType: "Equity",
//   accounts: [
//     { number: "2800", name: "Grund-/Stammkapital", description: "Gezeichnetes Kapital" },
//     { number: "2900", name: "Reserven", description: "Gesetzliche und freie Reserven" },
//     { number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Geschäftsjahres.", isSystemAccount: true },
//   ],
// };
// Then, the Passives group would only contain liability accounts, and kmuEquityGroup would be added to kmuTemplate.groups.
// For simplicity in this seed, Equity accounts are listed under "Passiven & Eigenkapital" and their type will be used by the summary logic.

const defaultTemplates: ChartOfAccountsTemplateFormValues[] = [kmuTemplate, vereinTemplate, privatTemplate];

export async function seedDefaultChartOfAccountsTemplates() {
  try {
    const existingTemplates = await getChartOfAccountsTemplates();
    const existingTemplateNames = existingTemplates.map(t => t.name);

    for (const template of defaultTemplates) {
      if (!existingTemplateNames.includes(template.name)) {
        const templateToSubmit: ChartOfAccountsTemplateFormValues = {
          ...template,
          groups: template.groups.map(g => ({
            name: g.name,
            mainType: g.mainType, // This should be the group's main type
            accounts: g.accounts.map(a => ({
              name: a.name,
              number: a.number,
              description: a.description || '',
              isSystemAccount: a.isSystemAccount || false, // Ensure isSystemAccount is passed
            })),
          } as Omit<AccountGroupTemplate, 'id'>)) 
        };
        await addChartOfAccountsTemplate(templateToSubmit);
        console.log(`Seeded template: ${template.name}`);
      } else {
        console.log(`Template "${template.name}" already exists. Skipping.`);
      }
    }
    console.log("Default templates seeding process completed.");
  } catch (error) {
    console.error("Error seeding default chart of accounts templates:", error);
  }
}
