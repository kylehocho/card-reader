import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type CountResult = {
  count: number | null;
  error: { code?: string; message?: string } | null;
};

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || Boolean(error?.message?.includes('does not exist'));
}

type IntelligenceTable =
  | 'merchant_catalog'
  | 'merchant_offer_rules'
  | 'card_reward_rules'
  | 'card_benefit_rules'
  | 'issuer_offer_sources'
  | 'benefit_research_runs'
  | 'benefit_research_findings';

type TableStatus = {
  available: boolean;
  count: number;
};

const TABLES = {
  merchantCatalog: { table: 'merchant_catalog', group: 'baseRecommendation' },
  merchantOfferRules: { table: 'merchant_offer_rules', group: 'baseRecommendation' },
  cardRewardRules: { table: 'card_reward_rules', group: 'baseRecommendation' },
  cardBenefitRules: { table: 'card_benefit_rules', group: 'benefitResearch' },
  issuerOfferSources: { table: 'issuer_offer_sources', group: 'benefitResearch' },
  benefitResearchRuns: { table: 'benefit_research_runs', group: 'benefitResearch' },
  benefitResearchFindings: { table: 'benefit_research_findings', group: 'benefitResearch' },
} as const satisfies Record<string, { table: IntelligenceTable; group: 'baseRecommendation' | 'benefitResearch' }>;

async function countTable(supabase: ReturnType<typeof getSupabaseAdminClient>, table: IntelligenceTable) {
  const { count, error } = (await supabase.from(table).select('id', { count: 'exact', head: true })) as CountResult;
  if (isMissingTable(error)) return { available: false, count: 0 };
  if (error) throw new Error(error.message);
  return { available: true, count: count ?? 0 };
}

function summarizeGroup(tables: Record<keyof typeof TABLES, TableStatus>, group: 'baseRecommendation' | 'benefitResearch') {
  const expectedTables = Object.entries(TABLES)
    .filter(([, meta]) => meta.group === group)
    .map(([key]) => key as keyof typeof TABLES);
  const missingTables = expectedTables.filter((key) => !tables[key].available).map((key) => TABLES[key].table);
  const totalRows = expectedTables.reduce((total, key) => total + tables[key].count, 0);

  return {
    available: missingTables.length === 0,
    expectedTables: expectedTables.map((key) => TABLES[key].table),
    missingTables,
    totalRows,
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const tableEntries = await Promise.all(
      Object.entries(TABLES).map(async ([key, meta]) => [key, await countTable(supabase, meta.table)] as const),
    );
    const tables = Object.fromEntries(tableEntries) as Record<keyof typeof TABLES, TableStatus>;
    const groups = {
      baseRecommendation: summarizeGroup(tables, 'baseRecommendation'),
      benefitResearch: summarizeGroup(tables, 'benefitResearch'),
    };

    return NextResponse.json({
      available: groups.baseRecommendation.available,
      benefitResearchAvailable: groups.benefitResearch.available,
      groups,
      tables,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load merchant intelligence status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
