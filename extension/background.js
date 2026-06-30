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

async function extensionSettings() {
  const [syncStored, localStored] = await Promise.all([chrome.storage.sync.get(['apiBaseUrl']), chrome.storage.local.get(['authToken'])]);
  return {
    apiBaseUrl: syncStored.apiBaseUrl || DEFAULT_API_BASE_URL,
    authToken: typeof localStored.authToken === 'string' ? localStored.authToken.trim() : ''
  };
}

function cleanApiBaseUrl(value) {
  if (typeof value !== 'string') return DEFAULT_API_BASE_URL;

  const trimmedValue = value.trim().replace(/\/$/, '');
  if (trimmedValue === 'https://card-reader-xi.vercel.app' || trimmedValue === 'http://localhost:3000') return trimmedValue;
  return DEFAULT_API_BASE_URL;
}

async function saveAuthToken(message) {
  const authToken = typeof message.authToken === 'string' ? message.authToken.trim() : '';
  if (!authToken) throw new Error('No signed-in session token was provided.');

  const apiBaseUrl = cleanApiBaseUrl(message.apiBaseUrl);
  const authExpiresAt = typeof message.authExpiresAt === 'number' ? message.authExpiresAt : null;
  const userEmail = typeof message.userEmail === 'string' ? message.userEmail : null;

  await Promise.all([
    chrome.storage.sync.set({ apiBaseUrl }),
    chrome.storage.local.set({
      authToken,
      authExpiresAt,
      authUserEmail: userEmail
    })
  ]);
}

async function recommend(context) {
  const settings = await extensionSettings();
  const headers = { 'Content-Type': 'application/json' };
  if (settings.authToken) headers.Authorization = `Bearer ${settings.authToken}`;

  const response = await fetch(`${settings.apiBaseUrl}/api/recommend-card`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...context,
      ...(settings.authToken ? {} : { cardProductIds: DEMO_CARD_IDS })
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

async function contextFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab is available.');

  try {
    const context = await chrome.tabs.sendMessage(tab.id, { type: 'CARD_READER_GET_CONTEXT' });
    if (context) return { tabId: tab.id, context };
  } catch {
    // Fall back to URL/title context below when the content script is unavailable.
  }

  const fallbackContext = contextFromTab(tab);
  if (!fallbackContext) throw new Error('This tab does not expose a merchant URL yet.');

  return { tabId: tab.id, context: fallbackContext };
}

async function refreshActiveTabRecommendation() {
  const { tabId, context } = await contextFromActiveTab();

  try {
    const recommendation = await recommend(context);
    await chrome.storage.session.set({
      currentContext: context,
      currentRecommendation: recommendation,
      currentError: null
    });
    await chrome.action.setBadgeText({ tabId, text: `${recommendation.bestCard.multiplier}x` });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#111827' });

    return { context, recommendation };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recommendation failed';
    await chrome.storage.session.set({
      currentContext: context,
      currentRecommendation: null,
      currentError: message
    });
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#b91c1c' });
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CARD_READER_CONTEXT_CHANGED' && sender.tab?.id) {
    void refreshRecommendation(sender.tab.id, message.context);
    return false;
  }

  if (message?.type === 'CARD_READER_REFRESH_ACTIVE_TAB') {
    refreshActiveTabRecommendation()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : 'Recommendation failed';
        await chrome.storage.session.set({
          currentRecommendation: null,
          currentError: message
        });
        sendResponse({ ok: false, error: message });
      });
    return true;
  }

  if (message?.type === 'CARD_READER_SAVE_AUTH_TOKEN') {
    saveAuthToken(message)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unable to save session.' }));
    return true;
  }

  return false;
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
