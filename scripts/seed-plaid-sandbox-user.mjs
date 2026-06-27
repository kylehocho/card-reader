#!/usr/bin/env node

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  plaidClientId: process.env.PLAID_CLIENT_ID,
  plaidSecret: process.env.PLAID_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || 'https://card-reader-xi.vercel.app',
  email: process.env.SEED_USER_EMAIL || ('card.reader.seed.' + Date.now() + '@gmail.com'),
  password: process.env.SEED_USER_PASSWORD || 'Test-password-123456',
  institutionId: process.env.PLAID_SANDBOX_INSTITUTION_ID || 'ins_109508',
  institutionName: process.env.PLAID_SANDBOX_INSTITUTION_NAME || 'First Platypus Bank',
  cardProductId: process.env.SEED_CARD_PRODUCT_ID || 'chase-sapphire-reserve',
  cleanup: process.env.SEED_CLEANUP === 'true',
};

for (const [key, value] of Object.entries(config)) {
  if (!value && key !== 'cleanup') {
    throw new Error('Missing required config: ' + key);
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error((options?.method || 'GET') + ' ' + url + ' failed: ' + response.status + ' ' + JSON.stringify(body));
  }

  return body;
}

async function createUser() {
  const body = await request(config.supabaseUrl + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: 'Bearer ' + config.serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
      email_confirm: true,
    }),
  });

  return body.id;
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

async function exchangePublicToken(accessToken, publicToken) {
  return request(config.appBaseUrl + '/api/plaid/exchange-token', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publicToken,
      institutionId: config.institutionId,
      institutionName: config.institutionName,
    }),
  });
}

async function syncTransactions(accessToken) {
  return request(config.appBaseUrl + '/api/plaid/sync-transactions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days: 90 }),
  });
}

async function matchFirstCreditAccount(userId) {
  const accounts = await request(
    config.supabaseUrl + '/rest/v1/plaid_accounts?select=id,name,type,subtype,mask&user_id=eq.' + userId + '&or=(type.eq.credit,subtype.eq.credit%20card)&limit=1',
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: 'Bearer ' + config.serviceRoleKey,
      },
    },
  );

  const account = accounts[0];
  if (!account) return null;

  const matches = await request(config.supabaseUrl + '/rest/v1/account_card_matches', {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: 'Bearer ' + config.serviceRoleKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      plaid_account_id: account.id,
      card_product_id: config.cardProductId,
      match_status: 'seeded',
      match_confidence: 0.8,
    }),
  });

  return { account, match: matches[0] };
}

async function deleteUser(userId) {
  await request(config.supabaseUrl + '/auth/v1/admin/users/' + userId, {
    method: 'DELETE',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: 'Bearer ' + config.serviceRoleKey,
    },
  });
}

const userId = await createUser();
const accessToken = await signIn();
const publicToken = await createPlaidPublicToken();
const exchange = await exchangePublicToken(accessToken, publicToken);
const transactions = await syncTransactions(accessToken);
const match = await matchFirstCreditAccount(userId);

if (config.cleanup) {
  await deleteUser(userId);
}

console.log(
  JSON.stringify(
    {
      userId,
      email: config.email,
      appBaseUrl: config.appBaseUrl,
      plaidItemId: exchange.savedItemId,
      returnedAccounts: exchange.accounts?.length || null,
      savedAccounts: exchange.savedAccounts?.length || null,
      syncedTransactions: transactions.totalSaved,
      matchedAccount: match?.account || null,
      match: match?.match || null,
      cleanup: config.cleanup,
    },
    null,
    2,
  ),
);
