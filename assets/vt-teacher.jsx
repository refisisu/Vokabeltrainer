// vt-teacher.jsx — Lehrer-Dashboard: Klassen, Listen-Bibliothek, CSV-Upload

const { useState: useT, useEffect: useTE, useCallback: useTC, useRef: useTR } = React;

/* ── Hilfsfunktionen ── */
function parseCsvLine(line) {
  const fields = [];
  let field = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ';' && !inQuotes) { fields.push(field.trim()); field = ""; }
    else { field += ch; }
  }
  fields.push(field.trim());
  return fields;
}

function parseWords(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].toLowerCase();
  const start = (first.startsWith("fremdwort") || first.startsWith("word") || first.startsWith("original")) ? 1 : 0;
  return lines.slice(start).map(line => {
    const f = parseCsvLine(line);
    if (f.length >= 2) {
      return { original: f[0], translation: f[1], beispiel: f[2] || "", hinweis: f[3] || "", aussprache: f[4] || "" };
    }
    const sep = line.includes(" - ") ? " - " : ",";
    const [original, ...rest] = line.split(sep);
    return { original: original?.trim(), translation: rest.join(sep).trim(), beispiel: "", hinweis: "", aussprache: "" };
  }).filter(w => w.original && w.translation);
}

function listSizeLabel(list) {
  const count = list.voc_words?.[0]?.count ?? 0;
  if (list.kind === "geography") return `${count} Geographie-Karten`;
  return list.kind === "irregular_verbs" ? `${count} unregelmäßige Verben` : `${count} Wörter`;
}

/* ── Leere-Zustand-Komponente ── */
function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div className="h2">{title}</div>
      <div className="dim" style={{ fontSize: 14, lineHeight: 1.5 }}>{sub}</div>
      {action}
    </div>
  );
}

/* ── Lade-Spinner ── */
function Spinner() {
  return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div className="dim" style={{ fontSize: 15 }}>Laden …</div>
  </div>;
}

/* ── Klassen-Liste ── */
function ClassListView({ session, onSelectClass, onNewClass }) {
  const [classes, setClasses] = useT(null);

  useTE(() => {
    window._sb
      .from("voc_classes")
      .select("id, name, created_at, show_builtin_verbs, hide_unlisted_words")
      .eq("teacher_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setClasses(data || []));
  }, []);

  if (classes === null) return <Spinner />;

  return (
    <div className="scroll" style={{ padding: "0 18px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 2px 18px" }}>
        <div className="h1">Meine Klassen</div>
        <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 15 }} onClick={onNewClass}>
          + Neue Klasse
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon="🏫" title="Noch keine Klasse"
          sub="Erstelle deine erste Klasse."
          action={<button className="btn btn-primary" onClick={onNewClass}>Klasse erstellen</button>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {classes.map(cls => (
            <button key={cls.id} className="card" onClick={() => onSelectClass(cls)}
              style={{ padding: "16px 18px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
              <span style={{ fontSize: 28 }}>🏫</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{cls.name}</div>
              </div>
              <Icon name="arrowR" size={18} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Neue Klasse erstellen ── */
function NewClassForm({ session, onDone, onBack }) {
  const [name, setName] = useT("");
  const [loading, setLoading] = useT(false);
  const [error, setError] = useT(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true); setError(null);
    const { data, error } = await window._sb
      .from("voc_classes")
      .insert({ name: name.trim(), teacher_id: session.user.id })
      .select()
      .single();
    setLoading(false);
    if (error) { setError(error.message); return; }
    onDone(data);
  };

  return (
    <div className="scroll" style={{ display: "flex", flexDirection: "column", padding: "0 24px 32px", minHeight: "100%" }}>
      <div style={{ paddingTop: 20, marginBottom: 28 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14 }} onClick={onBack}>
          <Icon name="arrowL" size={16} /> Zurück
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <div>
          <div className="h1">Neue Klasse</div>
          <div className="dim" style={{ fontSize: 15, marginTop: 8 }}>
            Gib deiner Klasse einen Namen.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="field" type="text" placeholder="z.B. 4b Englisch" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus maxLength={60} />
          {error && (
            <div style={{ color: "var(--wrong)", fontSize: 14, padding: "10px 14px", background: "var(--wrong-soft)", borderRadius: "var(--r-sm)" }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-block" disabled={!name.trim() || loading} onClick={handleCreate}>
            {loading ? "…" : "Klasse erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Listen-Bibliothek ── */
function ListLibraryView({ session, onNewList, onEditList }) {
  const [lists, setLists] = useT(null);

  const load = useTC(() => {
    window._sb
      .from("voc_lists")
      .select("id, name, kind, created_at, voc_words(count)")
      .eq("teacher_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLists(data || []));
  }, []);

  useTE(() => { load(); }, []);

  const deleteList = async (list, e) => {
    e.stopPropagation();
    if (!window.confirm(`Liste "${list.name}" und alle Wörter löschen?`)) return;
    await window._sb.from("voc_words").delete().eq("list_id", list.id);
    await window._sb.from("voc_class_lists").delete().eq("list_id", list.id);
    await window._sb.from("voc_lists").delete().eq("id", list.id);
    load();
  };

  return (
    <div className="scroll" style={{ padding: "0 18px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 2px 18px" }}>
        <div className="h1">Vokabellisten</div>
        <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 15 }} onClick={onNewList}>
          + Neue Liste
        </button>
      </div>

      {lists === null ? <Spinner /> : lists.length === 0 ? (
        <EmptyState icon="📚" title="Noch keine Listen"
          sub="Erstelle deine erste Vokabelliste. Du kannst sie danach Klassen zuweisen."
          action={<button className="btn btn-primary" onClick={onNewList}>Liste erstellen</button>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lists.map(list => (
            <div key={list.id} className="card"
              style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => onEditList(list)}
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>{list.name}</div>
                  <div className="dim" style={{ fontSize: 13 }}>
                    {listSizeLabel(list)}
                  </div>
                </div>
              </button>
              <button className="btn btn-ghost"
                style={{ padding: "6px 10px", fontSize: 13, color: "var(--wrong)", flexShrink: 0 }}
                onClick={(e) => deleteList(list, e)}>
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Liste einer Klasse zuweisen (Bottom Sheet) ── */
function AssignListModal({ cls, session, onClose, onAssigned }) {
  const [lists, setLists] = useT(null);
  const [assigning, setAssigning] = useT(null);
  const [error, setError] = useT(null);

  useTE(() => {
    Promise.all([
      window._sb.from("voc_lists").select("id, name, kind, voc_words(count)")
        .eq("teacher_id", session.user.id).order("created_at", { ascending: false }),
      window._sb.from("voc_class_lists").select("list_id").eq("class_id", cls.id),
    ]).then(([{ data: all }, { data: assigned }]) => {
      const assignedIds = new Set((assigned || []).map(r => r.list_id));
      setLists((all || []).filter(l => !assignedIds.has(l.id)));
    });
  }, []);

  const assign = async (listId) => {
    setAssigning(listId); setError(null);
    const { error } = await window._sb
      .from("voc_class_lists")
      .insert({ class_id: cls.id, list_id: listId, assigned_by: session.user.id });
    setAssigning(null);
    if (error) { setError(error.message); return; }
    onAssigned();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--r-lg) var(--r-lg) 0 0",
        width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 12px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>
            Liste zuweisen — {cls.name}
          </div>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 14 }} onClick={onClose}>
            Schließen
          </button>
        </div>
        <div className="scroll" style={{ padding: "0 18px 16px" }}>
          {lists === null ? <Spinner /> : lists.length === 0 ? (
            <EmptyState icon="📭" title="Alle Listen zugewiesen"
              sub="Alle deine Vokabellisten sind dieser Klasse bereits zugewiesen." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "var(--wrong-soft)", color: "var(--wrong)", borderRadius: "var(--r-md)", fontSize: 14 }}>
                  {error}
                </div>
              )}
              {lists.map(list => (
                <button key={list.id} className="card" onClick={() => assign(list.id)}
                  disabled={!!assigning}
                  style={{ padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, width: "100%",
                    opacity: assigning && assigning !== list.id ? 0.5 : 1 }}>
                  <span style={{ fontSize: 22 }}>📋</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>{list.name}</div>
                    <div className="dim" style={{ fontSize: 13 }}>
                      {listSizeLabel(list)}
                    </div>
                  </div>
                  {assigning === list.id
                    ? <div className="dim" style={{ fontSize: 14 }}>…</div>
                    : <Icon name="arrowR" size={18} style={{ color: "var(--text-dim)" }} />
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Klassen-Detail: Listen + Mitglieder ── */
function ClassDetailView({ cls, session, onBack, onNewList, onEditList }) {
  const [lists, setLists] = useT(null);
  const [members, setMembers] = useT(null);
  const [tab, setTab] = useT("lists");
  const [showAssign, setShowAssign] = useT(false);
  const [showBuiltinVerbs, setShowBuiltinVerbs] = useT(cls.show_builtin_verbs !== false);
  const [verbError, setVerbError] = useT(null);
  const [hideUnlisted, setHideUnlisted] = useT(cls.hide_unlisted_words === true);

  const handleDeleteClass = async () => {
    if (members === null) return;
    if (members.length > 0) {
      const typed = window.prompt(`In "${cls.name}" sind ${members.length} Mitglieder. Sie sehen danach keine Listen dieser Klasse mehr. Lernstand und Wörter bleiben erhalten.\n\nZum Löschen den Klassennamen eintippen:`);
      if (typed === null) return;
      if (typed.trim() !== cls.name) { setVerbError("Der Name stimmt nicht, die Klasse wurde nicht gelöscht."); return; }
    } else if (!window.confirm(`Klasse "${cls.name}" löschen? Die Listen bleiben in der Bibliothek.`)) {
      return;
    }
    setVerbError(null);
    // Listen bleiben erhalten, auch wenn die Datenbank sie sonst zusammen mit der Klasse löschen würde
    const { error: listError } = await window._sb.from("voc_lists").update({ class_id: null }).eq("class_id", cls.id);
    if (listError) { setVerbError(listError.message); return; }
    const removeClass = () => window._sb.from("voc_classes").delete().eq("id", cls.id).select("id");
    let { data, error } = await removeClass();
    if (error?.code === "23503") {
      // Zuweisungen und Mitglieder erst entfernen, wenn die Datenbank es verlangt
      await window._sb.from("voc_class_lists").delete().eq("class_id", cls.id);
      await window._sb.from("voc_class_members").delete().eq("class_id", cls.id);
      ({ data, error } = await removeClass());
    }
    if (error || !data?.length) { setVerbError(error?.message || "Die Klasse wurde nicht gelöscht."); return; }
    onBack();
  };

  const toggleHideUnlisted = async () => {
    const next = !hideUnlisted;
    setHideUnlisted(next);
    setVerbError(null);
    const { error } = await window._sb.from("voc_classes").update({ hide_unlisted_words: next }).eq("id", cls.id);
    if (error) { setHideUnlisted(!next); setVerbError(error.message); return; }
    cls.hide_unlisted_words = next;
  };

  const toggleBuiltinVerbs = async () => {
    const next = !showBuiltinVerbs;
    setShowBuiltinVerbs(next);
    setVerbError(null);
    const { error } = await window._sb.from("voc_classes").update({ show_builtin_verbs: next }).eq("id", cls.id);
    if (error) { setShowBuiltinVerbs(!next); setVerbError(error.message); return; }
    cls.show_builtin_verbs = next;
  };

  const loadLists = useTC(() => {
    window._sb
      .from("voc_class_lists")
      .select("list_id, assigned_at, voc_lists(id, name, kind, voc_words(count))")
      .eq("class_id", cls.id)
      .order("assigned_at", { ascending: false })
      .then(({ data }) => setLists((data || []).map(r => r.voc_lists).filter(Boolean)));
  }, [cls.id]);

  const loadMembers = useTC(() => {
    window._sb
      .from("voc_class_members")
      .select("user_id, joined_at, voc_users(display_name, role)")
      .eq("class_id", cls.id)
      .then(({ data }) => setMembers(data || []));
  }, [cls.id]);

  const unassign = async (listId) => {
    await window._sb.from("voc_class_lists").delete()
      .eq("class_id", cls.id).eq("list_id", listId);
    loadLists();
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Schüler/in aus dieser Klasse entfernen?")) return;
    await window._sb.from("voc_class_members").delete()
      .eq("class_id", cls.id).eq("user_id", userId);
    loadMembers();
  };

  useTE(() => { loadLists(); loadMembers(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {showAssign && (
        <AssignListModal cls={cls} session={session}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); loadLists(); }} />
      )}

      {/* Header */}
      <div style={{ padding: "16px 18px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14 }} onClick={onBack}>
            <Icon name="arrowL" size={16} /> Klassen
          </button>
          <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14, color: "var(--wrong)" }}
            disabled={members === null} onClick={handleDeleteClass}>
            Klasse löschen
          </button>
        </div>
        <div className="h1" style={{ marginBottom: 12 }}>{cls.name}</div>
        {verbError && (
          <div style={{ marginBottom: 12, padding: "12px 14px", background: "var(--wrong-soft)",
            color: "var(--wrong)", borderRadius: "var(--r-md)", fontSize: 14 }}>
            {verbError}
          </div>
        )}

        {/* Wörter außerhalb der Listen */}
        <label className="card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={hideUnlisted} onChange={toggleHideUnlisted} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Nur Wörter aus zugewiesenen Listen üben</div>
            <div className="dim" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Andere englische Wörter werden ausgeblendet, bleiben aber samt Lernstand gespeichert.
            </div>
          </div>
        </label>

        {/* Eingebaute Verben */}
        <label className="card" style={{ padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={showBuiltinVerbs} onChange={toggleBuiltinVerbs} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Eingebaute unregelmäßige Verben zeigen</div>
            <div className="dim" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Gilt nur ohne eigene Verbliste. Ist eine zugewiesen, wird nur diese geübt.
            </div>
          </div>
        </label>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, marginBottom: 16 }}>
          {[["lists", `Listen${lists ? ` (${lists.length})` : ""}`], ["members", `Mitglieder${members ? ` (${members.length})` : ""}`]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: "calc(var(--r-md) - 3px)",
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, cursor: "pointer",
                background: tab === t ? "var(--surface)" : "transparent",
                color: tab === t ? "var(--text)" : "var(--text-dim)",
                boxShadow: tab === t ? "0 1px 4px var(--shadow)" : "none",
                transition: "all var(--t-fast)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="scroll" style={{ padding: "0 18px 32px" }}>
        {tab === "lists" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNewList(cls)}>
                + Neue Liste
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAssign(true)}>
                Aus Bibliothek
              </button>
            </div>

            {lists === null ? <Spinner /> : lists.length === 0 ? (
              <EmptyState icon="📝" title="Noch keine Listen"
                sub="Erstelle eine neue Liste oder weise eine aus deiner Bibliothek zu." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lists.map(list => (
                  <div key={list.id} className="card"
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => onEditList(list, cls)}
                      style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <span style={{ fontSize: 24 }}>📋</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>{list.name}</div>
                        <div className="dim" style={{ fontSize: 13 }}>
                          {listSizeLabel(list)}
                        </div>
                      </div>
                    </button>
                    <button className="btn btn-ghost"
                      style={{ padding: "6px 10px", fontSize: 13, color: "var(--text-dim)", flexShrink: 0 }}
                      onClick={() => unassign(list.id)}>
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "members" && (
          <>
            {members === null ? <Spinner /> : members.length === 0 ? (
              <EmptyState icon="👩‍🎓" title="Noch keine Mitglieder"
                sub="Schüler werden zentral in Supabase eingetragen." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map((m, i) => (
                  <div key={i} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{m.voc_users?.role === "teacher" ? "👩‍🏫" : "🎒"}</span>
                    <div style={{ flex: 1, fontFamily: "var(--font-ui)", fontWeight: 500, fontSize: 15 }}>
                      {m.voc_users?.display_name ?? "—"}
                    </div>
                    <div className="dim" style={{ fontSize: 13, marginRight: 4 }}>
                      {new Date(m.joined_at).toLocaleDateString("de-CH")}
                    </div>
                    {m.voc_users?.role !== "teacher" && (
                      <button className="btn btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 12, color: "var(--wrong)", flexShrink: 0 }}
                        onClick={() => removeMember(m.user_id)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Listen-Editor: Wörter einfügen oder CSV hochladen ── */
function ListEditorView({ cls, list, session, onBack, onSaved }) {
  const [listName, setListName] = useT(list?.name || "");
  const [kind, setKind] = useT(list?.kind || "vocab");
  const [existingWords, setExistingWords] = useT(null);
  const [raw, setRaw] = useT("");
  const [preview, setPreview] = useT([]);
  const [loading, setLoading] = useT(false);
  const [result, setResult] = useT(null);
  const [error, setError] = useT(null);
  const fileRef = useTR();
  const isNew = !list;

  const isVerbList = kind === "irregular_verbs";
  const isGeoList = kind === "geography";

  const updateEntry = async (word, changes) => {
    const next = { ...word, ...changes };
    if (!next.original.trim() || !next.translation.trim()) { setError("Frage und Antwort dürfen nicht leer sein."); return; }
    if (next.original === word.original && next.translation === word.translation) return;
    setError(null);
    const { data, error } = await window._sb.from("voc_words")
      .update({ original: next.original.trim(), translation: next.translation.trim() })
      .eq("id", word.id).select("id");
    if (error || !data?.length) { setError(error?.message || "Änderung wurde nicht gespeichert."); return; }
    setExistingWords(words => words.map(w => (w.id === word.id ? next : w)));
  };

  const deleteEntry = async (word) => {
    if (!window.confirm(`"${word.original}" löschen?`)) return;
    setError(null);
    const { data, error } = await window._sb.from("voc_words").delete().eq("id", word.id).select("id");
    if (error || !data?.length) { setError(error?.message || "Eintrag wurde nicht gelöscht."); return; }
    setExistingWords(words => words.filter(w => w.id !== word.id));
  };
  // Verbzeilen ohne lesbare Formen werden nicht gespeichert, die Vorschau meldet sie
  const validPreview = isVerbList ? preview.filter(w => parseVerbForms(w.hinweis)) : preview;
  const invalidCount = preview.length - validPreview.length;

  useTE(() => { setPreview(parseWords(raw)); }, [raw]);

  useTE(() => {
    if (!list) return;
    window._sb.from("voc_words")
      .select("id, original, translation, hinweis")
      .eq("list_id", list.id)
      .order("original")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setExistingWords(data || []);
      });
  }, [list?.id]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRaw(ev.target.result);
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!list || !window.confirm(`Liste "${list.name}" und alle Wörter löschen?`)) return;
    await window._sb.from("voc_words").delete().eq("list_id", list.id);
    await window._sb.from("voc_class_lists").delete().eq("list_id", list.id);
    await window._sb.from("voc_lists").delete().eq("id", list.id);
    onSaved();
  };

  const handleSave = async () => {
    if (!listName.trim()) return;
    setLoading(true); setError(null); setResult(null);

    let listId = list?.id;

    if (isNew) {
      const { data, error } = await window._sb
        .from("voc_lists")
        .insert({ name: listName.trim(), kind, teacher_id: session.user.id, created_by: session.user.id })
        .select()
        .single();
      if (error) { setError(error.message); setLoading(false); return; }
      listId = data.id;

      if (cls) {
        const { error: assignErr } = await window._sb
          .from("voc_class_lists")
          .insert({ class_id: cls.id, list_id: listId, assigned_by: session.user.id });
        if (assignErr) { setError(assignErr.message); setLoading(false); return; }
      }
    } else if (listName.trim() !== list.name) {
      await window._sb.from("voc_lists").update({ name: listName.trim() }).eq("id", listId);
    }

    if (validPreview.length > 0) {
      const { data, error: wordErr } = await window._sb.rpc("voc_insert_words", {
        p_list_id: listId,
        p_words: validPreview,
      });
      if (wordErr) { setError(wordErr.message); setLoading(false); return; }
      setResult(data);
      setRaw("");
    }

    setLoading(false);
    onSaved();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "16px 18px 12px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14 }} onClick={onBack}>
          <Icon name="arrowL" size={16} /> {cls ? cls.name : "Alle Listen"}
        </button>
        <div className="h1" style={{ flex: 1 }}>{isNew ? "Neue Liste" : "Liste bearbeiten"}</div>
        {!isNew && (
          <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 13, color: "var(--wrong)" }}
            onClick={handleDelete}>
            Löschen
          </button>
        )}
      </div>

      <div className="scroll" style={{ padding: "0 18px 32px" }}>
        <input className="field" type="text" placeholder="Name der Liste" value={listName}
          onChange={e => setListName(e.target.value)} style={{ marginBottom: preview.length > 0 && !listName.trim() ? 6 : 16 }} maxLength={80} />
        {preview.length > 0 && !listName.trim() && (
          <div style={{ color: "var(--wrong)", fontSize: 13, marginBottom: 16 }}>Bitte gib der Liste einen Namen, dann kannst du sie speichern.</div>
        )}

        <div className="eyebrow" style={{ marginBottom: 8 }}>Art der Liste</div>
        {isNew ? (
          <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, marginBottom: 16 }}>
            {[["vocab", "Vokabeln"], ["irregular_verbs", "Unregelmäßige Verben"], ["geography", "Geographie"]].map(([id, label]) => (
              <button key={id} onClick={() => setKind(id)}
                style={{ flex: 1, padding: "10px 8px", border: "none", borderRadius: "calc(var(--r-md) - 3px)",
                  fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  background: kind === id ? "var(--surface)" : "transparent",
                  color: kind === id ? "var(--text)" : "var(--text-dim)" }}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="dim" style={{ fontSize: 14, marginBottom: 16 }}>{isGeoList ? "Geographie" : isVerbList ? "Unregelmäßige Verben" : "Vokabeln"}</div>
        )}

        {!isNew && (
          <div style={{ marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Vorhandene Einträge{existingWords ? ` (${existingWords.length})` : ""}
            </div>
            {existingWords === null ? <Spinner /> : existingWords.length === 0 ? (
              <div className="dim" style={{ fontSize: 14 }}>Noch keine Einträge.</div>
            ) : (
              <div className="card" style={{ maxHeight: 280, overflowY: "auto" }}>
                {existingWords.map(w => isGeoList ? (
                  <div key={w.id + w.original + w.translation} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                    <input className="field" defaultValue={w.original} aria-label="Frage" style={{ flex: 3, minWidth: 0, fontSize: 14, padding: "8px 10px" }}
                      onBlur={e => updateEntry(w, { original: e.target.value })} />
                    <input className="field" defaultValue={w.translation} aria-label="Antwort" style={{ flex: 2, minWidth: 0, fontSize: 14, padding: "8px 10px" }}
                      onBlur={e => updateEntry(w, { translation: e.target.value })} />
                    <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 13, color: "var(--wrong)", flexShrink: 0 }}
                      onClick={() => deleteEntry(w)}>
                      Löschen
                    </button>
                  </div>
                ) : (
                  <div key={w.id} style={{ display: "flex", gap: 12, padding: "9px 14px", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{w.original}</span>
                    <span style={{ flex: 1, color: "var(--text-dim)" }}>{w.translation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="eyebrow">{isNew ? "Einträge einfügen" : "Einträge hinzufügen"}</div>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}
            onClick={() => fileRef.current?.click()}>
            CSV hochladen
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
        </div>

        <div className="dim" style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
          {isGeoList
            ? <React.Fragment>Eine Karte pro Zeile: <code>Frankreich: Hauptstadt;Paris</code></React.Fragment>
            : isVerbList
            ? <React.Fragment>Eine Zeile pro Verb: <code>go;gehen;;simple past: went | past participle: gone;</code></React.Fragment>
            : <React.Fragment>Ein Wortpaar pro Zeile: <code>Hund;chien</code> oder <code>Hund - chien</code></React.Fragment>}
        </div>

        <textarea className="field" rows={8}
          placeholder={"Hund;chien\nKatze;chat\nApfel;pomme"}
          value={raw} onChange={e => setRaw(e.target.value)}
          style={{ resize: "vertical", fontFamily: "var(--font-ui)", fontSize: 15, lineHeight: 1.6 }} />

        {preview.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {isVerbList
                ? `Vorschau — ${validPreview.length} Verb${validPreview.length !== 1 ? "en" : ""}`
                : `Vorschau — ${preview.length} Wortpaar${preview.length !== 1 ? "e" : ""}`}
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {preview.slice(0, 8).map((w, i) => (
                <div key={i} style={{ padding: "10px 14px",
                  borderBottom: i < Math.min(preview.length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: (w.beispiel || w.hinweis || w.aussprache) ? 4 : 0 }}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{w.original}</span>
                    <span style={{ flex: 1, color: "var(--text-dim)" }}>{w.translation}</span>
                    {w.aussprache && <span style={{ color: "var(--text-dim)", fontSize: 13, fontStyle: "italic" }}>{w.aussprache}</span>}
                  </div>
                  {w.beispiel && <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 2 }}>📖 {w.beispiel}</div>}
                  {isVerbList && parseVerbForms(w.hinweis) ? (
                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                      {parseVerbForms(w.hinweis).pastSimple} · {parseVerbForms(w.hinweis).pastParticiple}
                    </div>
                  ) : isVerbList ? (
                    <div style={{ fontSize: 13, color: "var(--wrong)" }}>Formen nicht lesbar, wird nicht gespeichert</div>
                  ) : w.hinweis && <div style={{ fontSize: 12, color: "var(--text-dim)", opacity: 0.7 }}>💡 {w.hinweis}</div>}
                </div>
              ))}
              {preview.length > 8 && (
                <div className="dim" style={{ padding: "10px 14px", fontSize: 13 }}>
                  … und {preview.length - 8} weitere
                </div>
              )}
            </div>
          </div>
        )}

        {isVerbList && invalidCount > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--wrong-soft)",
            color: "var(--wrong)", borderRadius: "var(--r-md)", fontSize: 14 }}>
            {invalidCount === 1 ? "1 Zeile ohne lesbare Verbformen wird" : `${invalidCount} Zeilen ohne lesbare Verbformen werden`} nicht gespeichert.
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--correct-soft)",
            color: "var(--correct)", borderRadius: "var(--r-md)", fontSize: 14, fontWeight: 500 }}>
            {result.inserted} Wörter hinzugefügt
            {result.skipped > 0 ? `, ${result.skipped} Duplikate übersprungen` : ""}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--wrong-soft)",
            color: "var(--wrong)", borderRadius: "var(--r-md)", fontSize: 14 }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }}
          disabled={!listName.trim() || loading}
          onClick={handleSave}>
          {loading ? "…" : isNew ? "Liste erstellen" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

/* ── Lehrer-Übersicht: Nutzungsstatistik ── */
function TeacherStatsView({ session }) {
  const [classes, setClasses] = useT(null);
  const [students, setStudents] = useT(null);
  const [filterClass, setFilterClass] = useT("all");
  const [error, setError] = useT(null);

  useTE(() => {
    window._sb
      .from("voc_classes")
      .select("id, name")
      .eq("teacher_id", session.user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setClasses(data || []);
      });
  }, [session.user.id]);

  useTE(() => {
    if (classes === null) return;
    setStudents(null);
    setError(null);
    const classIds = filterClass === "all" ? classes.map(c => c.id) : [filterClass];
    if (!classIds.length) { setStudents([]); return; }

    (async () => {
      const { data: members, error: mErr } = await window._sb
        .from("voc_class_members")
        .select("user_id, voc_users(display_name)")
        .in("class_id", classIds);
      if (mErr) { setError(mErr.message); return; }

      const studentIds = [...new Set((members || []).map(m => m.user_id))];
      if (!studentIds.length) { setStudents([]); return; }

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions, error: sErr } = await window._sb
        .from("voc_sessions")
        .select("user_id, score, total, xp, completed_at")
        .in("user_id", studentIds)
        .gte("completed_at", since);
      if (sErr) {
        setError("Tabelle voc_sessions fehlt – SQL im Supabase-Dashboard ausführen!");
        setStudents([]);
        return;
      }

      const map = new Map();
      studentIds.forEach(id => {
        const m = (members || []).find(x => x.user_id === id);
        map.set(id, { userId: id, name: m?.voc_users?.display_name || "—",
          sessions: 0, xp: 0, correct: 0, total: 0, lastActive: null });
      });
      (sessions || []).forEach(s => {
        const st = map.get(s.user_id);
        if (!st) return;
        st.sessions++;
        st.xp += s.xp || 0;
        st.correct += s.score || 0;
        st.total += s.total || 0;
        if (!st.lastActive || s.completed_at > st.lastActive) st.lastActive = s.completed_at;
      });

      setStudents([...map.values()].sort((a, b) => b.xp - a.xp || b.sessions - a.sessions));
    })();
  }, [classes, filterClass]);

  const top10 = (students || []).filter(s => s.sessions > 0).slice(0, 10);
  const inactive = (students || []).filter(s => s.sessions === 0).length;
  const totalSessions = (students || []).reduce((n, s) => n + s.sessions, 0);
  const activeLearners = (students || []).filter(s => s.sessions > 0).length;

  return (
    <div className="scroll" style={{ padding: "0 18px 32px" }}>
      {classes && classes.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "14px 0 12px" }}>
          {[{ id: "all", name: "Alle" }, ...classes].map(c => (
            <button key={c.id} onClick={() => setFilterClass(c.id)}
              style={{ flex: "0 0 auto", padding: "6px 14px", borderRadius: 99, cursor: "pointer",
                border: "1px solid var(--border)", fontWeight: 600, fontSize: 13, fontFamily: "var(--font-ui)",
                background: filterClass === c.id ? "var(--accent)" : "var(--surface)",
                color: filterClass === c.id ? "var(--on-accent, #fff)" : "var(--text-dim)" }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 14px", background: "var(--wrong-soft)", color: "var(--wrong)",
          borderRadius: "var(--r-md)", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {students !== null && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              [(students || []).length, "Schüler"],
              [totalSessions, "Sessions"],
              [activeLearners, "Aktiv (30 T.)"],
            ].map(([val, label]) => (
              <div key={label} className="card" style={{ padding: "14px 8px", textAlign: "center" }}>
                <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>{val}</div>
                <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {top10.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 38 }}>📊</div>
              <div className="h2">Noch keine Aktivität</div>
              <div className="dim" style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 260 }}>
                Sobald Schüler Vokabeln üben, erscheinen hier ihre Ergebnisse.
              </div>
            </div>
          ) : (
            <>
              <div className="eyebrow" style={{ marginBottom: 10, marginLeft: 2 }}>Top Schüler – letzte 30 Tage</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {top10.map((st, i) => {
                  const acc = st.total > 0 ? Math.round(st.correct / st.total * 100) : null;
                  return (
                    <div key={st.userId} className="card"
                      style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        background: i < 3 ? "var(--primary-soft)" : "var(--surface-2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                        color: i < 3 ? "var(--accent)" : "var(--text-dim)" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {st.name}
                        </div>
                        <div className="dim" style={{ fontSize: 12.5, marginTop: 1 }}>
                          {st.sessions} Session{st.sessions !== 1 ? "s" : ""}
                          {acc !== null ? ` · ${acc}% richtig` : ""}
                          {st.lastActive ? ` · ${relativeDate(st.lastActive.slice(0, 10))}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
                        color: "var(--accent)" }}>
                        <Icon name="bolt" size={15} />{st.xp}
                      </div>
                    </div>
                  );
                })}
              </div>
              {inactive > 0 && (
                <div className="dim" style={{ fontSize: 13, textAlign: "center", marginTop: 14 }}>
                  {inactive} Schüler noch nicht aktiv
                </div>
              )}
            </>
          )}
        </>
      )}

      {students === null && !error && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="dim" style={{ fontSize: 15 }}>Laden …</div>
        </div>
      )}
    </div>
  );
}

/* ── TeacherDashboard: Haupt-Router ── */
function TeacherDashboard({ session, go }) {
  const [mainTab, setMainTab] = useT("stats");
  const [view, setView] = useT("main");
  const [selectedClass, setSelectedClass] = useT(null);
  const [selectedList, setSelectedList] = useT(null);
  const [listEditorCls, setListEditorCls] = useT(null);

  const openListEditor = (list, cls) => {
    setSelectedList(list || null);
    setListEditorCls(cls || null);
    setView("list-editor");
  };

  const handleLogout = () => window._sb.auth.signOut();

  if (view === "new-class") return (
    <NewClassForm session={session}
      onBack={() => setView("main")}
      onDone={(cls) => { setSelectedClass(cls); setView("class"); }} />
  );

  if (view === "list-editor") return (
    <ListEditorView cls={listEditorCls} list={selectedList} session={session}
      onBack={() => setView(listEditorCls ? "class" : "main")}
      onSaved={() => setView(listEditorCls ? "class" : "main")} />
  );

  if (view === "class" && selectedClass) return (
    <ClassDetailView cls={selectedClass} session={session}
      onBack={() => setView("main")}
      onNewList={(cls) => openListEditor(null, cls)}
      onEditList={(list, cls) => openListEditor(list, cls)} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Top-Level Tab Bar mit Logout */}
      <div style={{ padding: "16px 18px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, flex: 1 }}>
            {[["stats", "📊"], ["classes", "🏫"], ["lists", "📚"]].map(([t, label]) => (
              <button key={t} onClick={() => setMainTab(t)}
                style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: "calc(var(--r-md) - 3px)",
                  fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 18, cursor: "pointer",
                  background: mainTab === t ? "var(--surface)" : "transparent",
                  color: mainTab === t ? "var(--text)" : "var(--text-dim)",
                  boxShadow: mainTab === t ? "0 1px 4px var(--shadow)" : "none",
                  transition: "all var(--t-fast)" }}>
                {label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 14, flexShrink: 0 }}
            onClick={handleLogout}>
            Abmelden
          </button>
        </div>
      </div>

      {mainTab === "stats" ? (
        <TeacherStatsView session={session} />
      ) : mainTab === "classes" ? (
        <ClassListView session={session}
          onSelectClass={(cls) => { setSelectedClass(cls); setView("class"); }}
          onNewClass={() => setView("new-class")} />
      ) : (
        <ListLibraryView session={session}
          onNewList={() => openListEditor(null, null)}
          onEditList={(list) => openListEditor(list, null)} />
      )}
    </div>
  );
}
