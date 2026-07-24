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
  appBaseUrl: (process.env.APP_BASE_URL || 'https://card-reader-xi.vercel.app').replace(/\/$/, ''),
  email: process.env.SMOKE_USER_EMAIL || `card.reader.manual.smoke.${Date.now()}@example.com`,
  password: process.env.SMOKE_USER_PASSWORD || `Test-password-${Date.now()}!`,
  cardProductId: process.env.SMOKE_CARD_PRODUCT_ID || 'amex-gold',
  last4: process.env.SMOKE_CARD_LAST4 || '3007',
  merchant: process.env.SMOKE_MERCHANT || 'Whole Foods',
  cleanup: process.env.SMOKE_KEEP_USER !== 'true',
};

for (const [key, value] of Object.entries(config)) {
  if (!value && key !== 'cleanup') {
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expectedFragment, label) {
  if (!String(value ?? '').includes(expectedFragment)) {
    throw new Error(`${label} expected to include ${JSON.stringify(expectedFragment)} but received ${JSON.stringify(value)}`);
  }
}

let userId = null;
let cleanupStatus = 'not-started';

try {
  userId = await createUser();
  const accessToken = await signIn();

  const manualCard = await appRequest('/api/wallet/manual-cards', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      cardProductId: config.cardProductId,
      last4: config.last4,
      label: 'Smoke test Amex Gold',
    }),
  });

  assertEqual(manualCard.product?.id, config.cardProductId, 'manual card product id');
  assertEqual(manualCard.account?.mask, config.last4, 'manual card last four');
  assertEqual(manualCard.match?.card_product_id, config.cardProductId, 'manual card match product id');
  assertEqual(manualCard.match?.match_status, 'manual', 'manual card match status');

  const analysis = await appRequest('/api/wallet/analysis', accessToken);
  assertEqual(analysis.meta?.linkedAccounts, 1, 'wallet analysis linked account count');
  assertEqual(analysis.meta?.matchedAccounts, 1, 'wallet analysis matched account count');

  const sync = await appRequest('/api/plaid/sync-transactions', accessToken, {
    method: 'POST',
    body: JSON.stringify({ days: 30 }),
  });
  assertEqual(sync.itemCount, 0, 'manual-only sync item count');
  assertEqual(sync.totalSaved, 0, 'manual-only sync saved transaction count');

  const recommendation = await appRequest('/api/recommend-card', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      merchant: config.merchant,
      host: 'wholefoodsmarket.com',
      url: 'https://www.wholefoodsmarket.com/',
      title: `${config.merchant} smoke test`,
      categoryHint: 'grocery',
    }),
  });
  assertEqual(recommendation.bestCard?.id, config.cardProductId, 'signed-in recommendation best card id');
  assertIncludes(recommendation.bestCard?.name, 'Gold', 'signed-in recommendation best card name');

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
        manualCard: {
          accountId: manualCard.account?.id,
          accountKey: manualCard.account?.account_id,
          productId: manualCard.product?.id,
          matchStatus: manualCard.match?.match_status,
        },
        analysis: {
          linkedAccounts: analysis.meta?.linkedAccounts,
          matchedAccounts: analysis.meta?.matchedAccounts,
          transactions: analysis.meta?.transactions,
        },
        manualOnlySync: {
          itemCount: sync.itemCount,
          totalSaved: sync.totalSaved,
        },
        recommendation: {
          merchant: recommendation.merchant,
          category: recommendation.category,
          bestCardId: recommendation.bestCard?.id,
          bestCardName: recommendation.bestCard?.name,
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
