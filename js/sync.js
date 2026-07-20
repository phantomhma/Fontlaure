// Synchronisation GitHub : lit/écrit un fichier JSON dans un repo via Contents API.
const SETTINGS_KEY = 'potager-fontlaure-sync';

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : { pat: '', owner: '', repo: '', path: 'data.json', branch: 'main' };
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function apiUrl(settings) {
  return `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${settings.path}`;
}

async function fetchRemote(settings) {
  const res = await fetch(`${apiUrl(settings)}?ref=${settings.branch}`, {
    headers: { Authorization: `token ${settings.pat}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`Lecture GitHub échouée (${res.status})`);
  const body = await res.json();
  const json = decodeURIComponent(escape(atob(body.content)));
  return { data: JSON.parse(json), sha: body.sha };
}

async function pushRemote(settings, data, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const res = await fetch(apiUrl(settings), {
    method: 'PUT',
    headers: { Authorization: `token ${settings.pat}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify({
      message: `Synchro Potager Fontlaure - ${new Date().toISOString()}`,
      content,
      branch: settings.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const err = new Error(`Écriture GitHub échouée (${res.status})`);
    err.status = res.status;
    throw err;
  }
}

export { loadSettings, saveSettings, fetchRemote, pushRemote };
