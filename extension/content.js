const merchantDomainHints = {
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

function currentHost() {
  return window.location.hostname.replace(/^www\./, '');
}

function hintForHost(host) {
  return merchantDomainHints[host] || Object.entries(merchantDomainHints).find(([domain]) => host.endsWith(`.${domain}`))?.[1] || null;
}

function pageMerchantContext() {
  const host = currentHost();
  const hint = hintForHost(host);
  const title = document.title || host;
  const merchant = hint?.merchant || title.split(/[|–-]/)[0]?.trim() || host;

  return {
    merchant,
    title,
    url: window.location.href,
    host,
    categoryHint: hint?.categoryHint || ''
  };
}

function isAllowedCardReaderOrigin(origin) {
  return origin === 'https://card-reader-xi.vercel.app' || origin === 'http://localhost:3000';
}

window.addEventListener('message', (event) => {
  if (event.source !== window || !isAllowedCardReaderOrigin(event.origin)) return;

  const message = event.data;
  if (message?.type !== 'CARD_READER_SAVE_AUTH_TOKEN') return;

  chrome.runtime.sendMessage(
    {
      type: 'CARD_READER_SAVE_AUTH_TOKEN',
      apiBaseUrl: message.apiBaseUrl,
      authToken: message.authToken,
      authExpiresAt: message.authExpiresAt,
      userEmail: message.userEmail
    },
    (response) => {
      const error = chrome.runtime.lastError?.message || response?.error || null;
      window.postMessage(
        {
          type: 'CARD_READER_AUTH_TOKEN_SAVED',
          requestId: message.requestId,
          ok: Boolean(response?.ok) && !error,
          error
        },
        event.origin
      );
    }
  );
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'CARD_READER_GET_CONTEXT') return false;
  sendResponse(pageMerchantContext());
  return true;
});

const contextMessage = chrome.runtime.sendMessage({ type: 'CARD_READER_CONTEXT_CHANGED', context: pageMerchantContext() });
if (contextMessage && typeof contextMessage.catch === 'function') {
  contextMessage.catch(() => {});
}
