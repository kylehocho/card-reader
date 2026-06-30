#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const topPriorityCards = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/top-priority-card-products.json'), 'utf8'));

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

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  plaidClientId: process.env.PLAID_CLIENT_ID,
  plaidSecret: process.env.PLAID_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || 'https://card-reader-xi.vercel.app',
  email: process.env.SEED_USER_EMAIL || `card.reader.top10.sandbox.${Date.now()}@gmail.com`,
  password: process.env.SEED_USER_PASSWORD || 'Test-password-123456',
  institutionId: process.env.PLAID_SANDBOX_INSTITUTION_ID || 'ins_109508',
  institutionName: process.env.PLAID_SANDBOX_INSTITUTION_NAME || 'First Platypus Bank',
  syncTransactions: process.env.SEED_SYNC_TRANSACTIONS !== 'false',
};

for (const [key, value] of Object.entries(config)) {
  if (!value && key !== 'syncTransactions') throw new Error('Missing required config: ' + key);
}

function cleanEnv(value) {
  return String(value ?? '').trim().replace(/^"|"$/g, '').replace(/\\n$/g, '').trim();
}

for (const key of Object.keys(config)) {
  config[key] = typeof config[key] === 'string' ? cleanEnv(config[key]) : config[key];
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: 'Bearer ' + config.serviceRoleKey,
    ...extraHeaders,
  };
}

async function supabaseRequest(pathname, options = {}) {
  return request(config.supabaseUrl + pathname, {
    ...options,
    headers: supabaseHeaders(options.headers ?? {}),
  });
}

async function createUser() {
  const user = await supabaseRequest('/auth/v1/admin/users', {
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

async function signIn() {
  const body = await request(config.supabaseUrl + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
    }),
  });

  return body.access_token;
}

async function upsertRows(table, rows, onConflict) {
  return supabaseRequest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
}

async function createPlaidPublicToken() {
  const body = await request('https://sandbox.plaid.com/sandbox/public_token/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.plaidClientId,
      secret: config.plaidSecret,
      institution_id: config.institutionId,
      initial_products: ['liabilities', 'transactions'],
    }),
  });

  return body.public_token;
}

async function exchangePublicToken(accessToken, publicToken, card) {
  return request(config.appBaseUrl + '/api/plaid/exchange-token', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publicToken,
      institutionId: config.institutionId,
      institutionName: `${card.name} Sandbox`,
    }),
  });
}

async function syncTransactions(accessToken, plaidItemId) {
  return request(config.appBaseUrl + '/api/plaid/sync-transactions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days: 90, plaidItemId }),
  });
}

async function patchRow(table, id, patch) {
  const rows = await supabaseRequest(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });

  return rows[0] ?? null;
}

async function deleteRowsByIds(table, ids) {
  if (ids.length === 0) return [];

  return supabaseRequest(`/rest/v1/${table}?id=in.(${ids.map(encodeURIComponent).join(',')})`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
}

async function deleteNonSelectedTransactions(plaidItemId, selectedAccountId) {
  await supabaseRequest(
    `/rest/v1/plaid_transactions?plaid_item_id=eq.${encodeURIComponent(plaidItemId)}&or=(plaid_account_id.is.null,account_id.neq.${encodeURIComponent(selectedAccountId)})`,
    { method: 'DELETE' },
  );
}

function pickCreditAccount(savedAccounts, index) {
  const creditAccounts = savedAccounts.filter((account) => account.type === 'credit' || account.subtype === 'credit card');
  return creditAccounts[index % creditAccounts.length] ?? savedAccounts[0] ?? null;
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function seedFallbackTransactions({ card, cardIndex, plaidItemId, account }) {
  const rows = (merchantByCard[card.id] ?? []).map(([merchant, amount, category, daysAgo], transactionIndex) => ({
    user_id: account.user_id,
    plaid_item_id: plaidItemId,
    plaid_account_id: account.id,
    account_id: account.account_id,
    transaction_id: `sandbox_${card.id}_${account.id}_${transactionIndex + 1}`,
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

  if (rows.length === 0) return 0;

  const saved = await upsertRows('plaid_transactions', rows, 'user_id,transaction_id');
  return saved.length;
}

const userId = await createUser();
const accessToken = await signIn();

await upsertRows(
  'profiles',
  [
    {
      id: userId,
      email: config.email,
      first_name: 'Top 10',
      display_name: 'Top 10 Plaid Sandbox',
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

const seeded = [];

for (const [index, card] of topPriorityCards.entries()) {
  const publicToken = await createPlaidPublicToken();
  const exchange = await exchangePublicToken(accessToken, publicToken, card);
  const selectedAccount = pickCreditAccount(exchange.savedAccounts ?? [], index);

  if (!selectedAccount) {
    throw new Error(`No saved Plaid account returned for ${card.name}.`);
  }

  const otherAccounts = (exchange.savedAccounts ?? []).filter((account) => account.id !== selectedAccount.id);
  await deleteRowsByIds('plaid_accounts', otherAccounts.map((account) => account.id));

  const itemLabel = `${card.name} Sandbox`;
  await patchRow('plaid_items', exchange.savedItemId, {
    institution_name: itemLabel,
    institution_id: config.institutionId,
  });
  const renamedAccount = await patchRow('plaid_accounts', selectedAccount.id, {
    name: card.name,
    official_name: `${card.name} (${config.institutionName})`,
    mask: String(9100 + index),
    subtype: 'credit card',
  });

  const [match] = await upsertRows(
    'account_card_matches',
    [
      {
        user_id: userId,
        plaid_account_id: selectedAccount.id,
        card_product_id: card.id,
        match_status: 'seeded_sandbox',
        match_confidence: 1,
      },
    ],
    'user_id,plaid_account_id',
  );

  let transactionResult = null;
  if (config.syncTransactions) {
    try {
      transactionResult = await syncTransactions(accessToken, exchange.savedItemId);
      await deleteNonSelectedTransactions(exchange.savedItemId, renamedAccount.account_id);
    } catch (error) {
      const fallbackSaved = await seedFallbackTransactions({
        card,
        cardIndex: index,
        plaidItemId: exchange.savedItemId,
        account: renamedAccount,
      });
      transactionResult = {
        totalSaved: fallbackSaved,
        warning: error instanceof Error ? error.message : 'Transaction sync failed.',
      };
    }
  }

  seeded.push({
    cardProductId: card.id,
    cardName: card.name,
    plaidItemId: exchange.savedItemId,
    plaidAccountId: selectedAccount.id,
    accountName: renamedAccount.name,
    syncedTransactions: transactionResult?.totalSaved ?? 0,
    syncWarning: transactionResult?.warning ?? null,
    matchStatus: match.match_status,
  });
}

console.log(
  JSON.stringify(
    {
      userId,
      email: config.email,
      password: config.password,
      appBaseUrl: config.appBaseUrl,
      activePlaidItems: seeded.length,
      activePlaidAccounts: seeded.length,
      seeded,
    },
    null,
    2,
  ),
);
