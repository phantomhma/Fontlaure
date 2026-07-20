import * as store from './store.js';
import * as sync from './sync.js';

let data = store.load();
let currentPeriod = 'week';
let periodOffset = 0;
let editingItemId = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- Navigation ----------
function showView(name) {
  $$('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
  $$('.bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
$$('.bottom-nav button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

// ---------- Rendu des listes déroulantes ----------
function renderCategorySelect() {
  $('#item-category').innerHTML = store.CATEGORIES.map(
    (c) => `<option value="${c}">${store.CATEGORY_LABELS[c]}</option>`
  ).join('');
}

function renderItemSelects() {
  const options = store
    .activeItems(data)
    .map((i) => `<option value="${i.id}">${i.name} (${i.unit})</option>`)
    .join('');
  $('#harvest-item').innerHTML = options;
  $('#sale-item').innerHTML = options;
}

function renderContributorSelects() {
  const options = data.contributors.map((c) => `<option value="${c}">${c}</option>`).join('');
  $('#harvest-contributor').innerHTML = options;
  $('#sale-contributor').innerHTML = options;
  $('#contrib-1').value = data.contributors[0] || '';
  $('#contrib-2').value = data.contributors[1] || '';
}

// ---------- Articles ----------
function renderItemList() {
  const items = store.activeItems(data).sort((a, b) => a.name.localeCompare(b.name));
  $('#item-list').innerHTML = items
    .map((i) => {
      const stock = store.stockFor(data, i.id);
      return `<li>
        <div class="entry-main">
          <strong>${i.name}</strong>
          <span>${store.CATEGORY_LABELS[i.category]} · ${i.price.toFixed(2)} €/${i.unit} · stock ${stock.toFixed(2)} ${i.unit}</span>
        </div>
        <div class="entry-actions">
          <button data-edit="${i.id}">✏️</button>
          <button data-delete-item="${i.id}">🗑️</button>
        </div>
      </li>`;
    })
    .join('') || '<li class="empty">Aucun article.</li>';
}

$('#form-item').addEventListener('submit', (e) => {
  e.preventDefault();
  const record = {
    id: editingItemId || store.newId(),
    name: $('#item-name').value.trim(),
    category: $('#item-category').value,
    unit: $('#item-unit').value.trim(),
    price: parseFloat($('#item-price').value),
  };
  store.upsert(data, 'items', record);
  editingItemId = null;
  e.target.reset();
  $('#item-unit').value = 'kg';
  e.target.querySelector('button[type=submit]').textContent = 'Ajouter';
  renderAll();
});

$('#item-list').addEventListener('click', (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.deleteItem;
  if (editId) {
    const item = store.itemById(data, editId);
    editingItemId = editId;
    $('#item-name').value = item.name;
    $('#item-category').value = item.category;
    $('#item-unit').value = item.unit;
    $('#item-price').value = item.price;
    $('#form-item').querySelector('button[type=submit]').textContent = 'Modifier';
    showView('articles');
  } else if (delId) {
    if (confirm('Supprimer cet article ?')) {
      store.softDelete(data, 'items', delId);
      renderAll();
    }
  }
});

// ---------- Ramassage ----------
function renderHarvestList() {
  const list = [...data.harvests]
    .filter((h) => !h.deleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  $('#harvest-list').innerHTML = list
    .map((h) => {
      const item = store.itemById(data, h.itemId);
      return `<li>
        <div class="entry-main">
          <strong>${item ? item.name : '?'}</strong>
          <span>${h.quantity} ${item ? item.unit : ''} · ${h.date} · ${h.contributor}${h.note ? ' · ' + h.note : ''}</span>
        </div>
        <div class="entry-actions"><button data-delete-harvest="${h.id}">🗑️</button></div>
      </li>`;
    })
    .join('') || '<li class="empty">Aucun ramassage.</li>';
}

$('#form-harvest').addEventListener('submit', (e) => {
  e.preventDefault();
  store.upsert(data, 'harvests', {
    id: store.newId(),
    itemId: $('#harvest-item').value,
    quantity: parseFloat($('#harvest-qty').value),
    date: $('#harvest-date').value,
    contributor: $('#harvest-contributor').value,
    note: $('#harvest-note').value.trim(),
  });
  e.target.reset();
  $('#harvest-date').value = todayStr();
  renderAll();
});

$('#harvest-list').addEventListener('click', (e) => {
  const id = e.target.dataset.deleteHarvest;
  if (id && confirm('Supprimer ce ramassage ?')) {
    store.softDelete(data, 'harvests', id);
    renderAll();
  }
});

// ---------- Vente ----------
function renderSaleList() {
  const list = [...data.sales]
    .filter((s) => !s.deleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  $('#sale-list').innerHTML = list
    .map((s) => {
      const item = store.itemById(data, s.itemId);
      return `<li>
        <div class="entry-main">
          <strong>${item ? item.name : '?'}</strong>
          <span>${s.quantity} ${item ? item.unit : ''} × ${s.unitPrice.toFixed(2)} € · ${s.date} · ${s.contributor}${s.buyer ? ' · ' + s.buyer : ''}</span>
        </div>
        <div class="entry-actions"><button data-delete-sale="${s.id}">🗑️</button></div>
      </li>`;
    })
    .join('') || '<li class="empty">Aucune vente.</li>';
}

$('#sale-item').addEventListener('change', () => {
  const item = store.itemById(data, $('#sale-item').value);
  if (item) $('#sale-price').value = item.price;
});

$('#form-sale').addEventListener('submit', (e) => {
  e.preventDefault();
  store.upsert(data, 'sales', {
    id: store.newId(),
    itemId: $('#sale-item').value,
    quantity: parseFloat($('#sale-qty').value),
    unitPrice: parseFloat($('#sale-price').value),
    date: $('#sale-date').value,
    contributor: $('#sale-contributor').value,
    buyer: $('#sale-buyer').value.trim(),
  });
  e.target.reset();
  $('#sale-date').value = todayStr();
  renderAll();
});

$('#sale-list').addEventListener('click', (e) => {
  const id = e.target.dataset.deleteSale;
  if (id && confirm('Supprimer cette vente ?')) {
    store.softDelete(data, 'sales', id);
    renderAll();
  }
});

// ---------- Réglages ----------
$('#save-contributors').addEventListener('click', () => {
  data.contributors = [$('#contrib-1').value.trim() || 'Contributeur 1', $('#contrib-2').value.trim() || 'Contributeur 2'];
  store.save(data);
  renderAll();
});

$('#export-json').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `potager-fontlaure-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$('#import-json').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const imported = JSON.parse(text);
    data = store.mergeData(data, imported);
    store.save(data);
    renderAll();
    alert('Import terminé (fusion avec les données locales).');
  } catch {
    alert("Fichier JSON invalide.");
  }
  e.target.value = '';
});

const syncSettings = sync.loadSettings();
$('#gh-pat').value = syncSettings.pat;
$('#gh-owner').value = syncSettings.owner;
$('#gh-repo').value = syncSettings.repo;
$('#gh-path').value = syncSettings.path;
$('#gh-branch').value = syncSettings.branch;

$('#save-sync-settings').addEventListener('click', () => {
  sync.saveSettings({
    pat: $('#gh-pat').value.trim(),
    owner: $('#gh-owner').value.trim(),
    repo: $('#gh-repo').value.trim(),
    path: $('#gh-path').value.trim() || 'data.json',
    branch: $('#gh-branch').value.trim() || 'main',
  });
  setSyncStatus('Réglages enregistrés.');
});

let syncing = false;

$('#sync-now').addEventListener('click', async () => {
  if (syncing) return; // évite deux synchros en parallèle (cause du 409 : sha périmé entre-temps)
  const settings = sync.loadSettings();
  if (!settings.pat || !settings.owner || !settings.repo) {
    setSyncStatus('Renseigne PAT, owner et repo avant de synchroniser.', true);
    return;
  }
  syncing = true;
  $('#sync-now').disabled = true;
  setSyncStatus('Synchronisation en cours...');
  const MAX_ATTEMPTS = 3;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data: remote, sha } = await sync.fetchRemote(settings);
      data = remote ? store.mergeData(data, remote) : { ...data, meta: { lastSync: store.now() } };
      store.save(data);
      try {
        await sync.pushRemote(settings, data, sha);
        setSyncStatus(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR')}.`);
        renderAll();
        break;
      } catch (err) {
        if (err.status === 409 && attempt < MAX_ATTEMPTS) continue; // sha périmé, on relit et réessaie
        throw err;
      }
    }
  } catch (err) {
    setSyncStatus(err.message, true);
  } finally {
    syncing = false;
    $('#sync-now').disabled = false;
  }
});

function setSyncStatus(msg, isError = false) {
  const el = $('#sync-status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  $('#sync-indicator').classList.toggle('error', isError);
}

// ---------- Tableau de bord ----------
function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function getPeriodRange(period, offset) {
  const base = new Date();
  if (period === 'week') {
    const start = startOfWeek(base);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end, label: `Semaine du ${start.toLocaleDateString('fr-FR')}` };
  }
  if (period === 'month') {
    const start = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const end = new Date(base.getFullYear(), base.getMonth() + offset + 1, 1);
    return { start, end, label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  }
  const start = new Date(base.getFullYear() + offset, 0, 1);
  const end = new Date(base.getFullYear() + offset + 1, 0, 1);
  return { start, end, label: String(start.getFullYear()) };
}

function inRange(dateStr, range) {
  const d = new Date(dateStr);
  return d >= range.start && d < range.end;
}

function computeStats(range) {
  const harvests = data.harvests.filter((h) => !h.deleted && inRange(h.date, range));
  const sales = data.sales.filter((s) => !s.deleted && inRange(s.date, range));
  const revenue = sales.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const byItem = new Map();
  for (const h of harvests) {
    const e = byItem.get(h.itemId) || { harvested: 0, sold: 0, revenue: 0 };
    e.harvested += h.quantity;
    byItem.set(h.itemId, e);
  }
  for (const s of sales) {
    const e = byItem.get(s.itemId) || { harvested: 0, sold: 0, revenue: 0 };
    e.sold += s.quantity;
    e.revenue += s.quantity * s.unitPrice;
    byItem.set(s.itemId, e);
  }
  return { revenue, byItem };
}

function renderDashboard() {
  const range = getPeriodRange(currentPeriod, periodOffset);
  $('#period-label').textContent = range.label;
  const { revenue, byItem } = computeStats(range);

  const maxQty = Math.max(1, ...[...byItem.values()].map((e) => Math.max(e.harvested, e.sold)));
  const rows = [...byItem.entries()]
    .map(([itemId, e]) => {
      const item = store.itemById(data, itemId);
      const name = item ? item.name : '?';
      const unit = item ? item.unit : '';
      return `<div class="stat-row">
        <div class="stat-row-label">${name}</div>
        <div class="bar-track"><div class="bar harvested" style="width:${(e.harvested / maxQty) * 100}%"></div></div>
        <div class="bar-value">${e.harvested.toFixed(2)} ${unit} ramassé(s)</div>
        <div class="bar-track"><div class="bar sold" style="width:${(e.sold / maxQty) * 100}%"></div></div>
        <div class="bar-value">${e.sold.toFixed(2)} ${unit} vendu(s) · ${e.revenue.toFixed(2)} €</div>
      </div>`;
    })
    .join('') || '<p class="empty">Aucune donnée sur cette période.</p>';

  $('#dashboard-stats').innerHTML = `
    <div class="stat-summary">
      <div><span>${revenue.toFixed(2)} €</span><small>Recette</small></div>
    </div>
    ${rows}`;
}

$$('.period-switch button').forEach((b) =>
  b.addEventListener('click', () => {
    currentPeriod = b.dataset.period;
    periodOffset = 0;
    $$('.period-switch button').forEach((btn) => btn.classList.toggle('active', btn === b));
    renderDashboard();
  })
);
$('#period-prev').addEventListener('click', () => {
  periodOffset -= 1;
  renderDashboard();
});
$('#period-next').addEventListener('click', () => {
  periodOffset += 1;
  renderDashboard();
});

// ---------- Init ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function renderAll() {
  renderContributorSelects();
  renderItemSelects();
  renderItemList();
  renderHarvestList();
  renderSaleList();
  renderDashboard();
}

renderCategorySelect();
$('#harvest-date').value = todayStr();
$('#sale-date').value = todayStr();
renderAll();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
