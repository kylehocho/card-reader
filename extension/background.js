const DEFAULT_API_BASE_URL = 'https://card-reader-xi.vercel.app';
const MERCHANT_DOMAIN_HINTS = {
  'patagonia.com': { merchant: 'Patagonia', categoryHint: 'shopping' },
  'amazon.com': { merchant: 'Amazon', categoryHint: 'shopping' },
  'delta.com': { merchant: 'Delta Air Lines', categoryHint: 'flights' },
  'united.com': { merchant: 'United Airlines', categoryHint: 'flights' },
  'aa.com': { merchant: 'American Airlines', categoryHint: 'flights' },
  'airbnb.com': { merchant: 'Airbnb', categoryHint: 'travel' },
  'hyatt.com': { merchant: 'Hyatt', categoryHint: 'hotel' },
  'marriott.com': { merchant: 'Marriott', categoryHint: 'hotel' },
  'hilton.com': { merchant: 'Hilton', categoryHint: 'hotel' },
  'wholefoodsmarket.com': { merchant: 'Whole Foods', categoryHint: 'groceries' },
  'uber.com': { merchant: 'Uber', categoryHint: 'travel' },
  'ubereats.com': { merchant: 'Uber Eats', categoryHint: 'dining' }
};
const DEMO_CARD_IDS = [
  'chase-sapphire-reserve',
  'chase-sapphire-preferred',
  'amex-platinum',
  'amex-gold',
  'capital-one-venture-x',
  'chase-freedom-unlimited',
  'chase-freedom-flex',
  'citi-strata-premier',
  'bilt-mastercard',
  'discover-it-cash-back'
];

function cleanHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function hintForHost(host) {
  return MERCHANT_DOMAIN_HINTS[host] || Object.entries(MERCHANT_DOMAIN_HINTS).find(([domain]) => host.endsWith(`.${domain}`))?.[1] || null;
}

function contextFromTab(tab) {
  const host = cleanHost(tab.url || '');
  if (!host) return null;

  const hint = hintForHost(host);
  const title = tab.title || host;
  const merchant = hint?.merchant || title.split(/[|–-]/)[0]?.trim() || host;

  return {
    merchant,
    title,
    url: tab.url,
    host,
    categoryHint: hint?.categoryHint || ''
  };
}

async function apiBaseUrl() {
  const stored = await chrome.storage.sync.get(['apiBaseUrl']);
  return stored.apiBaseUrl || DEFAULT_API_BASE_URL;
}

async function recommend(context) {
  const baseUrl = await apiBaseUrl();
  const response = await fetch(`${baseUrl}/api/recommend-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...context,
      cardProductIds: DEMO_CARD_IDS
    })
  });

  if (!response.ok) {
    throw new Error(`Recommendation failed: ${response.status}`);
  }

  return response.json();
}

async function refreshRecommendation(tabId, context) {
  try {
    const recommendation = await recommend(context);
    await chrome.storage.session.set({
      currentContext: context,
      currentRecommendation: recommendation,
      currentError: null
    });
    await chrome.action.setBadgeText({ tabId, text: `${recommendation.bestCard.multiplier}x` });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#111827' });
  } catch (error) {
    await chrome.storage.session.set({
      currentContext: context,
      currentRecommendation: null,
      currentError: error instanceof Error ? error.message : 'Recommendation failed'
    });
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#b91c1c' });
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'CARD_READER_CONTEXT_CHANGED' || !sender.tab?.id) return;
  void refreshRecommendation(sender.tab.id, message.context);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const context = await chrome.tabs.sendMessage(tabId, { type: 'CARD_READER_GET_CONTEXT' });
    await refreshRecommendation(tabId, context);
  } catch {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const fallbackContext = tab ? contextFromTab(tab) : null;
    if (fallbackContext) {
      await refreshRecommendation(tabId, fallbackContext);
      return;
    }
    await chrome.action.setBadgeText({ tabId, text: '' });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  chrome.tabs.sendMessage(tabId, { type: 'CARD_READER_GET_CONTEXT' }, (context) => {
    if (chrome.runtime.lastError || !context) {
      const fallbackContext = contextFromTab(tab);
      if (fallbackContext) void refreshRecommendation(tabId, fallbackContext);
      return;
    }
    void refreshRecommendation(tabId, context);
  });
});
