// vt-student.jsx — Student view: vocabulary list picker from class assignments

const { useState: useSt, useEffect: useStE } = React;

function StudentListPicker({ session, go }) {
  const [lists, setLists] = useSt(null);
  const [busy, setBusy] = useSt(null);
  const [err, setErr] = useSt(null);

  useStE(() => {
    window._sb
      .from("voc_class_members")
      .select(`
        voc_classes(
          id, name,
          voc_class_lists(
            voc_lists(id, name, voc_words(count))
          )
        )
      `)
      .eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        const map = new Map();
        (data || []).forEach(m => {
          const cls = m.voc_classes;
          if (!cls) return;
          (cls.voc_class_lists || []).forEach(cl => {
            const list = cl.voc_lists;
            if (list && !map.has(list.id)) {
              map.set(list.id, {
                id: list.id,
                name: list.name,
                wordCount: list.voc_words?.[0]?.count ?? 0,
                className: cls.name,
              });
            }
          });
        });
        setLists([...map.values()]);
      });
  }, [session.user.id]);

  const pickList = async (list) => {
    setBusy(list.id);
    setErr(null);
    const { data: words, error } = await window._sb
      .from("voc_words")
      .select("id, original, translation, beispiel, hinweis, aussprache")
      .eq("list_id", list.id);
    if (error) { setErr(error.message); setBusy(null); return; }
    const mapped = (words || [])
      .map(w => ({
        en: (w.original || "").trim(),
        de: (w.translation || "").trim(),
        example: (w.beispiel || "").trim(),
        note: (w.hinweis || "").trim(),
        pronunciation: (w.aussprache || "").trim(),
        id: "cloud-" + w.id,
      }))
      .filter(w => w.en && w.de);
    if (!mapped.length) { setErr("Diese Liste enthält noch keine Wörter."); setBusy(null); return; }
    const lang = ACTIVE_LANGUAGE || "en";
    localStorage.setItem("vt_vocab_" + lang, JSON.stringify(mapped));
    localStorage.setItem("vt_active_list", JSON.stringify({ id: list.id, name: list.name }));
    refreshVocabulary(lang);
    setBusy(null);
    go("home");
  };

  if (!lists && !err) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="dim" style={{ fontSize: 15 }}>Laden …</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "20px 18px 14px", flexShrink: 0 }}>
        <div className="h1">Meine Vokabeln</div>
        <div className="dim" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
          Wähle eine Liste aus deiner Klasse zum Üben.
        </div>
      </div>

      <div className="scroll" style={{ padding: "0 18px 32px" }}>
        {err && (
          <div style={{ padding: "12px 14px", background: "var(--wrong-soft)", color: "var(--wrong)",
            borderRadius: "var(--r-md)", fontSize: 14, marginBottom: 14 }}>
            {err}
          </div>
        )}

        {lists?.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Voki mood="idle" size={100} />
            <div className="h2">Noch keine Liste</div>
            <div className="dim" style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 280 }}>
              Dein Lehrer hat dir noch keine Vokabelliste zugewiesen.
              Tritt einer Klasse bei oder warte auf deinen Lehrer.
            </div>
            {TOTAL_WORDS > 0 && (
              <button className="btn btn-ghost" style={{ marginTop: 4 }} onClick={() => go("home")}>
                Eigene Liste nutzen
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lists.map(list => (
              <button key={list.id} className="card"
                disabled={!!busy}
                onClick={() => pickList(list)}
                style={{ padding: "16px 18px", textAlign: "left",
                  cursor: busy ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  opacity: busy && busy !== list.id ? 0.5 : 1 }}>
                <span style={{ fontSize: 26 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>
                    {list.name}
                  </div>
                  <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>
                    {list.className} · {list.wordCount} Wörter
                  </div>
                </div>
                {busy === list.id
                  ? <div className="dim" style={{ fontSize: 14 }}>…</div>
                  : <Icon name="arrowR" size={18} style={{ color: "var(--text-dim)" }} />
                }
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { StudentListPicker });
