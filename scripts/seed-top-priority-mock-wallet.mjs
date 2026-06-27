#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const topPriorityCards = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/top-priority-card-products.json'), 'utf8'));

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  email: process.env.SEED_USER_EMAIL || `card.reader.top10.${Date.now()}@gmail.com`,
  password: process.env.SEED_USER_PASSWORD || 'Test-password-123456',
};

for (const [key, value] of Object.entries(config)) {
  if (!value) throw new Error('Missing required config: ' + key);
}

const merchantByCard = {
  'chase-sapphire-reserve': [
    ['United Airlines', 286, ['Travel', 'Airlines'], 7],
    ['Lyft', 32, ['Travel', 'Taxi'], 12],
    ['Global Entry', 120, ['Travel', 'Government Services'], 44],
  ],
  'chase-sapphire-preferred': [
    ['Hyatt', 530, ['Travel', 'Hotel'], 20],
    ['Sweetgreen', 18, ['Food and Drink', 'Restaurants'], 5],
    ['Netflix', 19, ['Service', 'Streaming'], 16],
  ],
  'amex-platinum': [
    ['Delta Air Lines', 410, ['Travel', 'Airlines'], 11],
    ['Uber', 24, ['Travel', 'Taxi'], 3],
    ['Saks Fifth Avenue', 58, ['Shops'], 37],
    ['Hulu', 18, ['Service', 'Streaming'], 8],
  ],
  'amex-gold': [
    ['Grubhub', 28, ['Food and Drink', 'Restaurants'], 4],
    ['Whole Foods Market', 96, ['Shops', 'Supermarkets and Groceries'], 9],
    ['Resy Restaurant', 144, ['Food and Drink', 'Restaurants'], 25],
  ],
  'capital-one-venture-x': [
    ['Capital One Travel', 242, ['Travel', 'Hotel'], 15],
    ['Airbnb', 318, ['Travel', 'Lodging'], 22],
    ['Apple', 129, ['Shops', 'Electronics'], 31],
  ],
  'chase-freedom-unlimited': [
    ['CVS', 46, ['Shops', 'Pharmacies'], 6],
    ['Chipotle', 17, ['Food and Drink', 'Restaurants'], 13],
    ['Target', 83, ['Shops'], 17],
  ],
  'chase-freedom-flex': [
    ['Shell', 54, ['Travel', 'Gas Stations'], 5],
    ['Walgreens', 31, ['Shops', 'Pharmacies'], 10],
    ['DoorDash', 42, ['Food and Drink', 'Restaurants'], 14],
  ],
  'citi-strata-premier': [
    ['Chevron', 68, ['Travel', 'Gas Stations'], 6],
    ['Marriott', 612, ['Travel', 'Hotel'], 28],
    ['Trader Joes', 74, ['Shops', 'Supermarkets and Groceries'], 12],
  ],
  'bilt-mastercard': [
    ['Greystar Rent', 2850, ['Payment', 'Rent'], 2],
    ['Cava', 19, ['Food and Drink', 'Restaurants'], 18],
    ['Lyft', 26, ['Travel', 'Taxi'], 24],
  ],
  'discover-it-cash-back': [
    ['Amazon', 118, ['Shops', 'Digital Purchase'], 7],
    ['Costco Gas', 61, ['Travel', 'Gas Stations'], 21],
    ['Local Grocery', 87, ['Shops', 'Supermarkets and Groceries'], 30],
  ],
};

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function request(pathname, options = {}) {
  const response = await fetch(config.supabaseUrl + pathname, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: 'Bearer ' + config.serviceRoleKey,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function createUser() {
  const user = await request('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
      email_confirm: true,
    }),
  });

  return user.id;
}

async function upsertRows(table, rows, onConflict) {
  return request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
}

const userId = await createUser();

await upsertRows(
  'profiles',
  [
    {
      id: userId,
      email: config.email,
      first_name: 'Top 10',
      display_name: 'Top 10 Mock Wallet',
      notifications_opt_in: true,
    },
  ],
  'id',
);

await upsertRows(
  'card_products',
  topPriorityCards.map((card) => ({
    id: card.id,
    issuer: card.issuer,
    name: card.name,
    network: card.network,
    product_type: card.product_type,
    is_business: card.is_business,
    annual_fee: card.annual_fee,
    reward_currency: card.reward_currency,
    rewards: card.rewards,
    benefits: card.benefits,
  })),
  'id',
);

const [plaidItem] = await upsertRows(
  'plaid_items',
  [
    {
      user_id: userId,
      item_id: `mock_top_priority_${userId}`,
      institution_id: 'mock_top_priority_bank',
      institution_name: 'Top Priority Mock Bank',
      access_token_encrypted: 'mock-token-not-synced',
      status: 'mock',
    },
  ],
  'user_id,item_id',
);

const accounts = await upsertRows(
  'plaid_accounts',
  topPriorityCards.map((card, index) => ({
    user_id: userId,
    plaid_item_id: plaidItem.id,
    account_id: `mock_${card.id}`,
    name: card.name,
    official_name: card.name,
    mask: String(1100 + index),
    type: 'credit',
    subtype: 'credit card',
    current_balance: 200 + index * 137,
    available_balance: null,
    credit_limit: 10000 + index * 1000,
    iso_currency_code: 'USD',
  })),
  'user_id,account_id',
);

const accountByProductId = new Map(accounts.map((account) => [account.account_id.replace('mock_', ''), account]));

await upsertRows(
  'account_card_matches',
  topPriorityCards.map((card) => ({
    user_id: userId,
    plaid_account_id: accountByProductId.get(card.id).id,
    card_product_id: card.id,
    match_status: 'seeded_mock',
    match_confidence: 1,
  })),
  'user_id,plaid_account_id',
);

const transactions = topPriorityCards.flatMap((card, cardIndex) => {
  const account = accountByProductId.get(card.id);
  return (merchantByCard[card.id] ?? []).map(([merchant, amount, category, daysAgo], transactionIndex) => ({
    user_id: userId,
    plaid_item_id: plaidItem.id,
    plaid_account_id: account.id,
    account_id: account.account_id,
    transaction_id: `mock_${card.id}_${transactionIndex + 1}`,
    name: merchant,
    merchant_name: merchant,
    amount: Number(amount) + cardIndex * 3,
    iso_currency_code: 'USD',
    date: dateDaysAgo(Number(daysAgo)),
    authorized_date: dateDaysAgo(Number(daysAgo) + 1),
    pending: false,
    payment_channel: 'online',
    category,
    category_id: null,
    personal_finance_category: { primary: category[0], detailed: category[1] ?? category[0] },
  }));
});

await upsertRows('plaid_transactions', transactions, 'user_id,transaction_id');

console.log(
  JSON.stringify(
    {
      userId,
      email: config.email,
      password: config.password,
      cardProducts: topPriorityCards.length,
      mockAccounts: accounts.length,
      mockTransactions: transactions.length,
      note: 'Mock Plaid item status is "mock", so /api/plaid/sync-transactions will not call Plaid with the placeholder token.',
    },
    null,
    2,
  ),
);
