// vt-sync.jsx — Lernstand eines Kindes zwischen seinen Geräten abgleichen (Tabelle voc_progress).
// Lokale Daten werden nie gelöscht: Wörter und Lernstand werden nur zusammengeführt.

const SYNC_META_KEY = "vt_sync_meta";
const SYNC_BACKUP_KEY = "vt_backup_pre_sync";
const SYNC_HISTORY_LIMIT = 30;

/* ── Reine Zusammenführungs-Logik ── */

// Wort-IDs hängen von der Import-Reihenfolge ab und unterscheiden sich je Gerät, deshalb zählt das Wort selbst.
function syncWordKey(word) {
  return vocabWordKey(word);
}

function syncMergeRecord(a, b) {
  if (!a) return b ? { ...b } : a;
  if (!b) return { ...a };
  const aSeen = a.lastSeen || "";
  const bSeen = b.lastSeen || "";
  let winner;
  if (aSeen !== bSeen) winner = aSeen > bSeen ? a : b;
  else winner = (a.level || 1) >= (b.level || 1) ? a : b;
  return {
    level: winner.level || 1,
    correct: Math.max(a.correct || 0, b.correct || 0),
    wrong: Math.max(a.wrong || 0, b.wrong || 0),
    lastSeen: winner.lastSeen || null,
  };
}

function syncHistoryTime(h) {
  return h.ts || Date.parse(h.date) || 0;
}

function syncMergeHistory(a, b) {
  const seen = new Set();
  return [...(a || []), ...(b || [])]
    .filter(h => {
      const id = [h.ts || "", h.date, h.score, h.total, h.mode].join("|");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((x, y) => syncHistoryTime(y) - syncHistoryTime(x))
    .slice(0, SYNC_HISTORY_LIMIT);
}

function syncMergeRecordMap(a, b) {
  const out = { ...(a || {}) };
  Object.entries(b || {}).forEach(([key, rec]) => { out[key] = syncMergeRecord(out[key], rec); });
  return out;
}

// Zähler je Gerät: Jedes Gerät schreibt nur seinen eigenen Wert, die Summe ergibt den Gesamtstand.
function syncMergeCounters(a, b) {
  const out = { ...(a || {}) };
  Object.entries(b || {}).forEach(([device, n]) => { out[device] = Math.max(out[device] || 0, n || 0); });
  return out;
}

function syncSumOthers(counters, deviceId) {
  return Object.entries(counters || {}).reduce((sum, [device, n]) => (device === deviceId ? sum : sum + (n || 0)), 0);
}

function syncMergeWords(a, b) {
  const out = { ...(a || {}) };
  Object.entries(b || {}).forEach(([key, word]) => {
    const cur = out[key];
    if (!cur) { out[key] = word; return; }
    out[key] = {
      en: cur.en || word.en,
      de: cur.de || word.de,
      example: cur.example || word.example || "",
      note: cur.note || word.note || "",
      pronunciation: cur.pronunciation || word.pronunciation || "",
    };
  });
  return out;
}

function syncMergeLang(a, b) {
  const x = a || {};
  const y = b || {};
  const xDate = x.lastSessionDate || "";
  const yDate = y.lastSessionDate || "";
  return {
    words: syncMergeWords(x.words, y.words),
    leitner: syncMergeRecordMap(x.leitner, y.leitner),
    extraLeitner: syncMergeRecordMap(x.extraLeitner, y.extraLeitner),
    streak: Math.max(x.streak || 0, y.streak || 0),
    lastSessionDate: (xDate > yDate ? xDate : yDate) || null,
    history: syncMergeHistory(x.history, y.history),
    xp: syncMergeCounters(x.xp, y.xp),
    sessions: syncMergeCounters(x.sessions, y.sessions),
  };
}

function syncMergeDocs(a, b) {
  const x = a || {};
  const y = b || {};
  const langs = {};
  [...Object.keys(x.langs || {}), ...Object.keys(y.langs || {})].forEach(lang => {
    langs[lang] = syncMergeLang(x.langs?.[lang], y.langs?.[lang]);
  });
  return { version: 1, profile: x.profile?.onboarded ? x.profile : (y.profile || x.profile || null), langs };
}

/* ── Lokaler Speicher ── */

function syncReadMeta() {
  let meta = null;
  try { meta = JSON.parse(localStorage.getItem(SYNC_META_KEY)); } catch (e) {}
  meta = meta || {};
  if (!meta.deviceId) meta.deviceId = "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  if (!meta.known) meta.known = {};
  return meta;
}

function syncWriteMeta(meta) {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

function syncStashKeys() {
  return [LS_KEY, LEGACY_LS_KEY, ...LANGUAGES.map(l => VOCAB_KEY(l.id)), "vt_active_list", ASSIGNED_LISTS_KEY];
}

// Meldet sich ein anderes Konto an, wird der Stand des bisherigen Kontos beiseitegelegt und nicht vermischt.
function syncEnsureOwner(userId, meta) {
  if (!meta.ownerId) { meta.ownerId = userId; return false; }
  if (meta.ownerId === userId) return false;
  const keys = syncStashKeys();
  const stash = { known: meta.known, backedUp: meta.backedUp, items: {} };
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) stash.items[key] = value;
  });
  localStorage.setItem("vt_stash_" + meta.ownerId, JSON.stringify(stash));
  keys.forEach(key => localStorage.removeItem(key));
  let restored = null;
  try { restored = JSON.parse(localStorage.getItem("vt_stash_" + userId)); } catch (e) {}
  if (restored) {
    Object.entries(restored.items || {}).forEach(([key, value]) => localStorage.setItem(key, value));
    localStorage.removeItem("vt_stash_" + userId);
  }
  meta.ownerId = userId;
  meta.known = restored?.known || {};
  meta.backedUp = !!restored?.backedUp;
  return true;
}

function syncBuildLang(lang, child, remote, meta) {
  const progress = progressForChild(child, lang);
  const known = meta.known[lang] || {};
  const words = {};
  const idToKey = {};
  loadVocabulary(lang).forEach(w => {
    const key = syncWordKey(w.en);
    idToKey[w.id] = key;
    if (!words[key]) {
      words[key] = { en: w.en, de: w.de, example: w.example || "", note: w.note || "", pronunciation: w.pronunciation || "" };
    }
  });
  const leitner = {};
  const extraLeitner = {};
  Object.entries(progress.leitner || {}).forEach(([id, rec]) => {
    if (idToKey[id]) leitner[idToKey[id]] = syncMergeRecord(leitner[idToKey[id]], rec);
    else if (id.startsWith("irr-")) extraLeitner[id] = rec;
  });
  const ownCounter = (localValue, knownOthers, counters) => Math.max(
    counters?.[meta.deviceId] || 0,
    (localValue || 0) - (knownOthers || 0)
  );
  return {
    words,
    leitner,
    extraLeitner,
    streak: progress.streak || 0,
    lastSessionDate: progress.lastSessionDate || null,
    history: progress.history || [],
    xp: { [meta.deviceId]: ownCounter(progress.xp, known.xp, remote?.xp) },
    sessions: { [meta.deviceId]: ownCounter(progress.sessionsCount, known.sessions, remote?.sessions) },
  };
}

function syncBuildLocalDoc(remoteDoc, meta) {
  const store = readStore();
  const child = store.children[store.activeChildId];
  const langs = {};
  LANGUAGES.forEach(l => { langs[l.id] = syncBuildLang(l.id, child, remoteDoc?.langs?.[l.id], meta); });
  return { version: 1, profile: child?.profile || null, langs };
}

function syncReadRawVocab(lang) {
  try { return JSON.parse(localStorage.getItem(VOCAB_KEY(lang)) || "[]") || []; } catch (e) { return []; }
}

// Vorhandene Wort-IDs bleiben unverändert, damit der lokale Lernstand weiter passt.
function syncApplyDoc(doc, meta) {
  const store = readStore();
  const childId = store.activeChildId;
  const child = store.children[childId];
  if (!child) return;
  Object.entries(doc.langs || {}).forEach(([lang, remote]) => {
    if (!LANGUAGES.some(l => l.id === lang)) return;
    const raw = syncReadRawVocab(lang);
    const present = new Set(raw.map(w => syncWordKey(w.en || w.term)));
    const added = Object.entries(remote.words || {})
      .filter(([key]) => !present.has(key))
      .map(([key, w]) => ({ ...w, id: "sync-" + key }));
    if (added.length) localStorage.setItem(VOCAB_KEY(lang), JSON.stringify([...raw, ...added]));

    const progress = progressForChild(child, lang);
    const leitner = { ...(progress.leitner || {}) };
    loadVocabulary(lang).forEach(w => {
      const rec = remote.leitner?.[syncWordKey(w.en)];
      if (rec) leitner[w.id] = syncMergeRecord(leitner[w.id], rec);
    });
    Object.entries(remote.extraLeitner || {}).forEach(([id, rec]) => { leitner[id] = syncMergeRecord(leitner[id], rec); });

    const known = meta.known[lang] || {};
    const total = (localValue, knownOthers, counters) => {
      const own = Math.max(counters?.[meta.deviceId] || 0, (localValue || 0) - (knownOthers || 0));
      return own + syncSumOthers(counters, meta.deviceId);
    };
    const localDate = progress.lastSessionDate || "";
    const remoteDate = remote.lastSessionDate || "";
    child.progress = {
      ...child.progress,
      [lang]: {
        ...progress,
        leitner,
        xp: total(progress.xp, known.xp, remote.xp),
        sessionsCount: total(progress.sessionsCount, known.sessions, remote.sessions),
        streak: Math.max(progress.streak || 0, remote.streak || 0),
        lastSessionDate: (localDate > remoteDate ? localDate : remoteDate) || null,
        history: syncMergeHistory(progress.history, remote.history),
      },
    };
    meta.known[lang] = {
      xp: syncSumOthers(remote.xp, meta.deviceId),
      sessions: syncSumOthers(remote.sessions, meta.deviceId),
    };
  });
  if (!child.profile?.onboarded && doc.profile?.onboarded) child.profile = { ...doc.profile };
  store.children = { ...store.children, [childId]: child };
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

function syncLocalSignature() {
  return syncStashKeys().map(key => localStorage.getItem(key) || "").join("\u0000");
}

/* ── Abgleich mit Supabase ── */

const SYNC_LIST_REFRESH_MS = 24 * 60 * 60 * 1000;
const SYNC_WORD_PAGE = 1000;

async function syncFetchListWords(listId) {
  const words = [];
  for (let from = 0; ; from += SYNC_WORD_PAGE) {
    const { data, error } = await window._sb.from("voc_words")
      .select("id, original, translation, beispiel, hinweis, aussprache")
      .eq("list_id", listId)
      .order("id")
      .range(from, from + SYNC_WORD_PAGE - 1);
    if (error) return null;
    words.push(...(data || []));
    if (!data || data.length < SYNC_WORD_PAGE) return words;
  }
}

// Holt die zugewiesenen Listen. Wörter kommen nur dazu, entzogene Listen verschwinden nur aus der Auswahl.
async function syncFetchAssignedLists(userId) {
  const { data, error } = await window._sb.from("voc_class_members")
    .select("voc_classes(id, name, voc_class_lists(voc_lists(id, name, voc_words(count))))")
    .eq("user_id", userId);
  if (error) return false;

  const cached = Object.fromEntries(readAssignedLists().map(l => [l.id, l]));
  const assigned = new Map();
  (data || []).forEach(m => {
    (m.voc_classes?.voc_class_lists || []).forEach(cl => {
      const list = cl.voc_lists;
      if (list && !assigned.has(list.id)) {
        assigned.set(list.id, { id: list.id, name: list.name, className: m.voc_classes.name, count: list.voc_words?.[0]?.count ?? 0 });
      }
    });
  });

  const now = Date.now();
  const lists = [];
  const fetched = [];
  for (const list of assigned.values()) {
    const old = cached[list.id];
    if (old && old.count === list.count && now - (old.fetchedAt || 0) < SYNC_LIST_REFRESH_MS) {
      lists.push({ ...old, name: list.name, className: list.className });
      continue;
    }
    const words = await syncFetchListWords(list.id);
    if (!words) return false;
    const rows = words
      .map(w => ({
        en: (w.original || "").trim(),
        de: (w.translation || "").trim(),
        example: (w.beispiel || "").trim(),
        note: (w.hinweis || "").trim(),
        pronunciation: (w.aussprache || "").trim(),
        id: "cloud-" + w.id,
      }))
      .filter(w => w.en && w.de);
    fetched.push(...rows);
    lists.push({ ...list, keys: [...new Set(rows.map(w => syncWordKey(w.en)))], fetchedAt: now });
  }

  const raw = syncReadRawVocab(ASSIGNED_LISTS_LANG);
  const present = new Set(raw.map(w => syncWordKey(w.en || w.term)));
  const added = fetched.filter(w => {
    const key = syncWordKey(w.en);
    if (present.has(key)) return false;
    present.add(key);
    return true;
  });
  if (added.length) localStorage.setItem(VOCAB_KEY(ASSIGNED_LISTS_LANG), JSON.stringify([...raw, ...added]));
  localStorage.setItem(ASSIGNED_LISTS_KEY, JSON.stringify(lists));

  let active = null;
  try { active = JSON.parse(localStorage.getItem("vt_active_list")); } catch (e) {}
  if (active && !lists.some(l => l.id === active.id)) localStorage.removeItem("vt_active_list");
  return true;
}

// Sicherung vor dem ersten Abgleich: lokal und in der Cloud. Schlägt sie fehl, wird nicht abgeglichen.
async function syncBackupOnce(userId, meta) {
  if (meta.backedUp) return true;
  const backup = exportBackup();
  try {
    localStorage.setItem(SYNC_BACKUP_KEY + "_" + userId, JSON.stringify({ at: new Date().toISOString(), backup }));
  } catch (e) {
    return false;
  }
  const { error } = await window._sb.from("voc_progress_backups")
    .insert({ user_id: userId, device_id: meta.deviceId, data: backup });
  if (error) return false;
  meta.backedUp = true;
  syncWriteMeta(meta);
  return true;
}

async function syncExchange(userId, meta) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error: readError } = await window._sb.from("voc_progress")
      .select("data, rev").eq("user_id", userId).maybeSingle();
    if (readError) return null;
    const merged = syncMergeDocs(row?.data, syncBuildLocalDoc(row?.data, meta));
    const updatedAt = new Date().toISOString();
    if (row) {
      const { data: saved, error } = await window._sb.from("voc_progress")
        .update({ data: merged, rev: row.rev + 1, updated_at: updatedAt })
        .eq("user_id", userId).eq("rev", row.rev).select("rev");
      if (error) return null;
      if (saved && saved.length) return merged;
    } else {
      const { error } = await window._sb.from("voc_progress")
        .insert({ user_id: userId, data: merged, rev: 1, updated_at: updatedAt });
      if (!error) return merged;
      if (error.code !== "23505") return null;
    }
  }
  return null;
}

let syncRunning = null;
let syncQueued = false;

async function syncOnce(userId) {
  const meta = syncReadMeta();
  const before = syncLocalSignature();
  const switched = syncEnsureOwner(userId, meta);
  syncWriteMeta(meta);
  if (!navigator.onLine) return { changed: switched, status: "offline" };
  if (!(await syncBackupOnce(userId, meta))) return { changed: switched, status: "error" };
  await syncFetchAssignedLists(userId);
  const merged = await syncExchange(userId, meta);
  if (!merged) return { changed: switched || before !== syncLocalSignature(), status: "error" };
  // Ab hier ohne await: Eine Übung, die während des Abgleichs endet, bleibt dadurch erhalten.
  syncApplyDoc(merged, meta);
  syncWriteMeta(meta);
  return { changed: switched || before !== syncLocalSignature(), status: "ok" };
}

function syncProgress(userId) {
  if (syncRunning) {
    syncQueued = true;
    return syncRunning;
  }
  syncRunning = (async () => {
    let result = { changed: false, status: "error" };
    try {
      do {
        syncQueued = false;
        const next = await syncOnce(userId);
        result = { changed: result.changed || next.changed, status: next.status };
      } while (syncQueued);
    } catch (e) {
      console.warn("Abgleich fehlgeschlagen", e);
    }
    syncRunning = null;
    return result;
  })();
  return syncRunning;
}

Object.assign(window, { syncProgress, syncWordKey, syncMergeRecord, syncMergeHistory, syncMergeDocs, syncSumOthers });
