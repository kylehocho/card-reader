import { topPriorityCards } from '@/lib/cards/top-priority-cards';
import type { AnalysisCardProduct, RewardCategory } from '@/lib/benefits/types';

export type MerchantContext = {
  merchant?: string;
  url?: string;
  title?: string;
  categoryHint?: string;
  cardProductIds?: string[];
};

export type MerchantRecommendation = {
  merchant: string;
  category: RewardCategory;
  bestCard: {
    id: string;
    issuer: string;
    name: string;
    multiplier: number;
    rewardCurrency: string | null;
  };
  runnerUp?: {
    id: string;
    issuer: string;
    name: string;
    multiplier: number;
    rewardCurrency: string | null;
  };
  reason: string;
  matchedOffer: {
    title: string;
    source: string;
    confidence: 'mock' | 'merchant-domain' | 'catalog-rule';
  } | null;
};

const domainMerchants: Record<string, { merchant: string; category: RewardCategory; offer?: string }> = {
  'patagonia.com': { merchant: 'Patagonia', category: 'general', offer: 'Check Amex/Chase merchant offers before checkout.' },
  'amazon.com': { merchant: 'Amazon', category: 'general' },
  'delta.com': { merchant: 'Delta Air Lines', category: 'flights' },
  'united.com': { merchant: 'United Airlines', category: 'flights' },
  'aa.com': { merchant: 'American Airlines', category: 'flights' },
  'airbnb.com': { merchant: 'Airbnb', category: 'travel' },
  'hyatt.com': { merchant: 'Hyatt', category: 'hotel' },
  'marriott.com': { merchant: 'Marriott', category: 'hotel' },
  'hilton.com': { merchant: 'Hilton', category: 'hotel' },
  'wholefoodsmarket.com': { merchant: 'Whole Foods', category: 'groceries' },
  'ubereats.com': { merchant: 'Uber Eats', category: 'dining' },
  'uber.com': { merchant: 'Uber', category: 'travel' },
};

const categoryAliases: Array<[RegExp, RewardCategory]> = [
  [/restaurant|dining|food|cafe|coffee|doordash|ubereats|resy/i, 'dining'],
  [/grocery|supermarket|whole foods|market|trader joe/i, 'groceries'],
  [/flight|airline|delta|united|american airlines|southwest/i, 'flights'],
  [/hotel|hyatt|marriott|hilton|lodging|airbnb/i, 'hotel'],
  [/gas|fuel|ev charging|chargepoint|shell|chevron/i, 'gas'],
  [/drugstore|pharmacy|cvs|walgreens/i, 'drugstore'],
  [/rent|apartment/i, 'rent'],
  [/streaming|netflix|hulu|disney|spotify/i, 'streaming'],
  [/travel|rideshare|uber|lyft|parking|transit/i, 'travel'],
];

const rewardAliases: Record<RewardCategory, string[]> = {
  dining: ['dining', 'restaurants'],
  groceries: ['groceries', 'us_supermarkets', 'online_grocery'],
  travel: ['travel'],
  flights: ['flights', 'air_travel', 'capital_one_travel_flights'],
  hotel: ['hotel', 'hotels', 'prepaid_hotels', 'capital_one_travel_hotels'],
  gas: ['gas', 'ev_charging'],
  drugstore: ['drugstore'],
  rent: ['rent'],
  streaming: ['streaming'],
  capital_one_travel: ['capital_one_travel', 'capital_one_travel_hotels', 'capital_one_travel_flights'],
  rotating_quarterly: ['rotating_quarterly'],
  general: ['general'],
};

function hostnameFromUrl(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function inferMerchant(context: MerchantContext) {
  const host = hostnameFromUrl(context.url);
  const domainMatch = host ? domainMerchants[host] ?? Object.entries(domainMerchants).find(([domain]) => host.endsWith(`.${domain}`))?.[1] : null;

  if (domainMatch) return domainMatch;

  const merchant = context.merchant?.trim() || context.title?.split(/[|–-]/)[0]?.trim() || host || 'Current merchant';
  const text = [merchant, context.categoryHint, context.title, host].filter(Boolean).join(' ');
  const category = categoryAliases.find(([pattern]) => pattern.test(text))?.[1] ?? 'general';

  return { merchant, category };
}

function multiplierFor(product: AnalysisCardProduct, category: RewardCategory) {
  const aliases = rewardAliases[category] ?? ['general'];
  return Math.max(...aliases.map((alias) => product.rewards[alias] ?? 0), product.rewards.general ?? 1);
}

export function recommendCardForMerchant(context: MerchantContext): MerchantRecommendation {
  const inferred = inferMerchant(context);
  const allowedIds = new Set(context.cardProductIds?.filter(Boolean) ?? []);
  const candidateCards = allowedIds.size > 0 ? topPriorityCards.filter((card) => allowedIds.has(card.id)) : topPriorityCards;
  const rankedCards = [...candidateCards]
    .map((card) => ({ card, multiplier: multiplierFor(card, inferred.category) }))
    .sort((left, right) => right.multiplier - left.multiplier || left.card.annual_fee - right.card.annual_fee);
  const best = rankedCards[0] ?? { card: topPriorityCards[0], multiplier: 1 };
  const runnerUp = rankedCards[1];

  return {
    merchant: inferred.merchant,
    category: inferred.category,
    bestCard: {
      id: best.card.id,
      issuer: best.card.issuer,
      name: best.card.name,
      multiplier: best.multiplier,
      rewardCurrency: best.card.reward_currency,
    },
    runnerUp: runnerUp
      ? {
          id: runnerUp.card.id,
          issuer: runnerUp.card.issuer,
          name: runnerUp.card.name,
          multiplier: runnerUp.multiplier,
          rewardCurrency: runnerUp.card.reward_currency,
        }
      : undefined,
    reason: `${inferred.category} context ranks ${best.card.name} highest among ${candidateCards.length} available card${candidateCards.length === 1 ? '' : 's'} at ${best.multiplier}x.`,
    matchedOffer:
      'offer' in inferred && inferred.offer
        ? {
            title: inferred.offer,
            source: 'MVP merchant-domain rule',
            confidence: 'mock',
          }
        : null,
  };
}
