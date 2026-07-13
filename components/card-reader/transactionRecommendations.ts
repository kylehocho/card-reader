'use client';

import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import { formatTransactionAmount, formatTransactionDate, type CardProductRow, type PlaidTransactionRow } from '@/components/card-reader/usePersistedPlaidData';
import type { RewardCategory } from '@/lib/benefits/types';
import { formatWalletAnalysisCurrency, type TransactionRecommendationView } from '@/lib/benefits/wallet-analysis-view';

export function readableRewardCategory(category: RewardCategory) {
  switch (category) {
    case 'dining':
      return 'Dining';
    case 'travel':
      return 'Travel';
    case 'groceries':
      return 'Groceries';
    case 'flights':
      return 'Flights';
    case 'hotel':
      return 'Hotels';
    case 'gas':
      return 'Gas';
    case 'drugstore':
      return 'Drugstores';
    case 'rent':
      return 'Rent';
    case 'streaming':
      return 'Streaming';
    case 'capital_one_travel':
      return 'Capital One Travel';
    case 'rotating_quarterly':
      return 'Rotating category';
    case 'general':
      return 'General spend';
  }
}

export function dedupeTransactionRecommendations(items: TransactionRecommendationView[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = [item.merchant, item.category, item.currentCard, item.bestCard].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRewardMap(value: unknown): value is Record<string, number> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function rewardMultiplier(product: CardProductRow, category: RewardCategory) {
  const rewards = isRewardMap(product.rewards) ? product.rewards : {};
  const aliases: Record<RewardCategory, string[]> = {
    dining: ['dining', 'restaurants'],
    travel: ['travel', 'capital_one_travel_hotels', 'capital_one_travel_flights'],
    groceries: ['groceries', 'us_supermarkets'],
    flights: ['flights', 'travel', 'capital_one_travel_flights'],
    hotel: ['hotel', 'hotels', 'capital_one_travel_hotels'],
    gas: ['gas', 'ev_charging'],
    drugstore: ['drugstore'],
    rent: ['rent'],
    streaming: ['streaming'],
    capital_one_travel: ['capital_one_travel', 'capital_one_travel_hotels', 'capital_one_travel_flights'],
    rotating_quarterly: ['rotating_quarterly'],
    general: ['general'],
  };

  return Math.max(...aliases[category].map((key) => (typeof rewards[key] === 'number' ? rewards[key] : 0)), 1);
}

export function inferRewardCategory(transaction: PlaidTransactionRow): RewardCategory {
  const personalFinanceCategory = transaction.personal_finance_category;
  const personalFinanceText =
    personalFinanceCategory && typeof personalFinanceCategory === 'object' && !Array.isArray(personalFinanceCategory)
      ? Object.values(personalFinanceCategory).join(' ')
      : '';
  const text = [transaction.merchant_name, transaction.name, transaction.category.join(' '), personalFinanceText].filter(Boolean).join(' ').toLowerCase();

  if (/grocery|supermarket|whole foods|market|trader joe|kroger|safeway/.test(text)) return 'groceries';
  if (/restaurant|dining|coffee|cafe|chipotle|doordash|uber eats|bar|food/.test(text)) return 'dining';
  if (/airline|united|delta|american airlines|southwest|flight|airfare/.test(text)) return 'flights';
  if (/hotel|travel|airbnb|uber|lyft|taxi|train|rental car/.test(text)) return 'travel';
  return 'general';
}

export function deriveLocalTransactionRecommendations({
  plaidTransactions,
  cardProducts,
  plaidAccounts,
  limit = 5,
}: {
  plaidTransactions: PlaidTransactionRow[];
  cardProducts: CardProductRow[];
  plaidAccounts: PlaidConnectedAccount[];
  limit?: number;
}): TransactionRecommendationView[] {
  if (plaidTransactions.length === 0 || cardProducts.length === 0) return [];

  const productById = new Map(cardProducts.map((product) => [product.id, product]));
  const accountByDbId = new Map(plaidAccounts.filter((account) => account.dbId).map((account) => [account.dbId as string, account]));

  return plaidTransactions
    .filter((transaction) => transaction.amount > 0 && !transaction.pending)
    .map((transaction) => {
      const category = inferRewardCategory(transaction);
      const account = transaction.plaid_account_id ? accountByDbId.get(transaction.plaid_account_id) : null;
      const currentProduct = account?.cardProductId ? productById.get(account.cardProductId) : null;
      const currentMultiplier = currentProduct ? rewardMultiplier(currentProduct, category) : 1;
      const bestProduct = [...cardProducts].sort((a, b) => rewardMultiplier(b, category) - rewardMultiplier(a, category))[0];
      const bestMultiplier = bestProduct ? rewardMultiplier(bestProduct, category) : 1;
      const merchant = transaction.merchant_name ?? transaction.name;
      const estimatedLift = Math.max(transaction.amount * (bestMultiplier - currentMultiplier) * 0.01, 0);

      return {
        id: transaction.id,
        merchant,
        amount: formatTransactionAmount(transaction.amount),
        date: formatTransactionDate(transaction.date),
        category,
        currentCard: currentProduct?.name ?? account?.cardProductName ?? 'Unmatched card',
        currentMultiplier,
        bestCard: bestProduct?.name ?? 'Best available card',
        bestMultiplier,
        estimatedLift: formatWalletAnalysisCurrency(estimatedLift),
        reason:
          bestMultiplier > currentMultiplier
            ? readableRewardCategory(category) + ' spend earns ' + bestMultiplier + 'x on ' + (bestProduct?.name ?? 'the best card') + ', versus ' + currentMultiplier + 'x on the matched card.'
            : readableRewardCategory(category) + ' spend is already aligned with the strongest known card rule.',
      };
    })
    .filter((recommendation) => recommendation.bestMultiplier > recommendation.currentMultiplier)
    .slice(0, limit);
}
