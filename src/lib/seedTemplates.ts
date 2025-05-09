'use server';

import { addChartOfAccountsTemplate, getChartOfAccountsTemplates } from '@/services/chartOfAccountsTemplateService';
import type { ChartOfAccountsTemplateFormValues, AccountGroupTemplate } from '@/types';

const fixedGroupIds = {
  asset: 'fixed_asset_group',
  liability: 'fixed_liability_group',
  equity: 'fixed_equity_group',
  revenue: 'fixed_revenue_group',
  expense: 'fixed_expense_group',
};

const kmuTemplate: ChartOfAccountsTemplateFormValues = {
  name: "KMU Schweiz",
  description: "Standardkontenplan für kleine und mittlere Unternehmen in der Schweiz, angelehnt an gängige Praktiken.",
  groups: [
    // Fixed Groups (Level 0)
    { id: fixedGroupIds.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.equity, name: "Eigenkapital", mainType: "Equity", accounts: [
        { number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Geschäftsjahres. Dient dem Bilanzausgleich. Systemkonto.", isSystemAccount: true },
      ], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },
    
    // Subgroups (Level 1) for KMU
    { // Subgroup under Aktiven
      id: crypto.randomUUID(),
      name: "Umlaufvermögen",
      mainType: "Asset",
      accounts: [
        { number: "1000", name: "Kasse", description: "Bargeldbestand", isSystemAccount: false},
        { number: "1010", name: "PostFinance-Konto", description: "Guthaben PostFinance", isSystemAccount: false},
        { number: "1020", name: "Bankguthaben", description: "Guthaben bei Bankinstituten", isSystemAccount: false},
        { number: "1060", name: "Wertschriften des Umlaufvermögens", description: "Kurzfristig gehaltene Wertpapiere", isSystemAccount: false},
        { number: "1100", name: "Forderungen aus Lieferungen und Leistungen (FLL)", description: "Offene Kundenrechnungen", isSystemAccount: false},
        { number: "1109", name: "Delkredere", description: "Wertberichtigung auf FLL", isSystemAccount: false},
        { number: "1170", name: "Vorräte", description: "Warenlager, Rohmaterial, etc.", isSystemAccount: false},
        { number: "1300", name: "Aktive Rechnungsabgrenzungen (ARA)", description: "Vorausbezahlter Aufwand / Noch nicht fakturierter Ertrag", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.asset, level: 1, isFixed: false
    },
    { // Subgroup under Aktiven
      id: crypto.randomUUID(),
      name: "Anlagevermögen",
      mainType: "Asset",
      accounts: [
        { number: "1400", name: "Sachanlagen", description: "Mobile Sachanlagen, Maschinen, Fahrzeuge, IT-Infrastruktur", isSystemAccount: false},
        { number: "1500", name: "Immaterielle Anlagen", description: "Patente, Lizenzen, Software", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.asset, level: 1, isFixed: false
    },
    { // Subgroup under Passiven
      id: crypto.randomUUID(),
      name: "Fremdkapital Kurzfristig",
      mainType: "Liability",
      accounts: [
        { number: "2000", name: "Verbindlichkeiten aus Lieferungen und Leistungen (VLL)", description: "Offene Lieferantenrechnungen", isSystemAccount: false},
        { number: "2100", name: "Kurzfristige verzinsliche Verbindlichkeiten", description: "Kontokorrentkredite Bank", isSystemAccount: false},
        { number: "2300", name: "Passive Rechnungsabgrenzungen (PRA)", description: "Noch nicht bezahlter Aufwand / Im Voraus erhaltener Ertrag", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.liability, level: 1, isFixed: false
    },
    { // Subgroup under Passiven
      id: crypto.randomUUID(),
      name: "Fremdkapital Langfristig",
      mainType: "Liability",
      accounts: [
         { number: "2400", name: "Langfristige verzinsliche Verbindlichkeiten", description: "Darlehen, Hypotheken", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.liability, level: 1, isFixed: false
    },
    { // Subgroup under Eigenkapital
      id: crypto.randomUUID(),
      name: "Kapital und Reserven",
      mainType: "Equity",
      accounts: [
        { number: "2800", name: "Eigenkapital (Grund-/Stammkapital)", description: "Gezeichnetes Kapital", isSystemAccount: false }, 
        { number: "2900", name: "Reserven", description: "Gesetzliche und freie Reserven", isSystemAccount: false },
      ],
      parentId: fixedGroupIds.equity, level: 1, isFixed: false
    },
    { // Subgroup under Ertrag
      id: crypto.randomUUID(),
      name: "Betriebsertrag",
      mainType: "Revenue",
      accounts: [
        { number: "3000", name: "Produktionserlöse / Dienstleistungserlöse", description: "Erlöse aus Haupttätigkeit", isSystemAccount: false},
        { number: "3200", name: "Handelswarenerlöse", description: "Erlöse aus Verkauf von Handelswaren", isSystemAccount: false},
        { number: "3400", name: "Nebenerträge", description: "Sonstige betriebliche Erträge", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.revenue, level: 1, isFixed: false
    },
    { // Subgroup under Aufwand
      id: crypto.randomUUID(),
      name: "Betriebsaufwand",
      mainType: "Expense",
      accounts: [
        { number: "4000", name: "Materialaufwand", description: "Aufwand für Roh-, Hilfs-, Betriebsstoffe", isSystemAccount: false},
        { number: "4200", name: "Warenaufwand", description: "Einstandswert verkaufter Handelswaren", isSystemAccount: false},
        { number: "5000", name: "Personalaufwand", description: "Löhne, Gehälter, Sozialleistungen", isSystemAccount: false},
        { number: "6000", name: "Raumaufwand", description: "Miete, Nebenkosten, Unterhalt Räumlichkeiten", isSystemAccount: false},
        { number: "6100", name: "Unterhalt, Reparaturen, Ersatz (URE)", description: "URE von Mobilien und Maschinen", isSystemAccount: false},
        { number: "6200", name: "Fahrzeug- und Transportaufwand", description: "Leasing, Treibstoff, Reparaturen Fahrzeuge", isSystemAccount: false},
        { number: "6300", name: "Sachversicherungen, Abgaben, Gebühren", description: "Versicherungsprämien, Gebühren", isSystemAccount: false},
        { number: "6400", name: "Energie- und Entsorgungsaufwand", description: "Strom, Wasser, Heizung, Entsorgung", isSystemAccount: false},
        { number: "6500", name: "Verwaltungs- und Informatikaufwand", description: "Büromaterial, Telefon, Softwarelizenzen", isSystemAccount: false},
        { number: "6600", name: "Werbeaufwand", description: "Marketing- und Werbekosten", isSystemAccount: false},
        { number: "6800", name: "Sonstiger Betriebsaufwand", description: "Diverse betriebliche Aufwendungen", isSystemAccount: false},
        { number: "6900", name: "Abschreibungen", description: "Planmässige Abschreibungen auf Sachanlagen", isSystemAccount: false},
      ],
      parentId: fixedGroupIds.expense, level: 1, isFixed: false
    },
    { // Subgroup under Aufwand
      id: crypto.randomUUID(),
      name: "Finanzaufwand und Steuern",
      mainType: "Expense",
      accounts: [
        { number: "7500", name: "Finanzaufwand", description: "Zinsaufwand, Bankspesen", isSystemAccount: false},
        { number: "8000", name: "Steuern", description: "Direkte Steuern", isSystemAccount: false},
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
    { id: fixedGroupIds.equity, name: "Eigenkapital", mainType: "Equity", accounts: [
        { number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des laufenden Vereinsjahres. Systemkonto.", isSystemAccount: true },
      ], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },

    { // Subgroup under Aktiven
      id: crypto.randomUUID(), name: "Liquide Mittel & Forderungen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { number: "1000", name: "Kasse", description: "Bargeldbestand des Vereins", isSystemAccount: false },
        { number: "1010", name: "PostFinance", description: "Guthaben bei PostFinance", isSystemAccount: false },
        { number: "1020", name: "Bankguthaben", description: "Guthaben bei Banken", isSystemAccount: false },
        { number: "1100", name: "Forderungen", description: "Offene Forderungen (z.B. Mitgliederbeiträge)", isSystemAccount: false },
      ],
    },
    { // Subgroup under Passiven
      id: crypto.randomUUID(), name: "Kurzfristige Verbindlichkeiten", mainType: "Liability", parentId: fixedGroupIds.liability, level: 1, isFixed: false,
      accounts: [
        { number: "2000", name: "Verbindlichkeiten", description: "Kurzfristige Schulden des Vereins", isSystemAccount: false },
      ],
    },
     { // Subgroup under Eigenkapital
      id: crypto.randomUUID(), name: "Vereinskapital & Fonds", mainType: "Equity", parentId: fixedGroupIds.equity, level: 1, isFixed: false,
      accounts: [
        { number: "2800", name: "Vereinsvermögen / Fondskapital", description: "Eigenmittel des Vereins", isSystemAccount: false }, 
        { number: "2850", name: "Zweckgebundene Fonds", description: "Mittel für spezifische Projekte", isSystemAccount: false },
      ],
    },
    { // Subgroup under Ertrag
      id: crypto.randomUUID(), name: "Vereinserträge", mainType: "Revenue", parentId: fixedGroupIds.revenue, level: 1, isFixed: false,
      accounts: [
        { number: "3000", name: "Mitgliederbeiträge", description: "Einnahmen aus Mitgliederbeiträgen", isSystemAccount: false },
        { number: "3100", name: "Spenden und Zuwendungen", description: "Erhaltene Spenden", isSystemAccount: false },
        { number: "3200", name: "Erlöse aus Veranstaltungen", description: "Einnahmen aus Vereinsanlässen", isSystemAccount: false },
        { number: "3300", name: "Subventionen", description: "Öffentliche Beiträge", isSystemAccount: false},
      ],
    },
    { // Subgroup under Aufwand
      id: crypto.randomUUID(), name: "Vereinsaufwände", mainType: "Expense", parentId: fixedGroupIds.expense, level: 1, isFixed: false,
      accounts: [
        { number: "4000", name: "Aufwand für Veranstaltungen", description: "Kosten für Vereinsanlässe", isSystemAccount: false },
        { number: "5000", name: "Projektbezogener Aufwand", description: "Kosten für spezifische Vereinsprojekte", isSystemAccount: false },
        { number: "6000", name: "Verwaltungsaufwand", description: "Büromaterial, Porto, Telefon", isSystemAccount: false },
        { number: "6100", name: "Raumaufwand Verein", description: "Miete für Vereinslokalitäten", isSystemAccount: false },
        { number: "6800", name: "Sonstiger Vereinsaufwand", description: "Diverse Aufwendungen des Vereins", isSystemAccount: false },
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
    { id: fixedGroupIds.equity, name: "Nettovermögen (Eigenkapital)", mainType: "Equity", accounts: [
        { number: "2979", name: "Laufender Überschuss/Fehlbetrag", description: "Ergebnis der laufenden Periode. Systemkonto.", isSystemAccount: true },
      ], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.revenue, name: "Einnahmen (Ertrag)", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Ausgaben (Aufwand)", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },

    { // Subgroup under Aktiven
      id: crypto.randomUUID(), name: "Liquide Mittel & Anlagen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { number: "1000", name: "Bargeld / Portemonnaie", description: "Physisches Bargeld", isSystemAccount: false },
        { number: "1020", name: "Bankkonto Privat", description: "Girokonto, Sparkonto", isSystemAccount: false },
        { number: "1040", name: "Wertschriften (Aktien, Fonds)", description: "Anlagen in Wertpapieren", isSystemAccount: false },
        { number: "1070", name: "Säule 3a Guthaben", description: "Gebundene Vorsorge", isSystemAccount: false},
      ],
    },
    { // Subgroup under Aktiven
      id: crypto.randomUUID(), name: "Sachanlagen", mainType: "Asset", parentId: fixedGroupIds.asset, level: 1, isFixed: false,
      accounts: [
        { number: "1400", name: "Fahrzeuge", description: "Wert des privaten Fahrzeugs/der Fahrzeuge", isSystemAccount: false },
        { number: "1600", name: "Immobilien (selbstgenutzt)", description: "Wert der eigengenutzten Liegenschaft", isSystemAccount: false },
      ],
    },
    { // Subgroup under Passiven
      id: crypto.randomUUID(), name: "Verbindlichkeiten", mainType: "Liability", parentId: fixedGroupIds.liability, level: 1, isFixed: false,
      accounts: [
        { number: "2000", name: "Privatkredite / Darlehen", description: "Konsumkredite, Darlehen von Privatpersonen", isSystemAccount: false },
        { number: "2100", name: "Hypotheken", description: "Schulden für Immobilienfinanzierung", isSystemAccount: false },
      ],
    },
    { // Subgroup under Eigenkapital
      id: crypto.randomUUID(), name: "Eigenmittel", mainType: "Equity", parentId: fixedGroupIds.equity, level: 1, isFixed: false,
      accounts: [
        { number: "2800", name: "Eigenmittel / Reinvermögen", description: "Differenz Vermögen - Schulden", isSystemAccount: false },
      ],
    },
    { // Subgroup under Ertrag
      id: crypto.randomUUID(), name: "Regelmässige Einnahmen", mainType: "Revenue", parentId: fixedGroupIds.revenue, level: 1, isFixed: false,
      accounts: [
        { number: "3000", name: "Lohn / Gehalt", description: "Nettoeinkommen aus unselbstständiger Erwerbstätigkeit", isSystemAccount: false },
        { number: "3100", name: "Nebeneinkünfte", description: "Einkommen aus Nebenjobs, Vermietung (klein)", isSystemAccount: false },
        { number: "3500", name: "Kapitalerträge", description: "Zinsen, Dividenden", isSystemAccount: false },
      ],
    },
    { // Subgroup under Aufwand
      id: crypto.randomUUID(), name: "Fixe und Variable Ausgaben", mainType: "Expense", parentId: fixedGroupIds.expense, level: 1, isFixed: false,
      accounts: [
        { number: "4000", name: "Wohnen und Energie", description: "Miete/Hypothekarzins, Nebenkosten, Strom, Heizung", isSystemAccount: false },
        { number: "4100", name: "Lebensmittel und Getränke", description: "Einkäufe für den täglichen Bedarf", isSystemAccount: false },
        { number: "4200", name: "Mobilität", description: "ÖV-Abo, Benzin, Autounterhalt", isSystemAccount: false },
        { number: "4300", name: "Versicherungen", description: "Krankenkasse, Haushalt-, Privathaftpflichtversicherung", isSystemAccount: false },
        { number: "4400", name: "Kommunikation", description: "Telefon, Internet, TV", isSystemAccount: false },
        { number: "4500", name: "Freizeit und Kultur", description: "Hobbies, Sport, Urlaub, Restaurantbesuche", isSystemAccount: false },
        { number: "4600", name: "Gesundheit und Körperpflege", description: "Arztkosten (nicht KK), Medikamente, Drogerie", isSystemAccount: false },
        { number: "4700", name: "Bekleidung und Schuhe", description: "Ausgaben für Kleidung", isSystemAccount: false },
        { number: "4800", name: "Steuern", description: "Einkommens- und Vermögenssteuern", isSystemAccount: false },
        { number: "4900", name: "Sonstige Ausgaben", description: "Geschenke, Spenden (klein), Unvorhergesehenes", isSystemAccount: false },
      ],
    },
  ],
};

const defaultTemplates: ChartOfAccountsTemplateFormValues[] = [kmuTemplate, vereinTemplate, privatTemplate];

// Helper to ensure all fixed groups are present and correctly formatted
function ensureFixedGroups(groups: AccountGroupTemplate[]): AccountGroupTemplate[] {
  const fixedGroupDefinitions: AccountGroupTemplate[] = [
    { id: fixedGroupIds.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.equity, name: "Eigenkapital", mainType: "Equity", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
    { id: fixedGroupIds.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },
  ];

  const resultGroups = [...groups]; // Start with user-defined subgroups

  for (const fixedDef of fixedGroupDefinitions) {
    let existingFixedGroup = resultGroups.find(g => g.id === fixedDef.id);
    if (!existingFixedGroup) {
      // If a fixed group from the template is missing its base definition, add it.
      // This case should ideally not happen if templates are structured correctly.
      resultGroups.unshift({ ...fixedDef }); // Add to beginning
      existingFixedGroup = resultGroups[0];
    } else {
      // Ensure it has the fixed properties
      existingFixedGroup.isFixed = true;
      existingFixedGroup.parentId = null;
      existingFixedGroup.level = 0;
      existingFixedGroup.name = fixedDef.name; // Enforce fixed name
      existingFixedGroup.mainType = fixedDef.mainType; // Enforce fixed mainType
    }

    // Handle the P&L system account specifically for Equity
    if (fixedDef.mainType === 'Equity') {
        const profitLossAccount = { 
            number: "2979", 
            name: "Laufender Gewinn/Verlust", 
            description: "Ergebnis des Geschäftsjahres. Systemkonto.", 
            isSystemAccount: true 
        };
        const hasProfitLoss = existingFixedGroup.accounts.some(acc => acc.number === profitLossAccount.number && acc.isSystemAccount);
        if (!hasProfitLoss) {
            existingFixedGroup.accounts.push(profitLossAccount);
        }
    }
  }
  return resultGroups;
}


export async function seedDefaultChartOfAccountsTemplates() {
  try {
    const existingTemplates = await getChartOfAccountsTemplates();
    const existingTemplateNames = existingTemplates.map(t => t.name);

    for (const template of defaultTemplates) {
      if (!existingTemplateNames.includes(template.name)) {
        
        const processedGroups = ensureFixedGroups(template.groups.map(g => ({
          ...g,
          id: g.id || crypto.randomUUID(), // Ensure all groups have an ID
          accounts: g.accounts.map(a => ({
            ...a,
            id: a.id || crypto.randomUUID(), // Ensure all accounts have an ID
            description: a.description || '',
            isSystemAccount: a.isSystemAccount || false,
          })),
        })));
        
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
    throw error; // Re-throw to indicate failure if needed
  }
}
