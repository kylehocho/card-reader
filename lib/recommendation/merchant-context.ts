import { topPriorityCards } from '@/lib/cards/top-priority-cards';
import type { AnalysisCardProduct, RewardCategory } from '@/lib/benefits/types';
import merchantCatalog from '@/data/merchant-catalog.json';

export type MerchantContext = {
  merchant?: string;
  host?: string;
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

type MerchantCatalogOffer = {
  id: string;
  title: string;
  source: string;
  eligible_card_product_ids?: string[];
};

type MerchantCatalogEntry = {
  id: string;
  name: string;
  domains: string[];
  aliases: string[];
  category: RewardCategory;
  offers: MerchantCatalogOffer[];
};

const merchantEntries = merchantCatalog as MerchantCatalogEntry[];

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
  [/retail|shopping|apparel|clothing|outdoor|marketplace/i, 'general'],
];

const rewardAliases: Record<RewardCategory, string[]> = {
  dining: ['dining', 'restaurants'],
  groceries: ['groceries', 'us_supermarkets', 'online_grocery'],
  travel: ['travel'],
  flights: ['flights', 'air_travel'],
  hotel: ['hotel', 'hotels'],
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

function hostnameFromContext(context: MerchantContext) {
  return normalize(context.host) || hostnameFromUrl(context.url);
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function merchantText(context: MerchantContext, host: string | null) {
  return [context.merchant, context.categoryHint, context.title, host].filter(Boolean).join(' ').toLowerCase();
}

function findCatalogEntry(context: MerchantContext, host: string | null) {
  if (host) {
    const domainMatch = merchantEntries.find((entry) => entry.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));
    if (domainMatch) return domainMatch;
  }

  const text = merchantText(context, host);
  if (!text) return null;

  return (
    merchantEntries.find((entry) => {
      const names = [entry.name, ...entry.aliases].map(normalize).filter(Boolean);
      return names.some((name) => text.includes(name));
    }) ?? null
  );
}

function offerFor(entry: MerchantCatalogEntry | null, candidateCards: AnalysisCardProduct[]) {
  if (!entry) return null;
  const candidateIds = new Set(candidateCards.map((card) => card.id));
  return (
    entry.offers.find((offer) => {
      const eligibleIds = offer.eligible_card_product_ids ?? [];
      return eligibleIds.length === 0 || eligibleIds.some((cardId) => candidateIds.has(cardId));
    }) ?? null
  );
}

function inferMerchant(context: MerchantContext) {
  const host = hostnameFromContext(context);
  const catalogEntry = findCatalogEntry(context, host);

  if (catalogEntry) {
    return {
      merchant: catalogEntry.name,
      category: catalogEntry.category,
      catalogEntry,
    };
  }

  const merchant = context.merchant?.trim() || context.title?.split(/[|–-]/)[0]?.trim() || host || 'Current merchant';
  const text = merchantText(context, host);
  const category = categoryAliases.find(([pattern]) => pattern.test(text))?.[1] ?? 'general';

  return { merchant, category, catalogEntry: null };
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
  const matchedOffer = offerFor(inferred.catalogEntry, candidateCards);

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
    reason: `${inferred.category} context ranks ${best.card.name} highest among ${candidateCards.length} available card${candidateCards.length === 1 ? '' : 's'} at ${best.multiplier}x${inferred.catalogEntry ? ` using the ${inferred.catalogEntry.name} merchant catalog match` : ''}.`,
    matchedOffer: matchedOffer
      ? {
          title: matchedOffer.title,
          source: matchedOffer.source,
          confidence: 'catalog-rule',
        }
      : null,
  };
}
