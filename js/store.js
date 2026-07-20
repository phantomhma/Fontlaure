// Couche données : localStorage + CRUD + fusion pour la synchro multi-contributeurs.
const STORAGE_KEY = 'potager-fontlaure-data';

const CATEGORIES = ['fruit', 'legume', 'oeuf', 'autre'];
const CATEGORY_LABELS = { fruit: 'Fruit', legume: 'Légume', oeuf: 'Œuf', autre: 'Autre' };

function emptyData() {
  return {
    items: [],
    harvests: [],
    sales: [],
    contributors: ['Contributeur 1', 'Contributeur 2'],
    meta: { lastSync: null },
  };
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const data = JSON.parse(raw);
    return { ...emptyData(), ...data };
  } catch {
    return emptyData();
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function newId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

// --- CRUD génériques sur les tableaux items/harvests/sales ---
function upsert(data, collection, record) {
  const list = data[collection];
  const idx = list.findIndex((r) => r.id === record.id);
  const withMeta = { ...record, updatedAt: now() };
  if (idx === -1) list.push(withMeta);
  else list[idx] = withMeta;
  save(data);
  return withMeta;
}

function softDelete(data, collection, id) {
  const list = data[collection];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], deleted: true, updatedAt: now() };
  save(data);
}

function activeItems(data) {
  return data.items.filter((i) => !i.deleted);
}

function itemById(data, id) {
  return data.items.find((i) => i.id === id);
}

// --- Fusion pour la synchro GitHub : dernière écriture (updatedAt) gagne, par id ---
function mergeCollection(local, remote) {
  const byId = new Map();
  for (const r of local) byId.set(r.id, r);
  for (const r of remote) {
    const existing = byId.get(r.id);
    if (!existing || new Date(r.updatedAt) > new Date(existing.updatedAt)) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

function mergeData(local, remote) {
  return {
    items: mergeCollection(local.items, remote.items || []),
    harvests: mergeCollection(local.harvests, remote.harvests || []),
    sales: mergeCollection(local.sales, remote.sales || []),
    contributors: remote.contributors && remote.contributors.length ? remote.contributors : local.contributors,
    meta: { lastSync: now() },
  };
}

// --- Stock estimé = total ramassé - total vendu, par article ---
function stockFor(data, itemId) {
  const harvested = data.harvests
    .filter((h) => !h.deleted && h.itemId === itemId)
    .reduce((sum, h) => sum + h.quantity, 0);
  const sold = data.sales
    .filter((s) => !s.deleted && s.itemId === itemId)
    .reduce((sum, s) => sum + s.quantity, 0);
  return harvested - sold;
}

export {
  CATEGORIES,
  CATEGORY_LABELS,
  load,
  save,
  newId,
  now,
  upsert,
  softDelete,
  activeItems,
  itemById,
  mergeData,
  stockFor,
};
