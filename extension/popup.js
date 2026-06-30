const merchantEl = document.querySelector('#merchant');
const stateEl = document.querySelector('#state');
const apiBaseUrlEl = document.querySelector('#apiBaseUrl');
const authStatusEl = document.querySelector('#authStatus');
const openOptionsEl = document.querySelector('#openOptions');
const refreshRecommendationEl = document.querySelector('#refreshRecommendation');
const AUTH_EXPIRY_SKEW_SECONDS = 60;

function renderRecommendation(context, recommendation) {
  merchantEl.textContent = recommendation?.merchant || context?.merchant || 'Current merchant';
  stateEl.innerHTML = `
    <div class="card">
      <p class="label">${recommendation.category}</p>
      <h2>${recommendation.bestCard.name}</h2>
      <p class="issuer">${recommendation.bestCard.issuer} · ${recommendation.bestCard.multiplier}x ${recommendation.bestCard.rewardCurrency || 'rewards'}</p>
      <p class="reason">${recommendation.reason}</p>
      ${recommendation.runnerUp ? `<p class="runner">Runner-up: ${recommendation.runnerUp.name} at ${recommendation.runnerUp.multiplier}x</p>` : ''}
      ${recommendation.matchedOffer ? `<div class="offer">${recommendation.matchedOffer.title}</div>` : ''}
    </div>
  `;
}

function renderError(context, error) {
  merchantEl.textContent = context?.merchant || 'Current merchant';
  stateEl.innerHTML = `<p class="error">${error || 'No recommendation available yet.'}</p>`;
}

function renderLoading(context) {
  merchantEl.textContent = context?.merchant || 'Current merchant';
  stateEl.innerHTML = '<p class="muted">Checking this page...</p>';
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

  apiBaseUrlEl.value = apiBaseUrl || 'https://card-reader-xi.vercel.app';
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
  const value = apiBaseUrlEl.value.trim() || 'https://card-reader-xi.vercel.app';
  await chrome.storage.sync.set({ apiBaseUrl: value });
});

openOptionsEl.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

refreshRecommendationEl.addEventListener('click', () => {
  void refreshActiveTab();
});

void refresh();
