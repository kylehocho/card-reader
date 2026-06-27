import { topPriorityCards } from '@/lib/cards/top-priority-cards';
import type { AnalysisAccount, AnalysisTransaction } from '@/lib/benefits/types';

type MockWalletProfile = {
  id: string;
  label: string;
  accounts: AnalysisAccount[];
  transactions: AnalysisTransaction[];
};

const merchantByCard: Record<string, Array<{ merchant: string; amount: number; category: string[]; daysAgo: number }>> = {
  'chase-sapphire-reserve': [
    { merchant: 'United Airlines', amount: 286, category: ['Travel', 'Airlines'], daysAgo: 7 },
    { merchant: 'Lyft', amount: 32, category: ['Travel', 'Taxi'], daysAgo: 12 },
    { merchant: 'Global Entry', amount: 120, category: ['Travel', 'Government Services'], daysAgo: 44 },
  ],
  'chase-sapphire-preferred': [
    { merchant: 'Hyatt', amount: 530, category: ['Travel', 'Hotel'], daysAgo: 20 },
    { merchant: 'Sweetgreen', amount: 18, category: ['Food and Drink', 'Restaurants'], daysAgo: 5 },
    { merchant: 'Netflix', amount: 19, category: ['Service', 'Streaming'], daysAgo: 16 },
  ],
  'amex-platinum': [
    { merchant: 'Delta Air Lines', amount: 410, category: ['Travel', 'Airlines'], daysAgo: 11 },
    { merchant: 'Uber', amount: 24, category: ['Travel', 'Taxi'], daysAgo: 3 },
    { merchant: 'Saks Fifth Avenue', amount: 58, category: ['Shops'], daysAgo: 37 },
    { merchant: 'Hulu', amount: 18, category: ['Service', 'Streaming'], daysAgo: 8 },
  ],
  'amex-gold': [
    { merchant: 'Grubhub', amount: 28, category: ['Food and Drink', 'Restaurants'], daysAgo: 4 },
    { merchant: 'Whole Foods Market', amount: 96, category: ['Shops', 'Supermarkets and Groceries'], daysAgo: 9 },
    { merchant: 'Resy Restaurant', amount: 144, category: ['Food and Drink', 'Restaurants'], daysAgo: 25 },
  ],
  'capital-one-venture-x': [
    { merchant: 'Capital One Travel', amount: 242, category: ['Travel', 'Hotel'], daysAgo: 15 },
    { merchant: 'Airbnb', amount: 318, category: ['Travel', 'Lodging'], daysAgo: 22 },
    { merchant: 'Apple', amount: 129, category: ['Shops', 'Electronics'], daysAgo: 31 },
  ],
  'chase-freedom-unlimited': [
    { merchant: 'CVS', amount: 46, category: ['Shops', 'Pharmacies'], daysAgo: 6 },
    { merchant: 'Chipotle', amount: 17, category: ['Food and Drink', 'Restaurants'], daysAgo: 13 },
    { merchant: 'Target', amount: 83, category: ['Shops'], daysAgo: 17 },
  ],
  'chase-freedom-flex': [
    { merchant: 'Shell', amount: 54, category: ['Travel', 'Gas Stations'], daysAgo: 5 },
    { merchant: 'Walgreens', amount: 31, category: ['Shops', 'Pharmacies'], daysAgo: 10 },
    { merchant: 'DoorDash', amount: 42, category: ['Food and Drink', 'Restaurants'], daysAgo: 14 },
  ],
  'citi-strata-premier': [
    { merchant: 'Chevron', amount: 68, category: ['Travel', 'Gas Stations'], daysAgo: 6 },
    { merchant: 'Marriott', amount: 612, category: ['Travel', 'Hotel'], daysAgo: 28 },
    { merchant: 'Trader Joe’s', amount: 74, category: ['Shops', 'Supermarkets and Groceries'], daysAgo: 12 },
  ],
  'bilt-mastercard': [
    { merchant: 'Greystar Rent', amount: 2850, category: ['Payment', 'Rent'], daysAgo: 2 },
    { merchant: 'Cava', amount: 19, category: ['Food and Drink', 'Restaurants'], daysAgo: 18 },
    { merchant: 'Lyft', amount: 26, category: ['Travel', 'Taxi'], daysAgo: 24 },
  ],
  'discover-it-cash-back': [
    { merchant: 'Amazon', amount: 118, category: ['Shops', 'Digital Purchase'], daysAgo: 7 },
    { merchant: 'Costco Gas', amount: 61, category: ['Travel', 'Gas Stations'], daysAgo: 21 },
    { merchant: 'Local Grocery', amount: 87, category: ['Shops', 'Supermarkets and Groceries'], daysAgo: 30 },
  ],
};

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export const topPriorityMockWallet: MockWalletProfile = {
  id: 'top-priority-ten-card-wallet',
  label: 'Top 10 priority card wallet',
  accounts: topPriorityCards.map((card) => ({
    id: `mock-account-${card.id}`,
    account_id: `mock_${card.id}`,
    name: card.name,
    card_product_id: card.id,
  })),
  transactions: topPriorityCards.flatMap((card, cardIndex) =>
    (merchantByCard[card.id] ?? []).map((transaction, transactionIndex) => ({
      id: `mock-transaction-${card.id}-${transactionIndex + 1}`,
      plaid_account_id: `mock-account-${card.id}`,
      account_id: `mock_${card.id}`,
      transaction_id: `mock_${card.id}_${transactionIndex + 1}`,
      name: transaction.merchant,
      merchant_name: transaction.merchant,
      amount: transaction.amount + cardIndex * 3,
      date: dateDaysAgo(transaction.daysAgo),
      category: transaction.category,
      pending: false,
    })),
  ),
};
