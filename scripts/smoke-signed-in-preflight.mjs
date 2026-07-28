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
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''),
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  plaidClientId: process.env.PLAID_CLIENT_ID,
  plaidSecret: process.env.PLAID_SECRET,
  appBaseUrl: (process.env.APP_BASE_URL || 'https://card-reader-xi.vercel.app').replace(/\/$/, ''),
  skipPlaid: process.env.SMOKE_PREFLIGHT_SKIP_PLAID === 'true',
};

const requiredConfig = ['supabaseUrl', 'anonKey', 'serviceRoleKey'];
if (!config.skipPlaid) {
  requiredConfig.push('plaidClientId', 'plaidSecret');
}

const missingConfig = requiredConfig.filter((key) => !config[key]);
if (missingConfig.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: 'config',
        missingConfig,
        hint: 'Load .env.local, .env, or .env.vercel.production.local with the required smoke credentials.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

async function requestJson(label, url, options = {}, expectedStatus) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }

  const acceptableStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus ?? 200];
  if (!acceptableStatuses.includes(response.status)) {
    throw new Error(`${label} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return { status: response.status, body };
}

async function checkHomepage() {
  const response = await fetch(config.appBaseUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`homepage failed: ${response.status}`);
  }
  return { status: response.status };
}

async function checkSupabaseAdmin() {
  const result = await requestJson(
    'Supabase admin credential',
    `${config.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    },
  );

  return {
    status: result.status,
    visibleUsers: Array.isArray(result.body?.users) ? result.body.users.length : null,
  };
}

async function checkSupabaseAnon() {
  const result = await requestJson(
    'Supabase anon credential',
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'card.reader.preflight.invalid@example.invalid',
        password: 'not-a-real-password',
      }),
    },
    [400],
  );

  const message = JSON.stringify(result.body ?? {});
  if (/invalid api key/i.test(message) || /jwt/i.test(message)) {
    throw new Error(`Supabase anon credential rejected: ${message}`);
  }

  return { status: result.status, expectedRejectedLogin: true };
}

async function checkPlaidSandbox() {
  if (config.skipPlaid) {
    return { skipped: true };
  }

  const result = await requestJson('Plaid sandbox credential', 'https://sandbox.plaid.com/categories/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.plaidClientId,
      secret: config.plaidSecret,
    }),
  });

  return {
    status: result.status,
    categories: Array.isArray(result.body?.categories) ? result.body.categories.length : null,
  };
}

const checks = [
  ['homepage', checkHomepage],
  ['supabaseAdmin', checkSupabaseAdmin],
  ['supabaseAnon', checkSupabaseAnon],
  ['plaidSandbox', checkPlaidSandbox],
];

const results = {};

for (const [name, check] of checks) {
  try {
    results[name] = await check();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify(
        {
          ok: false,
          appBaseUrl: config.appBaseUrl,
          supabaseUrl: config.supabaseUrl,
          failedCheck: name,
          completedChecks: results,
          error: message,
          hint:
            name === 'supabaseAdmin'
              ? 'Refresh SUPABASE_SERVICE_ROLE_KEY locally before running signed-in smoke commands.'
              : 'Fix the failed dependency, then rerun npm run smoke:signed-in-preflight.',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      appBaseUrl: config.appBaseUrl,
      supabaseUrl: config.supabaseUrl,
      checks: results,
      next: 'Run npm run smoke:signed-in-manual-card and npm run smoke:signed-in-plaid-card-match.',
    },
    null,
    2,
  ),
);
