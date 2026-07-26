#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile(filename) {
  const filePath = path.join(repoRoot, filename);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');
loadEnvFile('.env.vercel.production.local');

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  plaidClientId: process.env.PLAID_CLIENT_ID,
  plaidSecret: process.env.PLAID_SECRET,
  appBaseUrl: (process.env.APP_BASE_URL || 'https://card-reader-xi.vercel.app').replace(/\/$/, ''),
  email: process.env.SMOKE_USER_EMAIL || `card.reader.plaid.smoke.${Date.now()}@example.com`,
  password: process.env.SMOKE_USER_PASSWORD || `Test-password-${Date.now()}!`,
  institutionId: process.env.PLAID_SANDBOX_INSTITUTION_ID || 'ins_109508',
  institutionName: process.env.PLAID_SANDBOX_INSTITUTION_NAME || 'First Platypus Bank',
  cardProductId: process.env.SMOKE_CARD_PRODUCT_ID || 'chase-sapphire-reserve',
  matchStatus: process.env.SMOKE_MATCH_STATUS || 'suggested',
  matchConfidence: Number(process.env.SMOKE_MATCH_CONFIDENCE ?? 0.82),
  syncDays: Number(process.env.SMOKE_SYNC_DAYS ?? 90),
  cleanup: process.env.SMOKE_KEEP_USER !== 'true',
};

for (const [key, value] of Object.entries(config)) {
  if ((value === undefined || value === null || value === '') && key !== 'cleanup') {
    throw new Error(`Missing required config: ${key}`);
  }
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

function adminHeaders(extraHeaders = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extraHeaders,
  };
}

async function supabaseAdminRequest(pathname, options = {}) {
  return request(`${config.supabaseUrl}${pathname}`, {
    ...options,
    headers: adminHeaders(options.headers ?? {}),
  });
}

async function createUser() {
  const user = await supabaseAdminRequest('/auth/v1/admin/users', {
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
  const body = await request(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
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

async function deleteUser(userId) {
  await supabaseAdminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
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

async function appRequest(pathname, accessToken, options = {}) {
  return request(`${config.appBaseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
}

function firstCreditAccount(accounts) {
  return accounts?.find((account) => account.type === 'credit' && account.subtype === 'credit card') ?? accounts?.[0] ?? null;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

function assertAtLeast(actual, minimum, label) {
  if (typeof actual !== 'number' || actual < minimum) {
    throw new Error(`${label} expected at least ${minimum} but received ${JSON.stringify(actual)}`);
  }
}

let userId = null;
let cleanupStatus = 'not-started';

try {
  userId = await createUser();
  const accessToken = await signIn();
  const publicToken = await createPlaidPublicToken();

  const exchange = await appRequest('/api/plaid/exchange-token', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      publicToken,
      institutionId: config.institutionId,
      institutionName: config.institutionName,
    }),
  });

  assertAtLeast(exchange.importedAccounts, 1, 'Plaid imported account count');
  const accountToMatch = firstCreditAccount(exchange.savedAccounts);
  if (!accountToMatch?.id) {
    throw new Error('Plaid exchange did not return a saved credit-card account id.');
  }

  const cardMatch = await appRequest('/api/wallet/card-matches', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      plaidAccountId: accountToMatch.id,
      cardProductId: config.cardProductId,
      matchStatus: config.matchStatus,
      matchConfidence: config.matchConfidence,
    }),
  });

  assertEqual(cardMatch.account?.id, accountToMatch.id, 'card-match account id');
  assertEqual(cardMatch.match?.card_product_id, config.cardProductId, 'card-match product id');
  assertEqual(cardMatch.match?.match_status, config.matchStatus === 'suggested' ? 'suggested' : 'manual', 'card-match status');

  const sync = await appRequest('/api/plaid/sync-transactions', accessToken, {
    method: 'POST',
    body: JSON.stringify({ days: config.syncDays, plaidItemId: exchange.savedItemId }),
  });
  assertAtLeast(sync.itemCount, 1, 'Plaid sync item count');

  const analysis = await appRequest('/api/wallet/analysis', accessToken);
  assertAtLeast(analysis.meta?.linkedAccounts, 1, 'wallet analysis linked account count');
  assertAtLeast(analysis.meta?.matchedAccounts, 1, 'wallet analysis matched account count');

  if (config.cleanup) {
    await deleteUser(userId);
    cleanupStatus = 'deleted';
  } else {
    cleanupStatus = 'kept';
  }

  console.log(
    JSON.stringify(
      {
        appBaseUrl: config.appBaseUrl,
        userId,
        email: config.email,
        institution: {
          id: config.institutionId,
          name: config.institutionName,
        },
        plaidExchange: {
          savedItemId: exchange.savedItemId,
          importedAccounts: exchange.importedAccounts,
          skippedAccounts: exchange.skippedAccounts,
          skippedDuplicateAccounts: exchange.skippedDuplicateAccounts,
        },
        cardMatch: {
          accountId: cardMatch.account?.id,
          accountKey: cardMatch.account?.account_id,
          productId: cardMatch.product?.id,
          productName: cardMatch.product?.name,
          matchStatus: cardMatch.match?.match_status,
          matchConfidence: cardMatch.match?.match_confidence,
        },
        transactionSync: {
          itemCount: sync.itemCount,
          totalSaved: sync.totalSaved,
        },
        analysis: {
          linkedAccounts: analysis.meta?.linkedAccounts,
          matchedAccounts: analysis.meta?.matchedAccounts,
          transactions: analysis.meta?.transactions,
        },
        cleanup: cleanupStatus,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (userId && config.cleanup) {
    try {
      await deleteUser(userId);
      cleanupStatus = 'deleted-after-failure';
    } catch (cleanupError) {
      cleanupStatus = `failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        appBaseUrl: config.appBaseUrl,
        userId,
        email: config.email,
        cleanup: cleanupStatus,
        error: message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
