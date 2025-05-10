
'use server';

import { addChartOfAccountsTemplate, getChartOfAccountsTemplates } from '@/services/chartOfAccountsTemplateService';
import type { ChartOfAccountsTemplateFormValues, AccountGroupTemplate } from '@/types';

// These IDs are used to uniquely identify the 5 main fixed groups across all template definitions.
// Subgroups will use these IDs in their `parentId` field.
const fixedGroupIds = {
  asset: 'fixed_asset_group_global', 
  liability: 'fixed_liability_group_global',
  equity: 'fixed_equity_group_global',
  revenue: 'fixed_revenue_group_global',
  expense: 'fixed_expense_group_global',
};

const kmuTemplate: ChartOfAccountsTemplateFormValues = {
  name: "KMU Schweiz",
  description: "Standardkontenplan für kleine und mittlere Unternehmen in der Schweiz, angelehnt an gängige Praktiken.",
  groups: [
    // Fixed Groups (Level 0) - These MUST use IDs from fixedGroupIds
    { id: fixedGroupIds.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { 
      id: fixedGroupIds.equity, 
      name: "Eigenkapital", 
      mainType: "Equity", 
      accounts: [
        { id: crypto.randomUUID(), number: "2970", name: "Gewinnvortrag / Verlustvortrag", description: "Vorjahresergebnis", isSystemAccount: false, isRetainedEarningsAccount: true },
        // { id: crypto.randomUUID(), number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Geschäftsjahres. Dient dem Bilanzausgleich. Systemkonto.", isSystemAccount: true },
      ], 
      isFixed: true, parentId: null, level: 0 
    },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },
    
    // Subgroups (Level 1) for KMU - Their parentId MUST reference an ID from fixedGroupIds
    { 
      id: crypto.randomUUID(), 
      name: "Umlaufvermögen",
      mainType: "Asset", 
      accounts: [
        { id: crypto.randomUUID(), number: "1000", name: "Kasse", description: "Bargeldbestand", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1010", name: "PostFinance-Konto", description: "Guthaben PostFinance", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1020", name: "Bankguthaben", description: "Guthaben bei Bankinstituten", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1060", name: "Wertschriften des Umlaufvermögens", description: "Kurzfristig gehaltene Wertpapiere", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1100", name: "Forderungen aus Lieferungen und Leistungen (FLL)", description: "Offene Kundenrechnungen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1109", name: "Delkredere", description: "Wertberichtigung auf FLL", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1170", name: "Vorräte", description: "Warenlager, Rohmaterial, etc.", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1300", name: "Aktive Rechnungsabgrenzungen (ARA)", description: "Vorausbezahlter Aufwand / Noch nicht fakturierter Ertrag", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.asset, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Anlagevermögen",
      mainType: "Asset",
      accounts: [
        { id: crypto.randomUUID(), number: "1400", name: "Sachanlagen", description: "Mobile Sachanlagen, Maschinen, Fahrzeuge, IT-Infrastruktur", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "1500", name: "Immaterielle Anlagen", description: "Patente, Lizenzen, Software", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.asset, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Fremdkapital Kurzfristig",
      mainType: "Liability",
      accounts: [
        { id: crypto.randomUUID(), number: "2000", name: "Verbindlichkeiten aus Lieferungen und Leistungen (VLL)", description: "Offene Lieferantenrechnungen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "2100", name: "Kurzfristige verzinsliche Verbindlichkeiten", description: "Kontokorrentkredite Bank", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "2300", name: "Passive Rechnungsabgrenzungen (PRA)", description: "Noch nicht bezahlter Aufwand / Im Voraus erhaltener Ertrag", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.liability, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Fremdkapital Langfristig",
      mainType: "Liability",
      accounts: [
         { id: crypto.randomUUID(), number: "2400", name: "Langfristige verzinsliche Verbindlichkeiten", description: "Darlehen, Hypotheken", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.liability, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Kapital und Reserven", 
      mainType: "Equity",
      accounts: [
        { id: crypto.randomUUID(), number: "2800", name: "Eigenkapital (Grund-/Stammkapital)", description: "Gezeichnetes Kapital", isSystemAccount: false }, 
        { id: crypto.randomUUID(), number: "2900", name: "Reserven", description: "Gesetzliche und freie Reserven", isSystemAccount: false },
      ],
      parentId: fixedGroupIds.equity, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Betriebsertrag",
      mainType: "Revenue",
      accounts: [
        { id: crypto.randomUUID(), number: "3000", name: "Produktionserlöse / Dienstleistungserlöse", description: "Erlöse aus Haupttätigkeit", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "3200", name: "Handelswarenerlöse", description: "Erlöse aus Verkauf von Handelswaren", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "3400", name: "Nebenerträge", description: "Sonstige betriebliche Erträge", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.revenue, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Betriebsaufwand",
      mainType: "Expense",
      accounts: [
        { id: crypto.randomUUID(), number: "4000", name: "Materialaufwand", description: "Aufwand für Roh-, Hilfs-, Betriebsstoffe", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "4200", name: "Warenaufwand", description: "Einstandswert verkaufter Handelswaren", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "5000", name: "Personalaufwand", description: "Löhne, Gehälter, Sozialleistungen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6000", name: "Raumaufwand", description: "Miete, Nebenkosten, Unterhalt Räumlichkeiten", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6100", name: "Unterhalt, Reparaturen, Ersatz (URE)", description: "URE von Mobilien und Maschinen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6200", name: "Fahrzeug- und Transportaufwand", description: "Leasing, Treibstoff, Reparaturen Fahrzeuge", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6300", name: "Sachversicherungen, Abgaben, Gebühren", description: "Versicherungsprämien, Gebühren", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6400", name: "Energie- und Entsorgungsaufwand", description: "Strom, Wasser, Heizung, Entsorgung", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6500", name: "Verwaltungs- und Informatikaufwand", description: "Büromaterial, Telefon, Softwarelizenzen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6600", name: "Werbeaufwand", description: "Marketing- und Werbekosten", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6800", name: "Sonstiger Betriebsaufwand", description: "Diverse betriebliche Aufwendungen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "6900", name: "Abschreibungen", description: "Planmässige Abschreibungen auf Sachanlagen", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.expense, level: 1, isFixed: false
    },
    { 
      id: crypto.randomUUID(),
      name: "Finanzaufwand und Steuern",
      mainType: "Expense", 
      accounts: [
        { id: crypto.randomUUID(), number: "7500", name: "Finanzaufwand", description: "Zinsaufwand, Bankspesen", isSystemAccount: false},
        { id: crypto.randomUUID(), number: "8000", name: "Steuern", description: "Direkte Steuern", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.expense, level: 1, isFixed: false
    }
  ],
};

const vereinTemplate: ChartOfAccountsTemplateFormValues = {
  name: "Verein Schweiz",
  description: "Standardkontenplan für Vereine in der Schweiz.",
  groups: [
    { id: fixedGroupIds.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { 
      id: fixedGroupIds.equity, 
      name: "Eigenkapital", 
      mainType: "Equity", 
      accounts: [
        { id: crypto.randomUUID(), number: "2970", name: "Gewinnvortrag / Verlustvortrag", description: "Vorjahresergebnis", isSystemAccount: false, isRetainedEarningsAccount: true },
        // { id: crypto.randomUUID(), number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Vereinsjahres. Systemkonto.", isSystemAccount: true },
      ], 
      isFixed: true, parentId: null, level: 0 
    },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },

    { 
      id: crypto.randomUUID(), name: "Liquide Mittel & Forderungen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "1000", name: "Kasse", description: "Bargeldbestand des Vereins", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1010", name: "PostFinance", description: "Guthaben bei PostFinance", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1020", name: "Bankguthaben", description: "Guthaben bei Banken", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1100", name: "Forderungen", description: "Offene Forderungen (z.B. Mitgliederbeiträge)", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Kurzfristige Verbindlichkeiten", mainType: "Liability", parentId: fixedGroupIds.liability, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "2000", name: "Verbindlichkeiten", description: "Kurzfristige Schulden des Vereins", isSystemAccount: false },
      ],
    },
     { 
      id: crypto.randomUUID(), name: "Vereinskapital & Fonds", mainType: "Equity", parentId: fixedGroupIds.equity, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "2800", name: "Vereinsvermögen / Fondskapital", description: "Eigenmittel des Vereins", isSystemAccount: false }, 
        { id: crypto.randomUUID(), number: "2850", name: "Zweckgebundene Fonds", description: "Mittel für spezifische Projekte", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Vereinserträge", mainType: "Revenue", parentId: fixedGroupIds.revenue, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "3000", name: "Mitgliederbeiträge", description: "Einnahmen aus Mitgliederbeiträgen", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "3100", name: "Spenden und Zuwendungen", description: "Erhaltene Spenden", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "3200", name: "Erlöse aus Veranstaltungen", description: "Einnahmen aus Vereinsanlässen", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "3300", name: "Subventionen", description: "Öffentliche Beiträge", isSystemAccount: false},
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Vereinsaufwände", mainType: "Expense", parentId: fixedGroupIds.expense, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "4000", name: "Aufwand für Veranstaltungen", description: "Kosten für Vereinsanlässe", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "5000", name: "Projektbezogener Aufwand", description: "Kosten für spezifische Vereinsprojekte", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "6000", name: "Verwaltungsaufwand", description: "Büromaterial, Porto, Telefon", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "6100", name: "Raumaufwand Verein", description: "Miete für Vereinslokalitäten", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "6800", name: "Sonstiger Vereinsaufwand", description: "Diverse Aufwendungen des Vereins", isSystemAccount: false },
      ],
    },
  ],
};

const privatTemplate: ChartOfAccountsTemplateFormValues = {
  name: "Privat Schweiz",
  description: "Einfacher Kontenplan für private Finanzen in der Schweiz.",
  groups: [
    { id: fixedGroupIds.asset, name: "Vermögen (Aktiven)", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Schulden (Passiven)", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { 
      id: fixedGroupIds.equity, 
      name: "Nettovermögen (Eigenkapital)", 
      mainType: "Equity", 
      accounts: [
        { id: crypto.randomUUID(), number: "2970", name: "Gewinnvortrag / Verlustvortrag", description: "Vorjahresergebnis", isSystemAccount: false, isRetainedEarningsAccount: true },
        // { id: crypto.randomUUID(), number: "2979", name: "Laufender Überschuss/Fehlbetrag", description: "Ergebnis der laufenden Periode. Systemkonto.", isSystemAccount: true },
      ], 
      isFixed: true, parentId: null, level: 0 
    },
    { id: fixedGroupIds.revenue, name: "Einnahmen (Ertrag)", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Ausgaben (Aufwand)", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },

    { 
      id: crypto.randomUUID(), name: "Liquide Mittel & Anlagen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "1000", name: "Bargeld / Portemonnaie", description: "Physisches Bargeld", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1020", name: "Bankkonto Privat", description: "Girokonto, Sparkonto", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1040", name: "Wertschriften (Aktien, Fonds)", description: "Anlagen in Wertpapieren", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1070", name: "Säule 3a Guthaben", description: "Gebundene Vorsorge", isSystemAccount: false},
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Sachanlagen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "1400", name: "Fahrzeuge", description: "Wert des privaten Fahrzeugs/der Fahrzeuge", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "1600", name: "Immobilien (selbstgenutzt)", description: "Wert der eigengenutzten Liegenschaft", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Verbindlichkeiten", mainType: "Liability", parentId: fixedGroupIds.liability, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "2000", name: "Privatkredite / Darlehen", description: "Konsumkredite, Darlehen von Privatpersonen", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "2100", name: "Hypotheken", description: "Schulden für Immobilienfinanzierung", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Eigenmittel", mainType: "Equity", parentId: fixedGroupIds.equity, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "2800", name: "Eigenmittel / Reinvermögen", description: "Differenz Vermögen - Schulden", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Regelmässige Einnahmen", mainType: "Revenue", parentId: fixedGroupIds.revenue, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "3000", name: "Lohn / Gehalt", description: "Nettoeinkommen aus unselbstständiger Erwerbstätigkeit", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "3100", name: "Nebeneinkünfte", description: "Einkommen aus Nebenjobs, Vermietung (klein)", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "3500", name: "Kapitalerträge", description: "Zinsen, Dividenden", isSystemAccount: false },
      ],
    },
    { 
      id: crypto.randomUUID(), name: "Fixe und Variable Ausgaben", mainType: "Expense", parentId: fixedGroupIds.expense, level: 1, isFixed: false,
      accounts: [
        { id: crypto.randomUUID(), number: "4000", name: "Wohnen und Energie", description: "Miete/Hypothekarzins, Nebenkosten, Strom, Heizung", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4100", name: "Lebensmittel und Getränke", description: "Einkäufe für den täglichen Bedarf", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4200", name: "Mobilität", description: "ÖV-Abo, Benzin, Autounterhalt", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4300", name: "Versicherungen", description: "Krankenkasse, Haushalt-, Privathaftpflichtversicherung", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4400", name: "Kommunikation", description: "Telefon, Internet, TV", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4500", name: "Freizeit und Kultur", description: "Hobbies, Sport, Urlaub, Restaurantbesuche", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4600", name: "Gesundheit und Körperpflege", description: "Arztkosten (nicht KK), Medikamente, Drogerie", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4700", name: "Bekleidung und Schuhe", description: "Ausgaben für Kleidung", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4800", name: "Steuern", description: "Einkommens- und Vermögenssteuern", isSystemAccount: false },
        { id: crypto.randomUUID(), number: "4900", name: "Sonstige Ausgaben", description: "Geschenke, Spenden (klein), Unvorhergesehenes", isSystemAccount: false },
      ],
    },
  ],
};

const defaultTemplates: ChartOfAccountsTemplateFormValues[] = [kmuTemplate, vereinTemplate, privatTemplate];

function ensureFixedGroups(groups: AccountGroupTemplate[]): AccountGroupTemplate[] {
  const fixedGroupDefinitions: AccountGroupTemplate[] = [
    { id: fixedGroupIds.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { 
      id: fixedGroupIds.equity, 
      name: "Eigenkapital", 
      mainType: "Equity", 
      accounts: [
        { id: crypto.randomUUID(), number: "2970", name: "Gewinnvortrag / Verlustvortrag", description: "Vorjahresergebnis", isSystemAccount: false, isRetainedEarningsAccount: true },
        // { id: crypto.randomUUID(), number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des Geschäftsjahres. Systemkonto.", isSystemAccount: true },
      ], 
      isFixed: true, parentId: null, level: 0 
    },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },
  ];

  const resultGroups: AccountGroupTemplate[] = [];
  const processedFixedGroupIds = new Set<string>();

  for (const fixedDef of fixedGroupDefinitions) {
    let existingFixedGroup = groups.find(g => g.id === fixedDef.id);
    if (existingFixedGroup) {
      existingFixedGroup.name = fixedDef.name;
      existingFixedGroup.mainType = fixedDef.mainType;
      existingFixedGroup.isFixed = true;
      existingFixedGroup.parentId = null;
      existingFixedGroup.level = 0;
    } else {
      existingFixedGroup = groups.find(g => g.isFixed && g.mainType === fixedDef.mainType && g.level === 0);
      if (existingFixedGroup) {
        existingFixedGroup.id = fixedDef.id; 
        existingFixedGroup.name = fixedDef.name;
        existingFixedGroup.mainType = fixedDef.mainType;
        existingFixedGroup.isFixed = true;
        existingFixedGroup.parentId = null;
        existingFixedGroup.level = 0;
      } else {
         existingFixedGroup = { ...fixedDef, accounts: fixedDef.accounts.map(acc => ({...acc, id: acc.id || crypto.randomUUID() })) };
      }
    }

    if (existingFixedGroup.mainType === 'Equity') {
      // const profitLossAccountTemplate = fixedDef.accounts.find(acc => acc.isSystemAccount && acc.number === "2979");
      // if (profitLossAccountTemplate && !existingFixedGroup.accounts.some(acc => acc.number === profitLossAccountTemplate.number && acc.isSystemAccount)) {
      //   existingFixedGroup.accounts.push({ ...profitLossAccountTemplate, id: crypto.randomUUID() }); 
      // }
      const retainedEarningsAccountTemplate = fixedDef.accounts.find(acc => acc.isRetainedEarningsAccount && acc.number === "2970");
      if (retainedEarningsAccountTemplate && !existingFixedGroup.accounts.some(acc => acc.number === retainedEarningsAccountTemplate.number && acc.isRetainedEarningsAccount)) {
        existingFixedGroup.accounts.push({ ...retainedEarningsAccountTemplate, id: crypto.randomUUID() });
      }
    }
    resultGroups.push(existingFixedGroup);
    processedFixedGroupIds.add(existingFixedGroup.id);
  }

  groups.forEach(group => {
    if (!group.isFixed) { 
      const parentIsCanonicalFixed = Object.values(fixedGroupIds).includes(group.parentId || '');
      if (parentIsCanonicalFixed && group.parentId) {
        const parentGroup = resultGroups.find(rg => rg.id === group.parentId);
        if (parentGroup) {
            group.mainType = parentGroup.mainType; 
        }
        
        const groupToAdd = {...group, accounts: group.accounts.map(acc => ({...acc, id: acc.id || crypto.randomUUID()}))};
        resultGroups.push(groupToAdd);
      } else if (!group.parentId) {
        // This case handles groups that might have been defined without a parentId and are not fixed.
        // This could happen if the input `groups` array contains groups that are not part of the standard structure.
        // We add them if they are not already processed (e.g. as a fixed group that was missing its canonical ID).
        if (!resultGroups.some(rg => rg.id === group.id)) {
             const groupToAdd = {...group, accounts: group.accounts.map(acc => ({...acc, id: acc.id || crypto.randomUUID()}))};
            resultGroups.push(groupToAdd);
        }
      }
    }
  });
  
  // Deduplicate groups by ID, prioritizing fixed groups or earlier occurrences.
  const finalGroups = resultGroups.reduce((acc, current) => {
    if (!acc.find(item => item.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, [] as AccountGroupTemplate[]);


  return finalGroups;
}


export async function seedDefaultChartOfAccountsTemplates() {
  try {
    const existingTemplates = await getChartOfAccountsTemplates();
    const existingTemplateNames = existingTemplates.map(t => t.name);

    for (const template of defaultTemplates) {
      if (!existingTemplateNames.includes(template.name)) {
        
        const groupsWithIds = template.groups.map(g => ({
          ...g,
          id: g.id || crypto.randomUUID(), 
          accounts: g.accounts.map(a => ({
            ...a,
            id: a.id || crypto.randomUUID(), 
            description: a.description || '',
            isSystemAccount: a.isSystemAccount || false,
            isRetainedEarningsAccount: a.isRetainedEarningsAccount || false,
          })),
        }));
        
        const processedGroups = ensureFixedGroups(groupsWithIds);
        
        const templateToSubmit: ChartOfAccountsTemplateFormValues = {
          name: template.name,
          description: template.description || '',
          groups: processedGroups,
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
    throw error; 
  }
}

