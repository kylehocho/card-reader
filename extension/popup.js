const merchantEl = document.querySelector('#merchant');
const stateEl = document.querySelector('#state');
const apiBaseUrlEl = document.querySelector('#apiBaseUrl');
const authStatusEl = document.querySelector('#authStatus');
const openOptionsEl = document.querySelector('#openOptions');
const refreshRecommendationEl = document.querySelector('#refreshRecommendation');
const AUTH_EXPIRY_SKEW_SECONDS = 60;
const DEFAULT_API_BASE_URL = 'https://card-reader-xi.vercel.app';

function cleanApiBaseUrl(value) {
  if (typeof value !== 'string') return DEFAULT_API_BASE_URL;

  const trimmedValue = value.trim().replace(/\/$/, '');
  if (trimmedValue === DEFAULT_API_BASE_URL || trimmedValue === 'http://localhost:3000') return trimmedValue;
  return DEFAULT_API_BASE_URL;
}

function replaceState(children) {
  stateEl.replaceChildren(...children);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = text ?? '';
  return node;
}

function renderRecommendation(context, recommendation) {
  merchantEl.textContent = recommendation?.merchant || context?.merchant || 'Current merchant';
  const card = document.createElement('div');
  card.className = 'card';
  card.append(
    textNode('p', 'label', recommendation.category),
    textNode('h2', '', recommendation.bestCard.name),
    textNode('p', 'issuer', `${recommendation.bestCard.issuer} · ${recommendation.bestCard.multiplier}x ${recommendation.bestCard.rewardCurrency || 'rewards'}`),
    textNode('p', 'reason', recommendation.reason)
  );
  if (recommendation.runnerUp) {
    card.append(textNode('p', 'runner', `Runner-up: ${recommendation.runnerUp.name} at ${recommendation.runnerUp.multiplier}x`));
  }
  if (recommendation.matchedOffer) {
    card.append(textNode('div', 'offer', recommendation.matchedOffer.title));
  }
  replaceState([card]);
}

function renderError(context, error) {
  merchantEl.textContent = context?.merchant || 'Current merchant';
  replaceState([textNode('p', 'error', error || 'No recommendation available yet.')]);
}

function renderLoading(context) {
  merchantEl.textContent = context?.merchant || 'Current merchant';
  replaceState([textNode('p', 'muted', 'Checking this page...')]);
}

async function refreshActiveTab() {
  renderLoading();
  const result = await chrome.runtime.sendMessage({ type: 'CARD_READER_REFRESH_ACTIVE_TAB' });
  if (result?.ok && result.recommendation) {
    renderRecommendation(result.context, result.recommendation);
    return;
  }

  const [{ currentContext }] = await Promise.all([chrome.storage.session.get(['currentContext'])]);
  renderError(currentContext, result?.error || 'No recommendation available yet.');
}

async function refresh() {
  const [{ currentContext, currentRecommendation, currentError }, { apiBaseUrl }, { authToken, authUserEmail, authExpiresAt }] = await Promise.all([
    chrome.storage.session.get(['currentContext', 'currentRecommendation', 'currentError']),
    chrome.storage.sync.get(['apiBaseUrl']),
    chrome.storage.local.get(['authToken', 'authUserEmail', 'authExpiresAt'])
  ]);
  const authExpired = Boolean(authExpiresAt && Date.now() / 1000 >= authExpiresAt - AUTH_EXPIRY_SKEW_SECONDS);

  apiBaseUrlEl.value = cleanApiBaseUrl(apiBaseUrl);
  authStatusEl.textContent = authExpired ? 'Session expired' : authToken ? `Signed-in wallet${authUserEmail ? `: ${authUserEmail}` : ''}` : 'Demo catalog';

  if (authExpired) {
    await chrome.storage.local.remove('authToken');
    renderError(currentContext, 'Signed-in session expired. Reconnect from the Card Reader web app.');
    return;
  }

  if (currentRecommendation) {
    renderRecommendation(currentContext, currentRecommendation);
    return;
  }

  if (currentError) {
    renderError(currentContext, currentError);
    return;
  }

  await refreshActiveTab();
}

apiBaseUrlEl.addEventListener('change', async () => {
  const value = cleanApiBaseUrl(apiBaseUrlEl.value);
  apiBaseUrlEl.value = value;
  await chrome.storage.sync.set({ apiBaseUrl: value });
});

openOptionsEl.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

refreshRecommendationEl.addEventListener('click', () => {
  void refreshActiveTab();
});

void refresh();
