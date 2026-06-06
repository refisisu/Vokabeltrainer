// vt-teacher.jsx — Lehrer-Dashboard: Klassen, Listen, Wörter-Upload

const { useState: useT, useEffect: useTE, useCallback: useTC } = React;

/* ── Hilfsfunktionen ── */
function inviteLink(joinCode) {
  return `${window.location.origin}${window.location.pathname}?join=${joinCode}`;
}

async function copyToClipboard(text, setCopied) {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (e) {}
}

function parseWords(raw) {
  return raw.split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const sep = line.includes(";") ? ";" : line.includes(" - ") ? " - " : ",";
      const [original, ...rest] = line.split(sep);
      return { original: original?.trim(), translation: rest.join(sep).trim() };
    })
    .filter(w => w.original && w.translation);
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
      .select("id, name, join_code, created_at")
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
          sub="Erstelle deine erste Klasse und lade Schülerinnen und Schüler ein."
          action={<button className="btn btn-primary" onClick={onNewClass}>Klasse erstellen</button>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {classes.map(cls => (
            <button key={cls.id} className="card" onClick={() => onSelectClass(cls)}
              style={{ padding: "16px 18px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
              <span style={{ fontSize: 28 }}>🏫</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{cls.name}</div>
                <div className="dim" style={{ fontSize: 13, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inviteLink(cls.join_code)}
                </div>
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
            Gib deiner Klasse einen Namen. Danach kannst du den Einladungslink teilen.
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

/* ── Klassen-Detail: Listen + Einladungslink ── */
function ClassDetailView({ cls, session, onBack, onNewList, onEditList }) {
  const [lists, setLists] = useT(null);
  const [members, setMembers] = useT(null);
  const [tab, setTab] = useT("lists");
  const [copied, setCopied] = useT(false);
  const link = inviteLink(cls.join_code);

  const loadLists = useTC(() => {
    window._sb
      .from("voc_lists")
      .select("id, name, created_at, voc_words(count)")
      .eq("class_id", cls.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLists(data || []));
  }, [cls.id]);

  const loadMembers = useTC(() => {
    window._sb
      .from("voc_class_members")
      .select("joined_at, voc_users(display_name, role)")
      .eq("class_id", cls.id)
      .then(({ data }) => setMembers(data || []));
  }, [cls.id]);

  useTE(() => { loadLists(); loadMembers(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "16px 18px 0", flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14, marginBottom: 12 }} onClick={onBack}>
          <Icon name="arrowL" size={16} /> Klassen
        </button>
        <div className="h1" style={{ marginBottom: 12 }}>{cls.name}</div>

        {/* Einladungslink */}
        <div className="card" style={{ padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 2 }}>Einladungslink</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {link}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ flexShrink: 0, padding: "8px 14px", fontSize: 14 }}
            onClick={() => copyToClipboard(link, setCopied)}>
            {copied ? "✓ Kopiert" : "Kopieren"}
          </button>
        </div>

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
            <button className="btn btn-primary btn-block" style={{ marginBottom: 16 }} onClick={() => onNewList(cls)}>
              + Neue Vokabelliste
            </button>
            {lists === null ? <Spinner /> : lists.length === 0 ? (
              <EmptyState icon="📝" title="Noch keine Listen"
                sub="Erstelle eine Vokabelliste für diese Klasse." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lists.map(list => (
                  <button key={list.id} className="card" onClick={() => onEditList(list, cls)}
                    style={{ padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                    <span style={{ fontSize: 24 }}>📋</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>{list.name}</div>
                      <div className="dim" style={{ fontSize: 13 }}>
                        {list.voc_words?.[0]?.count ?? 0} Wörter
                      </div>
                    </div>
                    <Icon name="arrowR" size={18} style={{ color: "var(--text-dim)" }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "members" && (
          members === null ? <Spinner /> : members.length === 0 ? (
            <EmptyState icon="👩‍🎓" title="Noch keine Mitglieder"
              sub="Teile den Einladungslink damit Schülerinnen und Schüler beitreten können." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m, i) => (
                <div key={i} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{m.voc_users?.role === "teacher" ? "👩‍🏫" : "🎒"}</span>
                  <div style={{ fontFamily: "var(--font-ui)", fontWeight: 500, fontSize: 15 }}>
                    {m.voc_users?.display_name ?? "—"}
                  </div>
                  <div className="dim" style={{ marginLeft: "auto", fontSize: 13 }}>
                    {new Date(m.joined_at).toLocaleDateString("de-CH")}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── Listen-Editor: Wörter hochladen ── */
function ListEditorView({ cls, list, session, onBack, onSaved }) {
  const [listName, setListName] = useT(list?.name || "");
  const [raw, setRaw] = useT("");
  const [preview, setPreview] = useT([]);
  const [loading, setLoading] = useT(false);
  const [result, setResult] = useT(null);
  const [error, setError] = useT(null);
  const isNew = !list;

  useTE(() => { setPreview(parseWords(raw)); }, [raw]);

  const handleSave = async () => {
    if (!listName.trim()) return;
    setLoading(true); setError(null); setResult(null);

    let listId = list?.id;

    if (isNew) {
      const { data, error } = await window._sb
        .from("voc_lists")
        .insert({ class_id: cls.id, name: listName.trim(), created_by: session.user.id })
        .select()
        .single();
      if (error) { setError(error.message); setLoading(false); return; }
      listId = data.id;
    } else if (listName.trim() !== list.name) {
      await window._sb.from("voc_lists").update({ name: listName.trim() }).eq("id", listId);
    }

    if (preview.length > 0) {
      const { data, error } = await window._sb.rpc("voc_insert_words", {
        p_list_id: listId,
        p_words: preview,
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setResult(data);
      setRaw("");
    }

    setLoading(false);
    if (!error) onSaved();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "16px 18px 12px", flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 14, marginBottom: 12 }} onClick={onBack}>
          <Icon name="arrowL" size={16} /> {cls.name}
        </button>
        <div className="h1">{isNew ? "Neue Liste" : "Liste bearbeiten"}</div>
      </div>

      <div className="scroll" style={{ padding: "0 18px 32px" }}>
        <input className="field" type="text" placeholder="Name der Liste" value={listName}
          onChange={e => setListName(e.target.value)} style={{ marginBottom: 16 }} maxLength={80} />

        <div className="eyebrow" style={{ marginBottom: 8 }}>Wörter einfügen</div>
        <div className="dim" style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
          Ein Wortpaar pro Zeile: <code>Hund;chien</code> oder <code>Hund - chien</code>
        </div>

        <textarea className="field" rows={8}
          placeholder={"Hund;chien\nKatze;chat\nApfel;pomme"}
          value={raw} onChange={e => setRaw(e.target.value)}
          style={{ resize: "vertical", fontFamily: "var(--font-ui)", fontSize: 15, lineHeight: 1.6 }} />

        {/* Vorschau */}
        {preview.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Vorschau — {preview.length} Wortpaar{preview.length !== 1 ? "e" : ""}
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {preview.slice(0, 8).map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 14px",
                  borderBottom: i < Math.min(preview.length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{w.original}</span>
                  <span style={{ flex: 1, color: "var(--text-dim)" }}>{w.translation}</span>
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

        {/* Feedback */}
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

/* ── TeacherDashboard: Haupt-Router ── */
function TeacherDashboard({ session, go }) {
  const [view, setView] = useT("classes");
  const [selectedClass, setSelectedClass] = useT(null);
  const [selectedList, setSelectedList] = useT(null);

  if (view === "new-class") return (
    <NewClassForm session={session}
      onBack={() => setView("classes")}
      onDone={(cls) => { setSelectedClass(cls); setView("class"); }} />
  );

  if (view === "list-editor") return (
    <ListEditorView cls={selectedClass} list={selectedList} session={session}
      onBack={() => setView("class")}
      onSaved={() => setView("class")} />
  );

  if (view === "class" && selectedClass) return (
    <ClassDetailView cls={selectedClass} session={session}
      onBack={() => setView("classes")}
      onNewList={(cls) => { setSelectedClass(cls); setSelectedList(null); setView("list-editor"); }}
      onEditList={(list, cls) => { setSelectedClass(cls); setSelectedList(list); setView("list-editor"); }} />
  );

  return (
    <ClassListView session={session}
      onSelectClass={(cls) => { setSelectedClass(cls); setView("class"); }}
      onNewClass={() => setView("new-class")} />
  );
}
