const merchantEl = document.querySelector('#merchant');
const stateEl = document.querySelector('#state');
const apiBaseUrlEl = document.querySelector('#apiBaseUrl');

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

async function refresh() {
  const [{ currentContext, currentRecommendation, currentError }, { apiBaseUrl }] = await Promise.all([
    chrome.storage.session.get(['currentContext', 'currentRecommendation', 'currentError']),
    chrome.storage.sync.get(['apiBaseUrl'])
  ]);

  apiBaseUrlEl.value = apiBaseUrl || 'https://card-reader-xi.vercel.app';

  if (currentRecommendation) {
    renderRecommendation(currentContext, currentRecommendation);
    return;
  }

  renderError(currentContext, currentError);
}

apiBaseUrlEl.addEventListener('change', async () => {
  const value = apiBaseUrlEl.value.trim() || 'https://card-reader-xi.vercel.app';
  await chrome.storage.sync.set({ apiBaseUrl: value });
});

void refresh();
