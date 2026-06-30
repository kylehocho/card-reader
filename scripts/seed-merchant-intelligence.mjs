#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const merchants = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/merchant-catalog.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/top-priority-card-products.json'), 'utf8'));

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

for (const [key, value] of Object.entries(config)) {
  if (!value) throw new Error('Missing required config: ' + key);
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

async function upsertRows(table, rows, onConflict) {
  if (rows.length === 0) return [];

  return request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
}

function rewardRulesFor(card) {
  return Object.entries(card.rewards ?? {}).map(([rewardCategory, multiplier]) => ({
    id: `${card.id}-${rewardCategory}`.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase(),
    card_product_id: card.id,
    reward_category: rewardCategory,
    multiplier,
    merchant_id: null,
    requires_portal: rewardCategory.includes('travel') && rewardCategory.includes('capital_one'),
    source: 'top_priority_card_products_json',
  }));
}

const merchantRows = merchants.map((merchant) => ({
  id: merchant.id,
  name: merchant.name,
  domains: merchant.domains ?? [],
  aliases: merchant.aliases ?? [],
  reward_category: merchant.category,
  mcc_codes: [],
  is_active: true,
  source: 'merchant_catalog_json',
}));

const offerRows = merchants.flatMap((merchant) =>
  (merchant.offers ?? []).map((offer) => ({
    id: offer.id,
    merchant_id: merchant.id,
    title: offer.title,
    issuer: null,
    eligible_card_product_ids: offer.eligible_card_product_ids ?? [],
    enrollment_required: /enrollment/i.test(offer.title),
    activation_required: /activation/i.test(offer.title),
    starts_at: null,
    ends_at: null,
    confidence: 'catalog-rule',
    source: offer.source ?? 'merchant_catalog_json',
  })),
);

const rewardRows = cards.flatMap(rewardRulesFor);

await upsertRows('merchant_catalog', merchantRows, 'id');
await upsertRows('merchant_offer_rules', offerRows, 'id');
await upsertRows('card_reward_rules', rewardRows, 'id');

console.log(
  JSON.stringify(
    {
      merchantCatalogRows: merchantRows.length,
      merchantOfferRuleRows: offerRows.length,
      cardRewardRuleRows: rewardRows.length,
    },
    null,
    2,
  ),
);
