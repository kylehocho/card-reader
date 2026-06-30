const DEFAULT_API_BASE_URL = 'https://card-reader-xi.vercel.app';

const apiBaseUrlEl = document.querySelector('#apiBaseUrl');
const authTokenEl = document.querySelector('#authToken');
const saveSettingsEl = document.querySelector('#saveSettings');
const clearTokenEl = document.querySelector('#clearToken');
const statusEl = document.querySelector('#status');

function setStatus(message) {
  statusEl.textContent = message;
}

async function loadSettings() {
  const [{ apiBaseUrl }, { authToken }] = await Promise.all([chrome.storage.sync.get(['apiBaseUrl']), chrome.storage.local.get(['authToken'])]);
  apiBaseUrlEl.value = apiBaseUrl || DEFAULT_API_BASE_URL;
  authTokenEl.value = authToken || '';
  setStatus(authToken ? 'Signed-in recommendations enabled.' : 'Using demo catalog until a token is saved.');
}

async function saveSettings() {
  const apiBaseUrl = apiBaseUrlEl.value.trim() || DEFAULT_API_BASE_URL;
  const authToken = authTokenEl.value.trim();
  await chrome.storage.sync.set({ apiBaseUrl });
  await chrome.storage.local.set({ authToken });
  setStatus(authToken ? 'Saved. Signed-in recommendations enabled.' : 'Saved. Using demo catalog.');
}

async function clearToken() {
  authTokenEl.value = '';
  await chrome.storage.local.remove('authToken');
  setStatus('Token cleared. Using demo catalog.');
}

saveSettingsEl.addEventListener('click', () => {
  void saveSettings();
});

clearTokenEl.addEventListener('click', () => {
  void clearToken();
});

void loadSettings();
